import 'package:isar/isar.dart';

part 'cached_order.g.dart';

class CachedOrderSyncStatus {
  static const String local = 'local';
  static const String queued = 'queued';
  static const String synced = 'synced';
  static const String conflict = 'conflict';
}

@Collection()
class CachedOrder {
  Id id = Isar.autoIncrement;

  /// Client-generated UUID; used as idempotency key until server confirms.
  @Index(unique: true)
  late String clientId;

  /// Server-assigned order ID, null until createOrder sync succeeds.
  @Index()
  String? orderId;

  @Index()
  late String outletId;

  late String status;

  /// JSON-encoded list of order items.
  late String itemsJson;

  late double totalAmount;

  @Index()
  late String syncStatus;

  late DateTime cachedAt;
}
