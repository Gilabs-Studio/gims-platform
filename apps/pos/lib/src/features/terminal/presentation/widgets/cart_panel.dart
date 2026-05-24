import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/url_utils.dart';
import '../../domain/models/cart_line.dart';
import '../../domain/models/pos_order.dart';

class CartPanel extends StatelessWidget {
  final String currency;
  final List<CartLine> cart;
  final PosOrder? order;
  final double total;
  final void Function(CartLine line, double qty) onQtyChanged;
  final ValueChanged<CartLine> onRemove;
  final VoidCallback onOpenOrder;
  final VoidCallback? onSaveDraft;

  const CartPanel({
    super.key,
    required this.currency,
    required this.cart,
    required this.order,
    required this.total,
    required this.onQtyChanged,
    required this.onRemove,
    required this.onOpenOrder,
    this.onSaveDraft,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.hardEdge,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Expanded(child: Text('Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              if (order != null) Chip(label: Text(order!.status.value)),
            ]),
            const SizedBox(height: 10),
            Expanded(
              child: cart.isEmpty &&
                      (order == null ||
                          order!.status == PosOrderStatus.draft ||
                          order!.status == PosOrderStatus.inProgress ||
                          order!.status == PosOrderStatus.ready ||
                          order!.status == PosOrderStatus.waitingPayment ||
                          order!.status == PosOrderStatus.partialServed ||
                          order!.status == PosOrderStatus.served)
                  ? const Center(child: Text('Keranjang kosong'))
                  : ListView(children: [
                      for (final line in cart) CartItemRow(line: line, currency: currency, onQtyChanged: onQtyChanged, onRemove: onRemove),
                      if (order != null &&
                          (order!.status == PosOrderStatus.paid ||
                              order!.status == PosOrderStatus.completed ||
                              order!.status == PosOrderStatus.voided))
                        for (final item in order!.items)
                          ListTile(contentPadding: EdgeInsets.zero, title: Text(item.productName), subtitle: Text('${item.status} x ${item.quantity.toStringAsFixed(0)}'), trailing: Text(formatMoney(item.subtotal, currency))),
                    ]),
            ),
            const Divider(),
            Row(children: [
              const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w700))),
              Text(formatMoney(order?.totalAmount ?? total, currency), style: const TextStyle(fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 10),
            if (order == null ||
                order!.status == PosOrderStatus.draft ||
                order!.status == PosOrderStatus.inProgress ||
                order!.status == PosOrderStatus.ready ||
                order!.status == PosOrderStatus.waitingPayment ||
                order!.status == PosOrderStatus.partialServed ||
                order!.status == PosOrderStatus.served)
              Row(
                children: [
                  if (onSaveDraft != null) ...[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: cart.isEmpty ? null : onSaveDraft,
                        icon: const Icon(Icons.archive_outlined, size: 16),
                        label: const Text('Simpan Draft'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: GimsColors.primary,
                          side: const BorderSide(color: GimsColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: onSaveDraft != null ? 1 : 2,
                    child: FilledButton.icon(
                      onPressed: cart.isEmpty ? null : onOpenOrder,
                      label: const Text('Confirm order'),
                      style: FilledButton.styleFrom(
                        backgroundColor: GimsColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              )
            else
              const Text(
                'Selesaikan pembayaran untuk lanjut ke receipt dan WhatsApp.',
                textAlign: TextAlign.center,
                style: TextStyle(color: GimsColors.mutedForeground),
              ),
          ],
        ),
      ),
    );
  }
}

class CartItemRow extends StatelessWidget {
  const CartItemRow({super.key, required this.line, required this.currency, required this.onQtyChanged, required this.onRemove});

  final CartLine line;
  final String currency;
  final void Function(CartLine, double) onQtyChanged;
  final ValueChanged<CartLine> onRemove;

  @override
  Widget build(BuildContext context) {
    final imageUrl = resolveImageUrl(line.product.imageUrl);
    final fallback = line.product.productKind == 'STOCK' ? Icons.inventory_2_outlined : Icons.restaurant_menu;
    return Dismissible(
      key: ValueKey(line.product.productId),
      direction: DismissDirection.endToStart,
      background: Container(margin: const EdgeInsets.symmetric(vertical: 4), decoration: BoxDecoration(color: GimsColors.destructive.withValues(alpha: 0.92), borderRadius: BorderRadius.circular(12)), alignment: Alignment.centerRight, padding: const EdgeInsets.symmetric(horizontal: 16), child: const Icon(Icons.delete_outline, color: Colors.white)),
      onDismissed: (_) => onRemove(line),
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(children: [
            ClipRRect(borderRadius: BorderRadius.circular(10), child: Container(width: 52, height: 52, color: GimsColors.muted.withValues(alpha: 0.2), child: imageUrl == null ? Icon(fallback, color: GimsColors.mutedForeground) : Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (context, error, stackTrace) => Icon(fallback, color: GimsColors.mutedForeground)))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(line.product.productName, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 4), Text(formatMoney(line.product.price, currency), style: const TextStyle(color: GimsColors.mutedForeground))])),
            const SizedBox(width: 8),
            Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(visualDensity: VisualDensity.compact, onPressed: () { final q = line.quantity - 1; if (q <= 0) { onRemove(line); return; } onQtyChanged(line, q); }, icon: const Icon(Icons.remove_circle_outline)),
              Text(line.quantity.toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w700)),
              IconButton(visualDensity: VisualDensity.compact, onPressed: () => onQtyChanged(line, line.quantity + 1), icon: const Icon(Icons.add_circle_outline)),
            ]),
          ]),
        ),
      ),
    );
  }
}
