import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/url_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../../terminal/data/notification_sound_service.dart';
import '../../terminal/data/pos_ws_service.dart';
import '../../../core/sync/sync_status.dart';
import '../../terminal/domain/models/pos_order.dart';
import '../../terminal/domain/models/pos_config.dart';
import '../../terminal/domain/models/table_selection.dart';
import '../../terminal/presentation/widgets/checkout_flow_sheet.dart';
import '../domain/live_table_data.dart';
import '../domain/models/floor_plan.dart';
import 'widgets/floor_canvas.dart';
import 'widgets/status_legend.dart';

class LiveTableScreen extends StatefulWidget {
  const LiveTableScreen({
    super.key,
    required this.outlet,
    this.onSelectTable,
    this.onSelectDraft,
  });

  final Outlet outlet;
  final ValueChanged<TableSelection>? onSelectTable;
  final ValueChanged<PosOrder>? onSelectDraft;

  @override
  State<LiveTableScreen> createState() => _LiveTableScreenState();
}

class _LiveTableScreenState extends State<LiveTableScreen> {
  Timer? _clockTimer;
  Timer? _syncReloadDebounce;
  PosWsService? _wsService;
  StreamSubscription<PosWsEvent>? _wsSub;
  StreamSubscription<bool>? _connectivitySub;
  StreamSubscription<SyncStatusDetail>? _syncStatusSub;
  FloorPlan? _plan;
  List<PosOrder> _orders = const [];
  PosConfig? _config;
  DateTime _now = DateTime.now();
  bool _loading = true;
  // Throttle fallback HTTP sync: only reload if last WS-triggered sync was >10s ago.
  DateTime? _lastWsSyncAt;
  DateTime? _lastSyncReloadAt;
  bool? _lastOnlineState;
  SyncStatus? _lastSyncStatus;

  String? _servingOrderId;
  String? _completingOrderId;
  String? _servingItemKey;

