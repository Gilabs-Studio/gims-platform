import 'package:isar/isar.dart';

part 'cached_catalog_item.g.dart';

@Collection()
class CachedCatalogItem {
  Id id = Isar.autoIncrement;

  @Index(unique: true, composite: [CompositeIndex('outletId')])
  late String productId;

  @Index()
  late String outletId;

  late String productCode;
  late String productName;
  late String productKind;
  late double price;
  late int stock;
  late bool isAvailable;
  String? imageUrl;
  String? category;
  late DateTime cachedAt;
}
