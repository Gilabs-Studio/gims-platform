import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/url_utils.dart';
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
  final _customerName = TextEditingController();
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
    _customerName.dispose();
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
    setState(() => _loading = true);
    try {
      final selectedTable = widget.selectedTable;
      var order = await svc.createOrder(
        outletId: widget.outlet.id,
        orderType: selectedTable == null ? 'TAKE_AWAY' : 'DINE_IN',
        tableId: selectedTable?.id,
        tableLabel: selectedTable?.label,
        guestCount: selectedTable?.seatCount ?? 1,
        customerName: _customerName.text,
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
      final checkoutResult = await showModalBottomSheet<CheckoutResult>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        builder: (context) => CheckoutFlowSheet(
          order: order,
          config: _config,
          selectedTable: selectedTable,
          outletId: widget.outlet.id,
        ),
      );
      if (checkoutResult != null && mounted) {
        _handleOrderCompleted(
          checkoutResult.customerName,
          checkoutResult.tenderAmount,
        );
      }
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _handleOrderCompleted(String? customerName, double? tenderAmount) {
    if (customerName != null && customerName.isNotEmpty) {
      _customerName.text = customerName;
    }
    setState(() {
      _cart = [];
    });
  }

  Future<void> _shareWhatsApp(PosOrder order, String? template) async {
    final svc = ServiceLocator.instance.terminalService;
    final receipt = svc.receiptUrl(order.id);
    final text = (template == null || template.trim().isEmpty)
        ? 'Terima kasih. Nota pesanan ${order.orderNumber}: $receipt'
        : template
              .replaceAll('{{order_number}}', order.orderNumber)
              .replaceAll('{{receipt_url}}', receipt)
              .replaceAll(
                '{{total_amount}}',
                formatMoney(order.totalAmount, _config?.currency ?? 'IDR'),
              );
    await openExternal('https://wa.me/?text=${Uri.encodeComponent(text)}');
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
        final svc = ServiceLocator.instance.terminalService;

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
          customerName: _customerName,
          total: total,
          onQtyChanged: (line, qty) => setState(() => line.quantity = qty),
          onRemove: (line) => setState(
            () => _cart = _cart.where((item) => item != line).toList(),
          ),
          onOpenOrder: _openOrder,
          onReceipt: _order == null
              ? null
              : () => openExternal(svc.receiptUrl(_order!.id)),
          onWhatsApp: _order == null
              ? null
              : () => _shareWhatsApp(_order!, _config?.receiptWhatsAppTemplate),
        );

        return Padding(
          padding: const EdgeInsets.all(12),
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
                                borderRadius: BorderRadius.circular(10),
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
                          const SizedBox(width: 12),
                          SizedBox(width: 360, child: cart),
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