  @override
  void initState() {
    super.initState();
    _load();
    _connectWs();
    _bindRealtimeSyncSignals();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _now = DateTime.now());
    });
  }

  @override
  void didUpdateWidget(covariant LiveTableScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) {
      _load();
      _connectWs();
    }
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _connectivitySub?.cancel();
    _syncStatusSub?.cancel();
    _wsService?.dispose();
    _syncReloadDebounce?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  void _bindRealtimeSyncSignals() {
    final engine = ServiceLocator.instance.syncEngine;
    _lastOnlineState = engine.connectivity.isOnline;
    _connectivitySub = engine.connectivity.isOnline$.listen((online) {
      final previous = _lastOnlineState;
      _lastOnlineState = online;
      if (online && previous != true) {
        _scheduleSilentReload();
      }
    });

    _syncStatusSub = engine.status$.listen((detail) {
      final previous = _lastSyncStatus;
      _lastSyncStatus = detail.status;
      final syncJustFinished =
          previous == SyncStatus.syncing && detail.status == SyncStatus.idle;
      final queueJustDrained =
          previous == SyncStatus.offlineQueued && detail.pendingCount == 0;

      if (syncJustFinished || queueJustDrained) {
        _scheduleSilentReload();
      }
    });
  }

  void _scheduleSilentReload() {
    final now = DateTime.now();
    if (_lastSyncReloadAt != null &&
        now.difference(_lastSyncReloadAt!).inMilliseconds < 1200) {
      return;
    }
    _lastSyncReloadAt = now;

    _syncReloadDebounce?.cancel();
    _syncReloadDebounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      _load(silent: true);
    });
  }

  void _connectWs() {
    _wsSub?.cancel();
    _wsService?.dispose();
    final service = PosWsService(
      outletId: widget.outlet.id,
      onAuthRejected: (error) {
        if (mounted) showError(context, error);
      },
    );
    _wsService = service;
    _wsSub = service.events.listen(_handleWsEvent);
    service.connect();
  }

  Future<void> _load({bool silent = false}) async {
    final floorService = ServiceLocator.instance.floorService;
    final terminalService = ServiceLocator.instance.terminalService;

    if (!silent) {
      setState(() => _loading = true);
    }

    try {
      final plans = await floorService.listFloorPlans(
        outletId: widget.outlet.id,
        status: 'published',
      );
      final orders = await terminalService.listOrders(
        outletId: widget.outlet.id,
      );
      final config = await terminalService.getConfig(widget.outlet.id);

      final plan = plans.isEmpty
          ? null
          : await floorService.getFloorPlan(plans.first.id);

      if (!mounted) return;
      setState(() {
        _plan = plan;
        _orders = orders;
        _config = config;
        _now = DateTime.now();
      });
    } catch (error) {
      if (mounted && !silent) {
        showError(context, error);
      }
    } finally {
      if (mounted && !silent) {
        setState(() => _loading = false);
      }
    }
  }

  void _handleWsEvent(PosWsEvent event) {
    if (event.outletId != null && event.outletId != widget.outlet.id) return;
    try {
      switch (event.event) {
        case 'pos.new_customer_order':
          final order = _orderFromEvent(event);
          if (order == null) {
            _safeFallbackSync();
            return;
          }
          NotificationSoundService.instance.play();
          setState(() => _upsertOrder(order));
          break;
        case 'pos.order_status_changed':
        case 'pos.payment_confirmed':
        case 'pos.table_updated':
          final order = _orderFromEvent(event);
          if (order == null) {
            _safeFallbackSync();
            return;
          }
          setState(() {
            if (_isTerminalCleared(order.status)) {
              _orders = _orders.where((item) => item.id != order.id).toList();
            } else {
              _upsertOrder(order);
            }
          });
          break;
      }
    } catch (_) {
      // Keep stream alive when one malformed payload is received.
    }
  }

  PosOrder? _orderFromEvent(PosWsEvent event) {
    final rawOrder = event.data['order'];

    // Strategy 1: Direct Map<String, dynamic>
    if (rawOrder is Map<String, dynamic>) {
      try {
        final order = PosOrder.fromJson(rawOrder);
        return order;
      } catch (_) {}
    }

    // Strategy 2: Dynamic Map (cast all keys to String)
    if (rawOrder is Map) {
      try {
        final order = PosOrder.fromJson(
          rawOrder.map((key, value) => MapEntry('$key', value)),
        );
        return order;
      } catch (_) {}
    }

    // Strategy 3: String JSON (decode and retry)
    if (rawOrder is String && rawOrder.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawOrder);
        if (decoded is Map<String, dynamic>) {
          final order = PosOrder.fromJson(decoded);
          return order;
        }
        if (decoded is Map) {
          final order = PosOrder.fromJson(
            decoded.map((key, value) => MapEntry('$key', value)),
          );
          return order;
        }
      } catch (_) {}
    }

    // Strategy 4: Fallback - use root data as order (event.data['id'] or event.data['order_id'])
    if (event.data['id'] is String || event.data['order_id'] is String) {
      try {
        final data = Map<String, dynamic>.from(event.data);
        data['id'] = data['id'] ?? data['order_id'];
        final order = PosOrder.fromJson(data);
        return order;
      } catch (_) {}
    }

    return null;
  }

  void _upsertOrder(PosOrder order) {
    final next = [..._orders];
    final index = next.indexWhere((item) => item.id == order.id);
    if (index >= 0) {
      next[index] = order;
    } else {
      next.add(order);
    }
    _orders = next;
    _now = DateTime.now();
  }

  /// Throttled fallback: reloads orders via HTTP when a WS event cannot be parsed.
  /// Fires at most once per 10 s to avoid hammering the API.
  void _safeFallbackSync() {
    final now = DateTime.now();
    if (_lastWsSyncAt != null &&
        now.difference(_lastWsSyncAt!).inSeconds < 10) {
      return;
    }
    _lastWsSyncAt = now;
    _load(silent: true);
  }

  List<PosOrder> get _drafts => _orders
      .where((o) => o.status == PosOrderStatus.draft && o.tableId == null)
      .toList();

  void _showSavedTransactions() {
    final drafts = _drafts;

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Saved Transactions'),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(ctx),
              ),
            ],
          ),
          content: drafts.isEmpty
              ? const SizedBox(
                  height: 100,
                  child: Center(
                    child: Text('Tidak ada transaksi tersimpan'),
                  ),
                )
              : SizedBox(
                  width: 400,
                  height: 300,
                  child: ListView.builder(
                    itemCount: drafts.length,
                    itemBuilder: (context, index) {
                      final draft = drafts[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        child: ListTile(
                          onTap: () {
                            Navigator.pop(ctx);
                            _selectTableForDraft(draft);
                          },
                          title: Text(
                            '#${draft.orderNumber}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            draft.customerName != null &&
                                    draft.customerName!.isNotEmpty
                                ? draft.customerName!
                                : 'Walk-in',
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                formatMoney(draft.totalAmount, 'IDR'),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: GimsColors.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.delete_outline,
                                    color: Colors.red),
                                onPressed: () async {
                                  final navigator = Navigator.of(ctx);
                                  final messenger = ScaffoldMessenger.of(context);
                                  try {
                                    await ServiceLocator.instance.terminalService
                                        .deleteOrder(draft.id);
                                    navigator.pop();
                                    _load();
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(
                                            'Draft #${draft.orderNumber} berhasil dihapus'),
                                      ),
                                    );
                                  } catch (error) {
                                    if (ctx.mounted) {
                                      showError(ctx, error);
                                    }
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
        );
      },
    );
  }

  void _selectTableForDraft(PosOrder draft) {
    final liveTables = _liveTables();
    final availableTables = liveTables.where((t) => t.status == 'AVAILABLE').toList();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('Pilih Meja untuk Draft #${draft.orderNumber}'),
          content: availableTables.isEmpty
              ? const SizedBox(
                  height: 100,
                  child: Center(
                    child: Text('Tidak ada meja yang tersedia'),
                  ),
                )
              : SizedBox(
                  width: 400,
                  height: 300,
                  child: ListView.builder(
                    itemCount: availableTables.length,
                    itemBuilder: (context, index) {
                      final info = availableTables[index];
                      final tableName = info.table.label ?? info.table.tableNumber?.toString() ?? info.table.id;
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        child: ListTile(
                          onTap: () async {
                            final navigator = Navigator.of(ctx);
                            final messenger = ScaffoldMessenger.of(context);
                            navigator.pop();
                            
                            setState(() => _loading = true);
                            try {
                              await ServiceLocator.instance.terminalService.updateOrderTable(
                                orderId: draft.id,
                                tableId: info.table.id,
                                tableLabel: tableName,
                              );
                              _load();
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text(
                                      'Draft #${draft.orderNumber} berhasil dipindahkan ke Meja $tableName'),
                                ),
                              );
                            } catch (error) {
                              if (context.mounted) {
                                showError(context, error);
                              }
                            } finally {
                              setState(() => _loading = false);
                            }
                          },
                          title: Text(
                            tableName,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text('Kapasitas: ${info.seatCount} kursi'),
                          trailing: const Icon(Icons.chevron_right),
                        ),
                      );
                    },
                  ),
                ),
        );
      },
    );
  }

  List<LiveTableData> _liveTables() {
    final plan = _plan;
    if (plan == null) return const [];

    final seatCounts = <String, int>{};
    for (final object in plan.objects) {
      if (object.isChair && object.parentId != null) {
        seatCounts[object.parentId!] = (seatCounts[object.parentId!] ?? 0) + 1;
      }
    }

    final activeOrders = _orders
        .where((order) => _isLiveTableActive(order.status))
        .toList(growable: false);

    return plan.objects.where((object) => object.isTable).map((table) {
      final label = table.label ?? table.tableNumber?.toString() ?? table.id;
      final normalizedLabel = _normalizeLabel(label);
      final matchedOrders = activeOrders.where((order) {
        final sameTableId = order.tableId != null && order.tableId == table.id;
        final sameTableLabel = _normalizeLabel(order.tableLabel) == normalizedLabel;
        return sameTableId || sameTableLabel;
      }).toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      final unpaidOrders = matchedOrders
          .where((order) => _isWaitingPaymentStatus(order.status))
          .toList(growable: false);

      final serviceFlowOrders = matchedOrders
          .where((order) => _isServiceFlowStatus(order.status))
          .toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

      final serviceOrders = serviceFlowOrders
          .where(
            (order) =>
                order.status == PosOrderStatus.paid ||
                order.status == PosOrderStatus.partialServed,
          )
          .toList(growable: false);
      final servedOrders = serviceFlowOrders
          .where((order) => order.status == PosOrderStatus.served)
          .toList(growable: false);

      final unpaidOrder = unpaidOrders.isEmpty ? null : unpaidOrders.first;
      final serviceOrder = serviceOrders.isEmpty ? null : serviceOrders.first;
      final order = unpaidOrder ??
          serviceOrder ??
          (servedOrders.isEmpty ? null : servedOrders.first) ??
          (matchedOrders.isEmpty ? null : matchedOrders.first);
      final duration =
          order == null ? Duration.zero : _now.difference(order.createdAt);

      final needsPaymentCount = unpaidOrders.fold<int>(
        0,
        (total, queuedOrder) => total + _paymentItemCount(queuedOrder),
      );
      final needsServeCount = serviceOrders.fold<int>(
        0,
        (total, queuedOrder) {
          final pending = _pendingServeItemCount(queuedOrder);
          return total + (pending > 0 ? pending : 1);
        },
      );
      final doneCount = servedOrders.length;

      final status = _deriveTableStatus(
        unpaidOrder: unpaidOrder,
        serviceOrder: serviceOrder,
        servedOrders: servedOrders,
        duration: duration,
      );

      return LiveTableData(
        table: table,
        seatCount: seatCounts[table.id] ?? table.capacity ?? 0,
        status: status,
        duration: duration,
        orders: matchedOrders,
        unpaidOrder: unpaidOrder,
        unpaidOrders: unpaidOrders,
        serviceOrder: serviceOrder,
        serviceOrders: serviceOrders,
        servedOrders: servedOrders,
        needsPaymentCount: needsPaymentCount,
        needsServeCount: needsServeCount,
        doneCount: doneCount,
        isOverThreshold: duration.inSeconds > (30 * 60),
        order: order,
      );
    }).toList();
  }

  String _normalizeLabel(String? value) {
    return (value ?? '').trim().toLowerCase();
  }

  bool _isWaitingPaymentStatus(PosOrderStatus status) {
    return {
      PosOrderStatus.draft,
      PosOrderStatus.inProgress,
      PosOrderStatus.ready,
      PosOrderStatus.waitingPayment,
    }.contains(status);
  }

  bool _isServiceFlowStatus(PosOrderStatus status) {
    return {
      PosOrderStatus.paid,
      PosOrderStatus.partialServed,
      PosOrderStatus.served,
    }.contains(status);
  }

  int _paymentItemCount(PosOrder order) {
    if (order.items.isEmpty) return 1;
    return order.items.fold<int>(
      0,
      (total, item) => total + item.quantity.toInt().clamp(0, 100000),
    );
  }

  int _pendingServeItemCount(PosOrder order) {
    if (order.items.isEmpty) return 0;
    return order.items.fold<int>(0, (total, item) {
      if (item.status == 'SERVED' || item.status == 'CANCELLED') {
        return total;
      }
      return total + item.quantity.toInt().clamp(0, 100000);
    });
  }

  String _deriveTableStatus({
    required PosOrder? unpaidOrder,
    required PosOrder? serviceOrder,
    required List<PosOrder> servedOrders,
    required Duration duration,
  }) {
    if (unpaidOrder != null) return 'WAITING_PAYMENT';
    if (serviceOrder == null) {
      return servedOrders.isNotEmpty ? 'SERVED' : 'AVAILABLE';
    }
    if (serviceOrder.status == PosOrderStatus.paid) {
      return duration.inSeconds > (30 * 60) ? 'WARN_LONG' : 'SEATED';
    }
    if (serviceOrder.status == PosOrderStatus.partialServed) {
      return 'PARTIAL_SERVED';
    }
    if (serviceOrder.status == PosOrderStatus.served) {
      return 'SERVED';
    }
    return 'AVAILABLE';
  }

  bool _canServeAll(String status) {
    return status == 'SEATED' ||
        status == 'WARN_LONG' ||
        status == 'PARTIAL_SERVED';
  }

  bool _canComplete(String status) {
    return status == 'SERVED';
  }

  String _tableLabel(LiveTableData info) {
    return info.table.label ??
        info.table.tableNumber?.toString() ??
        info.table.id;
  }

  Future<void> _serveOrder(LiveTableData info) async {
    if (info.serviceOrders.isEmpty) return;

    setState(() => _servingOrderId = info.table.id);
    try {
      for (final order in info.serviceOrders) {
        final updated = await ServiceLocator.instance.terminalService.serveOrder(
          order.id,
        );
        if (!mounted) return;
        setState(() => _upsertOrder(updated));
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _servingOrderId = null);
    }
  }

  Future<void> _completeOrder(LiveTableData info) async {
    if (info.servedOrders.isEmpty) return;

    setState(() => _completingOrderId = info.table.id);
    try {
      for (final order in info.servedOrders) {
        final updated = await ServiceLocator.instance.terminalService
            .completeOrder(order.id);
        if (!mounted) return;
        setState(() {
          if (_isTerminalCleared(updated.status)) {
            _orders = _orders.where((item) => item.id != updated.id).toList();
          } else {
            _upsertOrder(updated);
          }
        });
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _completingOrderId = null);
    }
  }

  bool _isLiveTableActive(PosOrderStatus status) {
    return {
      PosOrderStatus.draft,
      PosOrderStatus.inProgress,
      PosOrderStatus.ready,
      PosOrderStatus.waitingPayment,
      PosOrderStatus.paid,
      PosOrderStatus.partialServed,
      PosOrderStatus.served,
    }.contains(status);
  }

  bool _isTerminalCleared(PosOrderStatus status) {
    return {PosOrderStatus.completed, PosOrderStatus.voided}.contains(status);
  }

  Future<void> _payOrder(LiveTableData info) async {
    final order = info.unpaidOrder ?? info.order;
    if (order == null) return;
    if (order.orderSource == 'CUSTOMER') {
      final proceed = await showDialog<bool>(
        context: context,
        barrierDismissible: true,
        builder: (context) => _SelfOrderPayPreviewDialog(
          order: order,
          tableLabel: _tableLabel(info),
        ),
      );
      if (proceed != true) return;
    }
    if (!mounted) return;

    final checkout = await showDialog<CheckoutResult>(
      context: context,
      barrierDismissible: true,
      builder: (context) => CheckoutFlowSheet(
        order: order,
        config: _config,
        selectedTable: TableSelection(
          id: info.table.id,
          label: _tableLabel(info),
          seatCount: info.seatCount,
        ),
        outletId: widget.outlet.id,
        outletName: widget.outlet.name,
      ),
    );

    if (!mounted || checkout == null) return;

    try {
      final refreshed = await ServiceLocator.instance.terminalService.getOrderById(
        order.id,
      );
      if (!mounted) return;
      setState(() => _upsertOrder(refreshed));
    } catch (_) {
      if (!mounted) return;
      _load(silent: true);
    }
  }

  Future<void> _cancelOrder(LiveTableData info) async {
    final order = info.unpaidOrder ?? info.order;
    if (order == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cancel ${_tableLabel(info)}?'),
        content: Text('Order ${order.orderNumber} akan dibatalkan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ServiceLocator.instance.terminalService.voidOrder(
        order.id,
        'Cancelled from live table',
      );
      setState(() {
        _orders = _orders.where((item) => item.id != order.id).toList();
      });
    } catch (error) {
      if (mounted) showError(context, error);
    }
  }

  Future<void> _serveItem(String orderId, PosOrderItem item) async {
    final key = '$orderId-${item.id}';
    setState(() => _servingItemKey = key);
    try {
      final updated = await ServiceLocator.instance.terminalService.serveItem(
        orderId,
        item.id,
      );
      setState(() => _upsertOrder(updated));
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _servingItemKey = null);
    }
  }

  Future<void> _tapTable(LiveTableData info) async {
    if (info.order == null) {
      final callback = widget.onSelectTable;
      if (callback != null) {
        callback(
          TableSelection(
            id: info.table.id,
            label: _tableLabel(info),
            seatCount: info.seatCount,
          ),
        );
        return;
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih meja dari flow Terminal.')),
      );
      return;
    }

    final order = info.order!;
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${_tableLabel(info)} · ${order.orderNumber}',
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              Text('Status ${order.status.value}'),
              Text(
                'Mulai ${DateFormat('HH:mm').format(order.createdAt)} '
                '· tunggu ${formatDuration(info.duration)}',
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: info.status == 'WAITING_PAYMENT'
                        ? () async {
                            Navigator.pop(ctx);
                            await _payOrder(info);
                          }
                        : null,
                    icon: const Icon(Icons.payments_outlined),
                    label: const Text('Pay Now'),
                  ),
                  if (info.status == 'WAITING_PAYMENT')
                    FilledButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        final callback = widget.onSelectTable;
                        if (callback != null) {
                          callback(
                            TableSelection(
                              id: info.table.id,
                              label: _tableLabel(info),
                              seatCount: info.seatCount,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Edit'),
                    ),
                  OutlinedButton.icon(
                    onPressed: info.status == 'WAITING_PAYMENT'
                        ? () async {
                            Navigator.pop(ctx);
                            await _cancelOrder(info);
                          }
                        : null,
                    icon: const Icon(Icons.cancel_outlined),
                    label: const Text('Cancel'),
                  ),
                  FilledButton.icon(
                    onPressed: _canServeAll(info.status)
                        ? () async {
                            Navigator.pop(ctx);
                            await _serveOrder(info);
                          }
                        : null,
                    icon: const Icon(Icons.room_service_outlined),
                    label: const Text('Sajikan'),
                  ),
                  FilledButton.icon(
                    onPressed: _canComplete(info.status)
                        ? () async {
                            Navigator.pop(ctx);
                            await _completeOrder(info);
                          }
                        : null,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Selesai'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => openExternal(
                      ServiceLocator.instance.terminalService.receiptUrl(
                        order.id,
                      ),
                    ),
                    icon: const Icon(Icons.receipt_long),
                    label: const Text('View Order'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final plan = _plan;
    if (plan == null) {
      return const EmptyState(
        icon: Icons.table_bar_outlined,
        title: 'Belum ada published floor layout',
        message:
            'Publish layout outlet ini dari tab Floor agar Live Table aktif.',
      );
    }

    final liveTables = _liveTables();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          StatusLegend(
            onRefresh: _load,
            draftsCount: _drafts.length,
            onTapDrafts: _showSavedTransactions,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final showSidebar = constraints.maxWidth >= 980;

                final floorCard = Card(
                  clipBehavior: Clip.antiAlias,
                  child: FloorCanvas(
                    objects: plan.objects,
                    width: plan.width,
                    height: plan.height,
                    liveTables: liveTables,
                    onSelect: (table) {
                      final info = liveTables.firstWhere(
                        (item) => item.table.id == table.id,
                      );
                      _tapTable(info);
                    },
                  ),
                );

                if (!showSidebar) {
                  return floorCard;
                }

                return Row(
                  children: [
                    Expanded(child: floorCard),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 320,
                      child: _ActiveTableSidebar(
                        tables: liveTables,
                        servingOrderId: _servingOrderId,
                        completingOrderId: _completingOrderId,
                        servingItemKey: _servingItemKey,
                        onServeAll: _serveOrder,
                        onComplete: _completeOrder,
                        onServeItem: _serveItem,
                        onPay: _payOrder,
                        onCancel: _cancelOrder,
                        onEdit: (info) {
                          final callback = widget.onSelectTable;
                          if (callback != null) {
                            callback(
                              TableSelection(
                                id: info.table.id,
                                label: _tableLabel(info),
                                seatCount: info.seatCount,
                              ),
                            );
                          }
                        },
                        onOpenReceipt: (orderId) => openExternal(
                          ServiceLocator.instance.terminalService.receiptUrl(
                            orderId,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveTableSidebar extends StatelessWidget {
  const _ActiveTableSidebar({
    required this.tables,
    required this.onServeAll,
    required this.onComplete,
    required this.onServeItem,
    required this.onPay,
    required this.onCancel,
    required this.onEdit,
    required this.onOpenReceipt,
    this.servingOrderId,
    this.completingOrderId,
    this.servingItemKey,
  });

  final List<LiveTableData> tables;
  final String? servingOrderId;
  final String? completingOrderId;
  final String? servingItemKey;
  final Future<void> Function(LiveTableData info) onServeAll;
  final Future<void> Function(LiveTableData info) onComplete;
  final Future<void> Function(String orderId, PosOrderItem item) onServeItem;
  final Future<void> Function(LiveTableData info) onPay;
  final Future<void> Function(LiveTableData info) onCancel;
  final void Function(LiveTableData info) onEdit;
  final void Function(String orderId) onOpenReceipt;

  @override
  Widget build(BuildContext context) {
    final occupied = tables
        .where((table) => table.status != 'AVAILABLE')
        .toList();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: GimsColors.border)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Active Tables',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: GimsColors.mutedForeground,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${occupied.length} meja aktif',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ],
            ),
          ),
          Expanded(
            child: occupied.isEmpty
                ? const Center(
                    child: Text(
                      'Semua meja tersedia',
                      style: TextStyle(color: GimsColors.mutedForeground),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(10),
                    itemBuilder: (context, index) {
                      final info = occupied[index];
                      final order = info.order;
                      if (order == null) {
                        return const SizedBox.shrink();
                      }

                      final paymentOrder = info.unpaidOrder;
                      final serviceOrder = info.serviceOrder;
                      final pendingPaymentOrders = info.unpaidOrders;
                      final pendingServeOrders = info.serviceOrders;
                      final doneOrders = info.servedOrders;
                      final paymentConfirmed = paymentOrder == null && serviceOrder != null;

                      final tableLabel =
                          info.table.label ??
                          info.table.tableNumber?.toString() ??
                          info.table.id;
                      final canServeAll =
                          info.status == 'SEATED' ||
                          info.status == 'WARN_LONG' ||
                          info.status == 'PARTIAL_SERVED';
                      final canServeItems = pendingServeOrders.any(
                        (queuedOrder) => queuedOrder.items.isNotEmpty,
                      );
                      final canComplete = doneOrders.isNotEmpty;

                      return Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: GimsColors.border),
                          borderRadius: BorderRadius.circular(12),
                          color: _statusBg(info.status),
                        ),
                        padding: const EdgeInsets.all(10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    tableLabel,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                _StatusChip(status: info.status),
                              ],
                            ),
                            if (order.orderSource == 'CUSTOMER') ...[
                              const SizedBox(height: 6),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(999),
                                    color: const Color(0xffd97706),
                                  ),
                                  child: const Text(
                                    'Guest',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 6),
                            Text(
                              'Timer ${formatDuration(info.duration)} · ${order.orderNumber}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: GimsColors.mutedForeground,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${info.seatCount} kursi',
                              style: const TextStyle(
                                fontSize: 12,
                                color: GimsColors.mutedForeground,
                              ),
                            ),
                            if (info.needsPaymentCount > 0 ||
                                info.needsServeCount > 0 ||
                                info.doneCount > 0) ...[
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  if (info.needsPaymentCount > 0)
                                    _MiniBadge(
                                      label: 'Pay ${info.needsPaymentCount}',
                                      textColor: const Color(0xff92400e),
                                      bgColor: const Color(0xfffff7ed),
                                      borderColor: const Color(0xfffbbf24),
                                    ),
                                  if (info.needsServeCount > 0)
                                    _MiniBadge(
                                      label: 'Serve ${info.needsServeCount}',
                                      textColor: const Color(0xff1d4ed8),
                                      bgColor: const Color(0xffeff6ff),
                                      borderColor: const Color(0xff93c5fd),
                                    ),
                                  if (info.doneCount > 0)
                                    _MiniBadge(
                                      label: 'Done ${info.doneCount}',
                                      textColor: const Color(0xff047857),
                                      bgColor: const Color(0xffecfdf5),
                                      borderColor: const Color(0xff6ee7b7),
                                    ),
                                ],
                              ),
                            ],
                            if (order.customerName != null &&
                                order.customerName!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                order.customerName!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: GimsColors.mutedForeground,
                                ),
                              ),
                            ],
                            if (paymentOrder != null) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: GimsColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text(
                                      'PAYMENT QUEUE',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: GimsColors.mutedForeground,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Expanded(
                                          flex: 2,
                                          child: FilledButton(
                                            onPressed: () => onPay(info),
                                            style: FilledButton.styleFrom(
                                              minimumSize: const Size(0, 30),
                                              padding: EdgeInsets.zero,
                                            ),
                                            child: const Text(
                                              'Pay Now',
                                              style: TextStyle(fontSize: 12),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () => onEdit(info),
                                            style: OutlinedButton.styleFrom(
                                              minimumSize: const Size(0, 30),
                                              padding: EdgeInsets.zero,
                                            ),
                                            child: const Icon(
                                              Icons.edit,
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () => onCancel(info),
                                            style: OutlinedButton.styleFrom(
                                              minimumSize: const Size(0, 30),
                                              padding: EdgeInsets.zero,
                                            ),
                                            child: const Icon(
                                              Icons.block,
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    for (final queueOrder
                                        in pendingPaymentOrders.take(2))
                                      Text(
                                        '#${queueOrder.orderNumber} · '
                                        '${queueOrder.items.isEmpty ? 0 : queueOrder.items.first.quantity.toInt()}x '
                                        '${queueOrder.items.isEmpty ? 'Item' : queueOrder.items.first.productName}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: GimsColors.mutedForeground,
                                        ),
                                      ),
                                    if (pendingPaymentOrders.length > 2)
                                      Text(
                                        '+${pendingPaymentOrders.length - 2} more orders',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: GimsColors.mutedForeground,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                            if (paymentOrder == null && paymentConfirmed) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: GimsColors.border),
                                ),
                                child: Row(
                                  children: [
                                    const Expanded(
                                      child: Text(
                                        'PAYMENT CONFIRMED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xff047857),
                                        ),
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () => onOpenReceipt(order.id),
                                      child: const Text('View'),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (canServeItems) ...[
                              const SizedBox(height: 8),
                              const Text(
                                'ITEMS QUEUE',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: GimsColors.mutedForeground,
                                ),
                              ),
                              const SizedBox(height: 6),
                              for (final queueOrder in pendingServeOrders)
                                for (final item in queueOrder.items)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Row(
                                      children: [
                                        const Padding(
                                          padding: EdgeInsets.only(right: 6),
                                          child: Icon(
                                            Icons.circle,
                                            size: 8,
                                            color: Color(0xfff59e0b),
                                          ),
                                        ),
                                        Expanded(
                                          child: Text(
                                            '${item.quantity.toInt()}x ${item.productName}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '#${queueOrder.orderNumber}',
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: GimsColors.mutedForeground,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        if (item.status != 'SERVED')
                                          OutlinedButton(
                                            onPressed:
                                                servingItemKey ==
                                                    '${queueOrder.id}-${item.id}'
                                                ? null
                                                : () => onServeItem(
                                                      queueOrder.id,
                                                      item,
                                                    ),
                                            style: OutlinedButton.styleFrom(
                                              minimumSize: const Size(0, 26),
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 8,
                                              ),
                                            ),
                                            child: Text(
                                              servingItemKey ==
                                                      '${queueOrder.id}-${item.id}'
                                                  ? '...'
                                                  : 'Serve',
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
                                            ),
                                          )
                                        else
                                          const Icon(
                                            Icons.check_circle,
                                            color: Colors.green,
                                            size: 16,
                                          ),
                                      ],
                                    ),
                                  ),
                            ],
                            if (doneOrders.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: const Color(0xff6ee7b7),
                                  ),
                                  color: const Color(0xffecfdf5),
                                ),
                                child: Text(
                                  '${doneOrders.length} served order waiting customer left',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Color(0xff047857),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: FilledButton.tonal(
                                    onPressed:
                                        canServeAll &&
                                            servingOrderId != info.table.id
                                        ? () => onServeAll(info)
                                        : null,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(0, 32),
                                    ),
                                    child: Text(
                                      servingOrderId == info.table.id
                                          ? 'Menyajikan...'
                                          : 'All Served',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: FilledButton(
                                    onPressed:
                                        canComplete &&
                                            completingOrderId != info.table.id
                                        ? () => onComplete(info)
                                        : null,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(0, 32),
                                      backgroundColor: Colors.orange,
                                    ),
                                    child: Text(
                                      completingOrderId == info.table.id
                                          ? 'Proses...'
                                          : 'Customer Left',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                onPressed: () => onOpenReceipt(order.id),
                                icon: const Icon(Icons.receipt_long, size: 16),
                                label: const Text('View Order'),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 8),
                    itemCount: occupied.length,
                  ),
          ),
        ],
      ),
    );
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'SEATED':
        return const Color(0xffeff6ff);
      case 'WAITING_PAYMENT':
        return const Color(0xfffffbeb);
      case 'WARN_LONG':
        return const Color(0xffffedd5);
      case 'PARTIAL_SERVED':
        return const Color(0xfffffbeb);
      case 'SERVED':
        return const Color(0xffecfdf5);
      default:
        return Colors.white;
    }
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({
    required this.label,
    required this.textColor,
    required this.bgColor,
    required this.borderColor,
  });

  final String label;
  final Color textColor;
  final Color bgColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
        color: bgColor,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SelfOrderPayPreviewDialog extends StatelessWidget {
  const _SelfOrderPayPreviewDialog({
    required this.order,
    required this.tableLabel,
  });

  final PosOrder order;
  final String tableLabel;

  @override
  Widget build(BuildContext context) {
    final amountDue =
        order.subtotal + order.taxAmount + order.serviceCharge - order.discountAmount;

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Pay Now - $tableLabel',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: GimsColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ORDER',
                            style: TextStyle(
                              fontSize: 11,
                              color: GimsColors.mutedForeground,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '#${order.orderNumber}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Customer: ${order.customerName?.isNotEmpty == true ? order.customerName : 'Walk-in'}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: GimsColors.mutedForeground,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'AMOUNT DUE',
                          style: TextStyle(
                            fontSize: 11,
                            color: GimsColors.mutedForeground,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          formatMoney(amountDue, 'IDR'),
                          style: const TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'PURCHASED ITEMS',
                style: TextStyle(
                  fontSize: 11,
                  color: GimsColors.mutedForeground,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 140),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      for (final item in order.items)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${item.quantity.toInt()}x ${item.productName}',
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                              Text(
                                formatMoney(item.subtotal, 'IDR'),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: GimsColors.mutedForeground,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 10),
              _AmountRow(
                label: 'Subtotal',
                value: formatMoney(order.subtotal, 'IDR'),
              ),
              _AmountRow(
                label: 'Tax',
                value: formatMoney(order.taxAmount, 'IDR'),
              ),
              _AmountRow(
                label: 'Service',
                value: formatMoney(order.serviceCharge, 'IDR'),
              ),
              const SizedBox(height: 4),
              _AmountRow(
                label: 'Total',
                value: formatMoney(amountDue, 'IDR'),
                isTotal: true,
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text('Continue to Payment'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    required this.label,
    required this.value,
    this.isTotal = false,
  });

  final String label;
  final String value;
  final bool isTotal;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: isTotal ? 22 : 14,
      fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500,
      color: isTotal ? GimsColors.foreground : GimsColors.mutedForeground,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = _resolve();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  (String, Color) _resolve() {
    switch (status) {
      case 'SEATED':
        return ('Occupied', const Color(0xff1d4ed8));
      case 'WAITING_PAYMENT':
        return ('Waiting Payment', const Color(0xff92400e));
      case 'WARN_LONG':
        return ('Long Wait', const Color(0xffc2410c));
      case 'PARTIAL_SERVED':
        return ('Partial', const Color(0xffb45309));
      case 'SERVED':
        return ('Served', const Color(0xff047857));
      default:
        return ('Available', const Color(0xff6b7280));
    }
  }
}
