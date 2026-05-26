import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/sync/sync_status.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../core/utils/formatters.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/pos_order.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/table_selection.dart';
import '../../outlet/domain/models/outlet.dart';
import 'widgets/catalog_panel.dart';
import 'widgets/cart_panel.dart';
import 'widgets/checkout_flow_sheet.dart';
import 'widgets/receipt_dialog.dart';

/// The main terminal screen — catalog + cart + checkout.
class TerminalScreen extends StatefulWidget {
  const TerminalScreen({
    super.key,
    required this.outlet,
    this.selectedTable,
    this.onBackToLiveTable,
    this.resumeOrder,
    this.hasFloorLayout = false,
  });

  final Outlet outlet;
  final TableSelection? selectedTable;
  final VoidCallback? onBackToLiveTable;
  final PosOrder? resumeOrder;
  final bool hasFloorLayout;

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final _search = TextEditingController();
  List<CatalogItem> _catalog = const [];
  List<CartLine> _cart = [];
  List<PosOrder> _drafts = [];
  PosOrder? _order;
  PosConfig? _config;
  bool _loading = true;
  bool _isOnline = true;
  SyncStatusDetail _syncDetail = SyncStatusDetail.idle;
  StreamSubscription<bool>? _connectivitySub;
  StreamSubscription<SyncStatusDetail>? _syncStatusSub;

  @override
  void initState() {
    super.initState();
    _load();
    final syncEngine = ServiceLocator.instance.syncEngine;
    _isOnline = syncEngine.connectivity.isOnline;
    _connectivitySub = syncEngine.connectivity.isOnline$.listen((online) {
      if (mounted) setState(() => _isOnline = online);
    });
    _syncStatusSub = syncEngine.status$.listen((detail) {
      if (mounted) setState(() => _syncDetail = detail);
    });
  }

