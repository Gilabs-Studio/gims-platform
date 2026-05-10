import 'catalog_item.dart';

/// A line item in the cart before order submission.
class CartLine {
  CartLine({required this.product, this.quantity = 1, this.notes});

  final CatalogItem product;
  double quantity;
  String? notes;

  double get subtotal => product.price * quantity;
}
