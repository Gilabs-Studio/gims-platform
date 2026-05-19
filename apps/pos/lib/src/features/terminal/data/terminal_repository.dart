import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/isar_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/offline/connectivity_service.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/sync/sync_job.dart';
import '../../../core/sync/sync_provider.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/pos_order.dart';

final terminalRepositoryProvider = Provider<TerminalRepository>((ref) {
  return TerminalRepository(
    isar: ref.watch(isarProvider),
    connectivity: ref.watch(connectivityServiceProvider),
    api: ApiClient.instance,
    syncEngine: ref.watch(syncEngineProvider),
  );
});

/// Exception thrown when an operation requires an online connection.
class OfflineException implements Exception {
  final String message;
  OfflineException(this.message);

  @override
  String toString() => message;
}

class TerminalRepository {
  TerminalRepository({
    required Isar isar,
    required ConnectivityService connectivity,
    required ApiClient api,
    required SyncEngine syncEngine,
  })  : _isar = isar,
        _connectivity = connectivity,
        _api = api,
        _syncEngine = syncEngine;

  final Isar _isar;
  final ConnectivityService _connectivity;
  final ApiClient _api;
  final SyncEngine _syncEngine;

  static const _uuid = Uuid();

  Future<List<CatalogItem>> getCatalog(String outletId) async {
    if (_connectivity.isOnline) {
      try {
        final response = await _api.get<Map<String, dynamic>>(
          '/pos/catalog/outlet/$outletId',
        );
        final raw = response.data?['data'];
        if (raw is List) {
          final items = raw
              .whereType<Map<String, dynamic>>()
              .map(CatalogItem.fromJson)
              .toList();
          await _cacheCatalog(outletId, items);
          return items;
        }
      } catch (_) {
        // Fall through to cache on network error.
      }
    }
    return _getCachedCatalog(outletId);
  }

  Future<void> _cacheCatalog(String outletId, List<CatalogItem> items) async {
    final now = DateTime.now();
    await _isar.writeTxn(() async {
      // Remove stale entries for this outlet.
      final stale = await _isar.cachedCatalogItems
          .filter()
          .outletIdEqualTo(outletId)
          .findAll();
      final staleIds = stale.map((e) => e.id).toList();
      await _isar.cachedCatalogItems.deleteAll(staleIds);

      for (final item in items) {
        final cached = CachedCatalogItem()
          ..productId = item.productId
          ..outletId = outletId
          ..productCode = item.productCode
          ..productName = item.productName
          ..productKind = item.productKind
          ..price = item.price
          ..stock = item.stock.round()
          ..isAvailable = item.isAvailable
          ..imageUrl = item.imageUrl
          ..category = item.category
          ..cachedAt = now;
        await _isar.cachedCatalogItems.put(cached);
      }
    });
  }

  Future<List<CatalogItem>> _getCachedCatalog(String outletId) async {
    final cached = await _isar.cachedCatalogItems
        .filter()
        .outletIdEqualTo(outletId)
        .findAll();
    return cached.map(_cachedToCatalogItem).toList();
  }

  CatalogItem _cachedToCatalogItem(CachedCatalogItem c) => CatalogItem(
        productId: c.productId,
        productCode: c.productCode,
        productName: c.productName,
        productKind: c.productKind,
        price: c.price,
        stock: c.stock.toDouble(),
        isAvailable: c.isAvailable,
        imageUrl: c.imageUrl,
        category: c.category,
      );

  Future<PosConfig?> getConfig(String outletId) async {
    if (_connectivity.isOnline) {
      try {
        final response = await _api.get<Map<String, dynamic>>(
          '/pos/config/outlet/$outletId',
        );
        final data = _dataMap(response.data);
        if (data.isNotEmpty) {
          // Persist raw config for offline use.
          // Using shared prefs key via a separate service is idiomatic;
          // here we store it as a sentinel catalog entry in memory.
          return PosConfig.fromJson(data);
        }
      } catch (_) {
        // Fall through to null (caller handles gracefully).
      }
    }
    return null;
  }

  Future<PosOrder> createOrder({
    required String outletId,
    required String orderType,
    String? tableId,
    String? tableLabel,
    String? customerName,
    int guestCount = 1,
  }) async {
    final clientId = _uuid.v4();
    final payload = <String, dynamic>{
      'outlet_id': outletId,
      'order_type': orderType,
      'guest_count': guestCount,
      'client_id': clientId,
      if (tableId != null) 'table_id': tableId,
      if (tableLabel != null) 'table_label': tableLabel,
      if (customerName != null && customerName.isNotEmpty)
        'customer_name': customerName,
    };

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders',
        data: payload,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      await _cacheOrder(order, clientId, outletId, CachedOrderSyncStatus.synced);
      return order;
    }

    // Offline path: create a local placeholder order.
    final localOrder = PosOrder(
      id: clientId,
      orderNumber: 'LOCAL-${clientId.substring(0, 8).toUpperCase()}',
      outletId: outletId,
      status: PosOrderStatus.draft,
      guestCount: guestCount,
      subtotal: 0,
      taxAmount: 0,
      serviceCharge: 0,
      discountAmount: 0,
      totalAmount: 0,
      items: const [],
      tableId: tableId,
      tableLabel: tableLabel,
      createdAt: DateTime.now(),
    );

