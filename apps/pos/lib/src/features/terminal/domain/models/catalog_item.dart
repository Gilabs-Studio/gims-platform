import '../../../../shared/models/json_helpers.dart';

/// Catalog item available for POS ordering.
class CatalogItem {
  CatalogItem({
    required this.productId,
    required this.productCode,
    required this.productName,
    required this.productKind,
    required this.price,
    required this.stock,
    required this.isAvailable,
    this.imageUrl,
    this.category,
  });

  final String productId;
  final String productCode;
  final String productName;
  final String productKind;
  final double price;
  final double stock;
  final bool isAvailable;
  final String? imageUrl;
  final String? category;

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    return CatalogItem(
      productId: json['product_id'] as String? ?? '',
      productCode: json['product_code'] as String? ?? '',
      productName: json['product_name'] as String? ?? 'Product',
      productKind: json['product_kind'] as String? ?? 'STOCK',
      price: asDouble(json['price']),
      stock: asDouble(json['stock']),
      isAvailable: json['is_available'] as bool? ?? true,
      imageUrl: json['image_url'] as String?,
      category: json['category'] as String?,
    );
  }
}