  @override
  void didUpdateWidget(covariant TerminalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    _syncStatusSub?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadDrafts() async {
    if (widget.hasFloorLayout) return;
    try {
      final svc = ServiceLocator.instance.terminalService;
      final orders = await svc.listOrders(
        outletId: widget.outlet.id,
        status: 'DRAFT',
      );
      if (mounted) {
        setState(() {
          _drafts = orders.where((o) => o.tableId == null && o.id != _order?.id).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _load() async {
    final svc = ServiceLocator.instance.terminalService;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        svc.getCatalog(widget.outlet.id),
        svc.getConfig(widget.outlet.id),
        svc.listOrders(outletId: widget.outlet.id),
      ]);
      setState(() {
        _catalog = results[0] as List<CatalogItem>;
        _config = results[1] as PosConfig?;
        final allOrders = results[2] as List<PosOrder>;
        
        final resume = widget.resumeOrder;
        if (resume != null) {
          _order = resume;
          _cart = resume.items.map((item) {
            final product = _catalog.firstWhere(
              (p) => p.productId == item.productId,
              orElse: () => CatalogItem(
                productId: item.productId,
                productCode: item.productCode,
                productName: item.productName,
                productKind: 'STOCK',
                price: item.unitPrice,
                stock: 9999,
                isAvailable: true,
              ),
            );
            return CartLine(
              product: product,
              quantity: item.quantity,
              notes: item.notes,
            );
          }).toList();
        } else if (widget.selectedTable != null) {
          final matches = allOrders.where((o) =>
            o.tableId == widget.selectedTable!.id &&
            (o.status == PosOrderStatus.draft ||
             o.status == PosOrderStatus.inProgress ||
             o.status == PosOrderStatus.ready ||
             o.status == PosOrderStatus.waitingPayment)
          ).toList();
          final tableOrder = matches.isNotEmpty ? matches.first : null;
          if (tableOrder != null) {
            _order = tableOrder;
            _cart = tableOrder.items.map((item) {
              final product = _catalog.firstWhere(
                (p) => p.productId == item.productId,
                orElse: () => CatalogItem(
                  productId: item.productId,
                  productCode: item.productCode,
                  productName: item.productName,
                  productKind: 'STOCK',
                  price: item.unitPrice,
                  stock: 9999,
                  isAvailable: true,
                ),
              );
              return CartLine(
                product: product,
                quantity: item.quantity,
                notes: item.notes,
              );
            }).toList();
          } else {
            _cart = [];
            _order = null;
          }
        } else {
          _cart = [];
          _order = null;
        }

        _drafts = allOrders.where((o) => o.status == PosOrderStatus.draft && o.tableId == null && o.id != _order?.id).toList();
      });
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveDraft() async {
    if (_cart.isEmpty) return;
    final svc = ServiceLocator.instance.terminalService;
    setState(() => _loading = true);
    try {
      final oldOrderId = _order?.id;
      if (oldOrderId != null) {
        try {
          // DELETE only works on DRAFT orders. For any other mutable status
          // (IN_PROGRESS, WAITING_PAYMENT, etc.) we must void the old order first.
          final oldStatus = _order?.status;
          if (oldStatus == null || oldStatus == PosOrderStatus.draft) {
            await svc.deleteOrder(oldOrderId);
          } else {
            await svc.voidOrder(oldOrderId, 'Disimpan sebagai draft baru');
          }
        } catch (_) {
          // Swallow — even if delete/void fails we still create the new draft
        }
      }

      var order = await svc.createOrder(
        outletId: widget.outlet.id,
        orderType: 'DINE_IN',
        tableId: null,
        tableLabel: null,
        guestCount: 1,
      );
      for (final line in _cart) {
        order = await svc.addItem(order.id, line);
      }
      setState(() {
        _cart = [];
        _order = null;
      });
      if (mounted) {
        showNotification(context, 'Transaksi berhasil disimpan sebagai draft');
      }
      if (widget.hasFloorLayout && widget.onBackToLiveTable != null) {
        widget.onBackToLiveTable!();
      } else {
        await _loadDrafts();
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _applyDraft(PosOrder draft) async {
    setState(() {
      _order = draft;
      _cart = draft.items.map((item) {
        final product = _catalog.firstWhere(
          (p) => p.productId == item.productId,
          orElse: () => CatalogItem(
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            productKind: 'STOCK',
            price: item.unitPrice,
            stock: 9999,
            isAvailable: true,
          ),
        );
        return CartLine(
          product: product,
          quantity: item.quantity,
          notes: item.notes,
        );
      }).toList();
      _drafts = _drafts.where((d) => d.id != draft.id).toList();
    });
    if (mounted) {
      showNotification(context, 'Melanjutkan transaksi #${draft.orderNumber}');
    }
  }

  Future<void> _deleteDraft(PosOrder draft) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Transaksi'),
        content: Text('Apakah Anda yakin ingin menghapus draft transaksi #${draft.orderNumber}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _loading = true);
    try {
      await ServiceLocator.instance.terminalService.deleteOrder(draft.id);
      if (mounted) {
        showNotification(context, 'Draft #${draft.orderNumber} berhasil dihapus');
      }
      await _loadDrafts();
    } catch (error) {
      if (mounted) showError(context, error);
      setState(() => _loading = false);
    }
  }

  void _addToCart(CatalogItem product) {
    if (!product.isAvailable) return;
    final existing = _cart
        .where((line) => line.product.productId == product.productId)
        .firstOrNull;
    setState(() {
      if (existing == null) {
        _cart = [..._cart, CartLine(product: product)];
      } else {
        existing.quantity += 1;
      }
    });

    // Warn cashier when total cart quantity exceeds cached stock level.
    // This is a non-blocking advisory — the cashier may override.
    final totalInCart = _cart
        .where((l) => l.product.productId == product.productId)
        .fold<double>(0, (sum, l) => sum + l.quantity);
    if (product.stock >= 0 && totalInCart > product.stock) {
      showNotification(
        context,
        'Peringatan: stok tersedia ${product.stock.toStringAsFixed(0)} unit. Melanjutkan bisa menyebabkan konflik saat sinkronisasi.',
        backgroundColor: Colors.orange.shade700,
        customContent: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Peringatan: stok tersedia ${product.stock.toStringAsFixed(0)} unit. '
                'Melanjutkan bisa menyebabkan konflik saat sinkronisasi.',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _openOrder() async {
    if (_cart.isEmpty) return;
    final svc = ServiceLocator.instance.terminalService;
    final cartSnapshot = _cart
        .map(
          (line) => CartLine(
            product: line.product,
            quantity: line.quantity,
            notes: line.notes,
          ),
        )
        .toList(growable: false);
    setState(() => _loading = true);
    try {
      final selectedTable = widget.selectedTable;
      
      final oldOrderId = _order?.id;
      if (oldOrderId != null) {
        try {
          final oldStatus = _order?.status;
          if (oldStatus == null || oldStatus == PosOrderStatus.draft) {
            await svc.deleteOrder(oldOrderId);
          } else {
            await svc.voidOrder(oldOrderId, 'Diganti dengan transaksi checkout baru');
          }
        } catch (_) {}
      }

      var order = await svc.createOrder(
        outletId: widget.outlet.id,
        orderType: selectedTable == null ? 'TAKE_AWAY' : 'DINE_IN',
        tableId: selectedTable?.id,
        tableLabel: selectedTable?.label,
        guestCount: selectedTable?.seatCount ?? 1,
      );
      for (final line in _cart) {
        order = await svc.addItem(order.id, line);
      }
      order = await svc.confirmOrder(order.id);
      setState(() {
        _order = order;
        _cart = [];
      });
      if (!mounted) return;
      final checkoutResult = await showDialog<CheckoutResult>(
        context: context,
        barrierDismissible: true,
        builder: (context) => CheckoutFlowSheet(
          order: order,
          config: _config,
          selectedTable: selectedTable,
          outletId: widget.outlet.id,
          outletName: widget.outlet.name,
        ),
      );
      if (checkoutResult != null && mounted) {
        _handleOrderCompleted(
          checkoutResult.customerName,
          checkoutResult.tenderAmount,
        );
        if (mounted) {
          await showDialog(
            context: context,
            barrierDismissible: true,
            builder: (context) => ReceiptDialog(
              order: checkoutResult.order,
              config: _config,
              outletName: widget.outlet.name,
              finalPayment: checkoutResult.finalPayment,
            ),
          );
        }
      } else {
        await _handleOrderCanceled(order, cartSnapshot);
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _handleOrderCompleted(String? customerName, double? tenderAmount) {
    setState(() {
      _cart = [];
      _order = null;
    });
    _loadDrafts();
    widget.onBackToLiveTable?.call();
  }

  Future<void> _handleOrderCanceled(
    PosOrder order,
    List<CartLine> cartSnapshot,
  ) async {
    if (!mounted) return;
    setState(() {
      _order = null;
      _cart = cartSnapshot;
    });
    _loadDrafts();

    try {
      await ServiceLocator.instance.terminalService.voidOrder(
        order.id,
        'Checkout canceled from terminal',
      );
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final products = query.isEmpty
        ? _catalog
        : _catalog
              .where(
                (p) =>
                    p.productName.toLowerCase().contains(query) ||
                    p.productCode.toLowerCase().contains(query),
              )
              .toList();
    final total = _cart.fold<double>(0, (sum, line) => sum + line.subtotal);

    if (_loading) return const Center(child: CircularProgressIndicator());

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;
        final selectedTable = widget.selectedTable;

        final catalog = CatalogPanel(
          search: _search,
          products: products,
          categories:
              _catalog
                  .map((item) => item.category?.trim())
                  .whereType<String>()
                  .where((value) => value.isNotEmpty)
                  .toSet()
                  .toList()
                ..sort(),
          onChanged: () => setState(() {}),
          onTap: _addToCart,
        );
        final cart = CartPanel(
          currency: _config?.currency ?? 'IDR',
          cart: _cart,
          order: _order,
          total: total,
          onQtyChanged: (line, qty) => setState(() => line.quantity = qty),
          onRemove: (line) => setState(
            () => _cart = _cart.where((item) => item != line).toList(),
          ),
          onOpenOrder: _openOrder,
          onSaveDraft: _saveDraft,
        );

        return Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              if (!_isOnline)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3CD),
                    borderRadius: BorderRadius.circular(GimsRadius.medium),
                    border: Border.all(color: const Color(0xFFFFBF00)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.wifi_off_outlined,
                        size: 18,
                        color: Color(0xFF856404),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _syncDetail.status == SyncStatus.syncing
                              ? 'Menyinkronkan data... (${_syncDetail.pendingCount > 0 ? '${_syncDetail.pendingCount} tersisa' : 'selesai'})'
                              : _syncDetail.pendingCount > 0
                              ? 'Mode Offline \u2014 ${_syncDetail.pendingCount} transaksi menunggu sinkronisasi'
                              : 'Mode Offline \u2014 pembayaran cash tersedia',
                          style: const TextStyle(
                            color: Color(0xFF856404),
                            fontSize: 13,
                          ),
                        ),
                      ),
                      if (_syncDetail.status == SyncStatus.syncing)
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF856404),
                          ),
                        ),
                    ],
                  ),
                ),
              if (selectedTable != null)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.table_bar_outlined),
                    title: Text('Meja ${selectedTable.label}'),
                    subtitle: Text(
                      selectedTable.seatCount > 0
                          ? 'Dine in • ${selectedTable.seatCount} kursi'
                          : 'Dine in',
                    ),
                    trailing: widget.onBackToLiveTable == null
                        ? null
                        : OutlinedButton.icon(
                            onPressed: widget.onBackToLiveTable,
                            icon: const Icon(Icons.arrow_back),
                            label: const Text('Kembali ke Live Table'),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: GimsColors.border),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                  GimsRadius.medium,
                                ),
                              ),
                            ),
                          ),
                  ),
                ),
              if (selectedTable != null) const SizedBox(height: 12),
              if (_drafts.isNotEmpty) ...[
                Container(
                  height: 60,
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _drafts.length,
                    itemBuilder: (context, index) {
                      final draft = _drafts[index];
                      return Container(
                        margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: GimsColors.border.withValues(alpha: 0.5),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: InkWell(
                          onTap: () => _applyDraft(draft),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      '#${draft.orderNumber}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      draft.customerName != null && draft.customerName!.isNotEmpty
                                          ? draft.customerName!
                                          : 'Walk-in',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 12),
                                Container(
                                  width: 1,
                                  height: 24,
                                  color: GimsColors.border.withValues(alpha: 0.5),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  formatMoney(draft.totalAmount, 'IDR'),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: GimsColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                IconButton(
                                  icon: const Icon(Icons.close, size: 14),
                                  onPressed: () => _deleteDraft(draft),
                                  visualDensity: VisualDensity.compact,
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  splashRadius: 16,
                                  color: Colors.grey.shade400,
                                  hoverColor: Colors.red.shade50,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
              Expanded(
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(flex: 7, child: catalog),
                          const SizedBox(width: 14),
                          SizedBox(width: 390, child: cart),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(child: catalog),
                          const SizedBox(height: 12),
                          SizedBox(height: 330, child: cart),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