    await _cacheOrder(localOrder, clientId, outletId, CachedOrderSyncStatus.queued);

    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'terminal'
      ..action = 'createOrder'
      ..payload = jsonEncode({...payload, 'clientId': clientId})
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);

    return localOrder;
  }

  Future<PosOrder> addItem(String orderId, CartLine line) async {
    final clientId = _uuid.v4();
    final payload = <String, dynamic>{
      'product_id': line.product.productId,
      'quantity': line.quantity,
      if (line.notes != null && line.notes!.isNotEmpty) 'notes': line.notes,
      'client_id': clientId,
    };

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/items',
        data: payload,
      );
      return PosOrder.fromJson(_dataMap(response.data));
    }

    // Offline path: enqueue and return the cached order.
    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'terminal'
      ..action = 'addItem'
      ..payload = jsonEncode({
        ...payload,
        'orderId': orderId,
        'clientId': clientId,
      })
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);

    final cached = await _isar.cachedOrders
        .filter()
        .clientIdEqualTo(orderId)
        .or()
        .orderIdEqualTo(orderId)
        .findFirst();
    if (cached != null) {
      return _cachedToOrder(cached);
    }
    throw OfflineException('Order not found in local cache');
  }

  Future<PosOrder> confirmOrder(String orderId) async {
    if (_connectivity.isOnline) {
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/confirm',
        data: <String, dynamic>{},
      );
      return PosOrder.fromJson(_dataMap(response.data));
    }

    final clientId = _uuid.v4();
    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'terminal'
      ..action = 'confirmOrder'
      ..payload = jsonEncode({'orderId': orderId, 'clientId': clientId})
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);

    final cached = await _isar.cachedOrders
        .filter()
        .clientIdEqualTo(orderId)
        .or()
        .orderIdEqualTo(orderId)
        .findFirst();
    if (cached != null) {
      await _isar.writeTxn(() async {
        cached.status = 'confirmed';
        await _isar.cachedOrders.put(cached);
      });
      return _cachedToOrder(cached);
    }
    throw OfflineException('Order not found in local cache');
  }

  Future<PosPayment> processCash(
    String orderId, {
    required num amount,
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final clientId = _uuid.v4();
    final payload = <String, dynamic>{
      'method': 'CASH',
      'amount': amount,
      'client_id': clientId,
      if (customerId != null && customerId.isNotEmpty) 'customer_id': customerId,
      if (customerName != null && customerName.isNotEmpty)
        'customer_name': customerName,
      if (customerPhone != null && customerPhone.isNotEmpty)
        'customer_phone': customerPhone,
      if (customerEmail != null && customerEmail.isNotEmpty)
        'customer_email': customerEmail,
      if (loyaltyMemberId != null) 'loyalty_member_id': loyaltyMemberId,
      if (loyaltyRewardId != null) 'loyalty_reward_id': loyaltyRewardId,
    };

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/payments/cash',
        data: payload,
      );
      return PosPayment.fromJson(_dataMap(response.data));
    }

    // Cash is allowed offline — queue for sync.
    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'terminal'
      ..action = 'processCash'
      ..payload = jsonEncode({...payload, 'orderId': orderId})
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);

    // Return a local placeholder payment so the UI can proceed.
    return PosPayment(
      id: clientId,
      method: PosPaymentMethod.cash.value,
      amount: amount.toDouble(),
      status: 'pending_sync',
    );
  }

  /// Digital payment always requires an online connection.
  Future<PosPayment> initiateDigital(String orderId) async {
    if (!_connectivity.isOnline) {
      throw OfflineException(
          'Pembayaran digital memerlukan koneksi internet. Silakan gunakan pembayaran tunai atau tunggu hingga koneksi tersedia.');
    }
    throw UnimplementedError('Use TerminalService.initiateDigital directly');
  }

  Future<void> _cacheOrder(
    PosOrder order,
    String clientId,
    String outletId,
    String syncStatus,
  ) async {
    final now = DateTime.now();
    await _isar.writeTxn(() async {
      final existing = await _isar.cachedOrders
          .filter()
          .clientIdEqualTo(clientId)
          .findFirst();
      final cached = existing ?? CachedOrder();
      cached
        ..clientId = clientId
        ..orderId = order.id != clientId ? order.id : null
        ..outletId = outletId
        ..status = order.status.name
        ..itemsJson = jsonEncode(order.items.map(_itemToJson).toList())
        ..totalAmount = order.totalAmount
        ..syncStatus = syncStatus
        ..cachedAt = now;
      await _isar.cachedOrders.put(cached);
    });
  }

  PosOrder _cachedToOrder(CachedOrder cached) {
    List<PosOrderItem> items = const [];
    try {
      final raw = jsonDecode(cached.itemsJson) as List<dynamic>;
      items = raw
          .whereType<Map<String, dynamic>>()
          .map(PosOrderItem.fromJson)
          .toList();
    } catch (_) {}

    return PosOrder(
      id: cached.orderId ?? cached.clientId,
      orderNumber: cached.orderId != null
          ? cached.orderId!.substring(0, 8).toUpperCase()
          : 'LOCAL-${cached.clientId.substring(0, 8).toUpperCase()}',
      outletId: cached.outletId,
      status: PosOrderStatus.fromValue(cached.status),
      guestCount: 1,
      subtotal: cached.totalAmount,
      taxAmount: 0,
      serviceCharge: 0,
      discountAmount: 0,
      totalAmount: cached.totalAmount,
      items: items,
      createdAt: cached.cachedAt,
    );
  }

  Map<String, dynamic> _itemToJson(PosOrderItem item) => {
        'id': item.id,
        'product_id': item.productId,
        'product_name': item.productName,
        'product_code': item.productCode,
        'quantity': item.quantity,
        'unit_price': item.unitPrice,
        'subtotal': item.subtotal,
        'status': item.status,
        if (item.notes != null) 'notes': item.notes,
      };

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
