import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/pos_order.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/table_selection.dart';
import '../../outlet/domain/models/outlet.dart';
import 'widgets/catalog_panel.dart';
import 'widgets/cart_panel.dart';
import 'widgets/checkout_flow_sheet.dart';

/// The main terminal screen — catalog + cart + checkout.
class TerminalScreen extends StatefulWidget {
  const TerminalScreen({
    super.key,
    required this.outlet,
    this.selectedTable,
    this.onBackToLiveTable,
  });

  final Outlet outlet;
  final TableSelection? selectedTable;
  final VoidCallback? onBackToLiveTable;

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final _search = TextEditingController();
  List<CatalogItem> _catalog = const [];
  List<CartLine> _cart = [];
  PosOrder? _order;
  PosConfig? _config;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant TerminalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final svc = ServiceLocator.instance.terminalService;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        svc.getCatalog(widget.outlet.id),
        svc.getConfig(widget.outlet.id),
      ]);
      setState(() {
        _catalog = results[0] as List<CatalogItem>;
        _config = results[1] as PosConfig?;
        _cart = [];
        _order = null;
      });
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
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
        barrierDismissible: false,
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
          categories: _catalog
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
        );

        return Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
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
