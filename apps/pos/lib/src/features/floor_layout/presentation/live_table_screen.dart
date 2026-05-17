import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/url_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../../terminal/domain/models/pos_order.dart';
import '../../terminal/domain/models/table_selection.dart';
import '../domain/live_table_data.dart';
import '../domain/models/floor_plan.dart';
import 'widgets/floor_canvas.dart';
import 'widgets/status_legend.dart';

class LiveTableScreen extends StatefulWidget {
  const LiveTableScreen({super.key, required this.outlet, this.onSelectTable});

  final Outlet outlet;
  final ValueChanged<TableSelection>? onSelectTable;

  @override
  State<LiveTableScreen> createState() => _LiveTableScreenState();
}

class _LiveTableScreenState extends State<LiveTableScreen> {
  Timer? _timer;
  Timer? _clockTimer;
  FloorPlan? _plan;
  List<PosOrder> _orders = const [];
  DateTime _now = DateTime.now();
  bool _loading = true;

  String? _servingOrderId;
  String? _completingOrderId;
  String? _servingItemKey;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _load(silent: true),
    );
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
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
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

      final plan = plans.isEmpty
          ? null
          : await floorService.getFloorPlan(plans.first.id);

      if (!mounted) return;
      setState(() {
        _plan = plan;
        _orders = orders;
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

  List<LiveTableData> _liveTables() {
    final plan = _plan;
    if (plan == null) return const [];

    final seatCounts = <String, int>{};
    for (final object in plan.objects) {
      if (object.isChair && object.parentId != null) {
        seatCounts[object.parentId!] = (seatCounts[object.parentId!] ?? 0) + 1;
      }
    }

    final activeOrders = <String, PosOrder>{};
    for (final order in _orders) {
      if (order.tableLabel == null) continue;
      if (!{
        PosOrderStatus.paid,
        PosOrderStatus.partialServed,
        PosOrderStatus.served,
      }.contains(order.status)) {
        continue;
      }

      final existing = activeOrders[order.tableLabel!];
      if (existing == null || order.createdAt.isAfter(existing.createdAt)) {
        activeOrders[order.tableLabel!] = order;
      }
    }

    return plan.objects.where((object) => object.isTable).map((table) {
      final label = table.label ?? table.tableNumber?.toString() ?? table.id;
      final order = activeOrders[label];
      final duration = order == null
          ? Duration.zero
          : _now.difference(order.createdAt);

      String status = 'AVAILABLE';
      if (order != null) {
        if (order.status == PosOrderStatus.partialServed) {
          status = 'PARTIAL_SERVED';
        } else if (order.status == PosOrderStatus.served) {
          status = 'SERVED';
        } else {
          status = duration.inMinutes > 30 ? 'WARN_LONG' : 'SEATED';
        }
      }

      return LiveTableData(
        table: table,
        seatCount: seatCounts[table.id] ?? table.capacity ?? 0,
        status: status,
        duration: duration,
        order: order,
      );
    }).toList();
  }

  bool _canServeAll(String status) {
    return status == 'SEATED' || status == 'WARN_LONG';
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
    final order = info.order;
    if (order == null) return;

    setState(() => _servingOrderId = order.id);
    try {
      await ServiceLocator.instance.terminalService.serveOrder(order.id);
      await _load(silent: true);
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _servingOrderId = null);
    }
  }

  Future<void> _completeOrder(LiveTableData info) async {
    final order = info.order;
    if (order == null) return;

    setState(() => _completingOrderId = order.id);
    try {
      await ServiceLocator.instance.terminalService.completeOrder(order.id);
      await _load(silent: true);
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _completingOrderId = null);
    }
  }

  Future<void> _serveItem(LiveTableData info, PosOrderItem item) async {
    final order = info.order;
    if (order == null) return;

    final key = '${order.id}-${item.id}';
    setState(() => _servingItemKey = key);
    try {
      await ServiceLocator.instance.terminalService.serveItem(
        order.id,
        item.id,
      );
      await _load(silent: true);
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
                    label: const Text('Nota'),
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
          StatusLegend(onRefresh: _load),
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
  final Future<void> Function(LiveTableData info, PosOrderItem item)
  onServeItem;
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

                      final tableLabel =
                          info.table.label ??
                          info.table.tableNumber?.toString() ??
                          info.table.id;
                      final canServeAll =
                          info.status == 'SEATED' || info.status == 'WARN_LONG';
                      final canServeItems =
                          canServeAll || info.status == 'PARTIAL_SERVED';
                      final canComplete = info.status == 'SERVED';

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
                            if (canServeItems && order.items.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              const Text(
                                'Items',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: GimsColors.mutedForeground,
                                ),
                              ),
                              const SizedBox(height: 6),
                              for (final item in order.items)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${item.quantity.toStringAsFixed(0)}x ${item.productName}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      if (item.status != 'SERVED')
                                        OutlinedButton(
                                          onPressed:
                                              servingItemKey ==
                                                  '${order.id}-${item.id}'
                                              ? null
                                              : () => onServeItem(info, item),
                                          style: OutlinedButton.styleFrom(
                                            minimumSize: const Size(0, 26),
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                            ),
                                          ),
                                          child: Text(
                                            servingItemKey ==
                                                    '${order.id}-${item.id}'
                                                ? '...'
                                                : 'Sajikan',
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
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: FilledButton.tonal(
                                    onPressed:
                                        canServeAll &&
                                            servingOrderId != order.id
                                        ? () => onServeAll(info)
                                        : null,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(0, 32),
                                    ),
                                    child: Text(
                                      servingOrderId == order.id
                                          ? 'Menyajikan...'
                                          : 'Sajikan',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: FilledButton(
                                    onPressed:
                                        canComplete &&
                                            completingOrderId != order.id
                                        ? () => onComplete(info)
                                        : null,
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(0, 32),
                                      backgroundColor: Colors.orange,
                                    ),
                                    child: Text(
                                      completingOrderId == order.id
                                          ? 'Proses...'
                                          : 'Selesai',
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
                                label: const Text('Nota'),
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
