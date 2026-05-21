

import 'dart:convert';

import 'package:isar/isar.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/models/cached_order.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/sync/sync_job.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/pos_customer.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/pos_order.dart';

/// Terminal service — catalog, config, orders, payments.
class TerminalService {
  TerminalService(this._api, this._syncEngine, this._isar);

  final ApiClient _api;
  final SyncEngine _syncEngine;
  final Isar _isar;
  static const _uuid = Uuid();
  static final Map<String, List<CatalogItem>> _catalogByOutlet = {};
  static final Map<String, PosConfig> _configByOutlet = {};
  static final Map<String, List<PosOrder>> _ordersByOutlet = {};
  static final Map<String, PosOrder> _orderById = {};
  static List<PosCustomer> _customerCache = [];

  bool _isOfflineError(Object error) {
    return error is ApiException && error.isOffline;
  }

  /// Creates a local order ID that encodes the clientId so it can be
  /// extracted later for SyncEngine job payloads.
  String _newLocalOrderId(String clientId) => 'local-$clientId';

  /// Extracts the original clientId from a local order ID, or returns null
  /// if the order ID belongs to a server-confirmed order.
  String? _extractClientId(String orderId) {
    if (orderId.startsWith('local-')) return orderId.substring(6);
    return null;
  }

  /// Creates a CachedOrder record in Isar so SyncEngine can resolve
  /// the server-assigned orderId for downstream jobs after createOrder syncs.
  Future<void> _cacheLocalOrder(
    String clientId,
    String outletId,
    double totalAmount,
  ) async {
    final entry = CachedOrder()
      ..clientId = clientId
      ..orderId = null
      ..outletId = outletId
      ..status = 'draft'
      ..itemsJson = '[]'
      ..totalAmount = totalAmount
      ..syncStatus = CachedOrderSyncStatus.local
      ..cachedAt = DateTime.now();
    await _isar.writeTxn(() async {
      await _isar.cachedOrders.put(entry);
    });
  }

  /// Enqueues a [SyncJob] to SyncEngine for background processing.
  ///
  /// For [createOrder] jobs [clientId] becomes the job's own clientId so that
  /// [SyncEngine._resolveDownstreamJobs] can propagate the server orderId.
  /// For downstream jobs (addItem, confirmOrder, processCash, voidOrder) the
  /// [clientId] in [payload] must equal the parent order's clientId.
  Future<void> _enqueueJob({
    required String jobClientId,
    required String action,
    required Map<String, dynamic> payload,
  }) async {
    final job = SyncJob()
      ..clientId = jobClientId
      ..feature = 'terminal'
      ..action = action
      ..payload = jsonEncode(payload)
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);
  }



  void _upsertOrderCache(PosOrder order) {
    _orderById[order.id] = order;
    final outletOrders = List<PosOrder>.from(
      _ordersByOutlet[order.outletId] ?? const <PosOrder>[],
    );
    final idx = outletOrders.indexWhere((item) => item.id == order.id);
    if (idx >= 0) {
      outletOrders[idx] = order;
    } else {
      outletOrders.insert(0, order);
    }
    _ordersByOutlet[order.outletId] = outletOrders;
  }

  void _reconcileLocalOrderId(String localOrderId, PosOrder serverOrder) {
    _orderById.remove(localOrderId);
    for (final entry in _ordersByOutlet.entries) {
      final idx = entry.value.indexWhere((order) => order.id == localOrderId);
      if (idx >= 0) {
        final next = List<PosOrder>.from(entry.value);
        next[idx] = serverOrder;
        _ordersByOutlet[entry.key] = next;
        break;
      }
    }
    _upsertOrderCache(serverOrder);
  }

  PosOrder? _findCachedOrder(String orderId) {
    final byId = _orderById[orderId];
    if (byId != null) return byId;
    for (final orders in _ordersByOutlet.values) {
      final idx = orders.indexWhere((o) => o.id == orderId);
      if (idx >= 0) return orders[idx];
    }
    return null;
  }

  PosOrder _applyItemLocally(PosOrder source, CartLine line) {
    final items = List<PosOrderItem>.from(source.items);
    final existingIndex = items.indexWhere(
      (item) => item.productId == line.product.productId,
    );
    if (existingIndex >= 0) {
      final existing = items[existingIndex];
      final qty = existing.quantity + line.quantity;
      final subtotal = qty * existing.unitPrice;
      items[existingIndex] = PosOrderItem(
        id: existing.id,
        productId: existing.productId,
        productName: existing.productName,
        productCode: existing.productCode,
        quantity: qty,
        unitPrice: existing.unitPrice,
        subtotal: subtotal,
        status: existing.status,
        notes: line.notes ?? existing.notes,
      );
    } else {
      items.add(
        PosOrderItem(
          id: 'item-${_uuid.v4()}',
          productId: line.product.productId,
          productName: line.product.productName,
          productCode: line.product.productCode,
          quantity: line.quantity,
          unitPrice: line.product.price,
          subtotal: line.subtotal,
          status: 'PENDING',
          notes: line.notes,
        ),
      );
    }
    final subtotal = items.fold<double>(0, (sum, item) => sum + item.subtotal);
    return PosOrder(
      id: source.id,
      orderNumber: source.orderNumber,
      outletId: source.outletId,
      status: source.status,
      guestCount: source.guestCount,
      subtotal: subtotal,
      taxAmount: source.taxAmount,
      serviceCharge: source.serviceCharge,
      discountAmount: source.discountAmount,
      totalAmount: subtotal + source.taxAmount + source.serviceCharge - source.discountAmount,
      items: items,
      createdAt: source.createdAt,
      tableId: source.tableId,
      tableLabel: source.tableLabel,
      customerId: source.customerId,
      customerName: source.customerName,
      loyaltyMemberId: source.loyaltyMemberId,
      loyaltyRewardId: source.loyaltyRewardId,
      orderSource: source.orderSource,
      notes: source.notes,
    );
  }

  String receiptUrl(String orderId) =>
      '${_api.apiV1}/pos/orders/$orderId/receipt';

  Future<List<CatalogItem>> getCatalog(String outletId) async {
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
        _catalogByOutlet[outletId] = items;
        return items;
      }
    } catch (_) {
      final cached = _catalogByOutlet[outletId];
      if (cached != null) return cached;
    }
    return const [];
  }

  Future<PosConfig?> getConfig(String outletId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/config/outlet/$outletId',
      );
      final data = _dataMap(response.data);
      if (data.isEmpty) return _configByOutlet[outletId];
      final config = PosConfig.fromJson(data);
      _configByOutlet[outletId] = config;
      return config;
    } catch (_) {
      return _configByOutlet[outletId];
    }
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
    final data = <String, dynamic>{
      'outlet_id': outletId,
      'order_type': orderType,
      'guest_count': guestCount,
      'client_id': clientId,
    };
    if (tableId != null) data['table_id'] = tableId;
    if (tableLabel != null) data['table_label'] = tableLabel;
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders',
        data: data,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final localOrder = PosOrder(
        id: _newLocalOrderId(clientId),
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
        createdAt: DateTime.now(),
        tableId: tableId,
        tableLabel: tableLabel,
        customerName: customerName,
      );
      _upsertOrderCache(localOrder);
      // Persist an Isar CachedOrder so SyncEngine can resolve the server orderId
      // for downstream jobs (addItem, confirmOrder, processCash) via CachedOrder lookup.
      await _cacheLocalOrder(clientId, outletId, 0);
      await _enqueueJob(
        jobClientId: clientId,
        action: 'createOrder',
        payload: data,
      );
      return localOrder;
    }
  }

  Future<PosOrder> addItem(String orderId, CartLine line) async {
    final jobClientId = _uuid.v4();
    final payload = {
      'product_id': line.product.productId,
      'quantity': line.quantity,
      if (line.notes != null && line.notes!.isNotEmpty) 'notes': line.notes,
    };
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/items',
        data: payload,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = _applyItemLocally(baseOrder, line);
      _upsertOrderCache(updated);
      // For local orders (id = 'local-{parentClientId}'), use the parent clientId
      // so SyncEngine can propagate the resolved server orderId after createOrder syncs.
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'addItem',
        payload: {
          ...payload,
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> getOrderById(String orderId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/pos/orders/$orderId');
      final order = PosOrder.fromJson(_dataMap(response.data));
      _orderById[order.id] = order;
      return order;
    } catch (_) {
      final cached = _orderById[orderId];
      if (cached != null) return cached;
      rethrow;
    }
  }

  Future<PosOrder> confirmOrder(String orderId) async {
    final jobClientId = _uuid.v4();
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/confirm',
        data: <String, dynamic>{},
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = PosOrder(
        id: baseOrder.id,
        orderNumber: baseOrder.orderNumber,
        outletId: baseOrder.outletId,
        status: PosOrderStatus.waitingPayment,
        guestCount: baseOrder.guestCount,
        subtotal: baseOrder.subtotal,
        taxAmount: baseOrder.taxAmount,
        serviceCharge: baseOrder.serviceCharge,
        discountAmount: baseOrder.discountAmount,
        totalAmount: baseOrder.totalAmount,
        items: baseOrder.items,
        createdAt: baseOrder.createdAt,
        tableId: baseOrder.tableId,
        tableLabel: baseOrder.tableLabel,
        customerId: baseOrder.customerId,
        customerName: baseOrder.customerName,
        loyaltyMemberId: baseOrder.loyaltyMemberId,
        loyaltyRewardId: baseOrder.loyaltyRewardId,
        orderSource: baseOrder.orderSource,
        notes: baseOrder.notes,
      );
      _upsertOrderCache(updated);
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'confirmOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> voidOrder(String orderId, String reason) async {
    final jobClientId = _uuid.v4();
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/void',
        data: {'reason': reason},
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = PosOrder(
        id: baseOrder.id,
        orderNumber: baseOrder.orderNumber,
        outletId: baseOrder.outletId,
        status: PosOrderStatus.voided,
        guestCount: baseOrder.guestCount,
        subtotal: baseOrder.subtotal,
        taxAmount: baseOrder.taxAmount,
        serviceCharge: baseOrder.serviceCharge,
        discountAmount: baseOrder.discountAmount,
        totalAmount: baseOrder.totalAmount,
        items: baseOrder.items,
        createdAt: baseOrder.createdAt,
        tableId: baseOrder.tableId,
        tableLabel: baseOrder.tableLabel,
        customerId: baseOrder.customerId,
        customerName: baseOrder.customerName,
        loyaltyMemberId: baseOrder.loyaltyMemberId,
        loyaltyRewardId: baseOrder.loyaltyRewardId,
        orderSource: baseOrder.orderSource,
        notes: baseOrder.notes,
      );
      _upsertOrderCache(updated);
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'voidOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
          'reason': reason,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> serveOrder(String orderId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/serve',
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> completeOrder(String orderId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/complete',
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> serveItem(String orderId, String itemId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/items/$itemId/serve',
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<List<PosOrder>> listOrders({
    required String outletId,
    String? status,
    int perPage = 100,
  }) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/orders',
        queryParameters: {
          'outlet_id': outletId,
          'status': status,
          'per_page': perPage,
        },
      );
      final raw = response.data?['data'];
      if (raw is List) {
        final orders = raw
            .whereType<Map<String, dynamic>>()
            .map(PosOrder.fromJson)
            .toList();
        _ordersByOutlet[outletId] = orders;
        for (final order in orders) {
          _orderById[order.id] = order;
        }
        return orders;
      }
    } catch (_) {
      final cached = _ordersByOutlet[outletId];
      if (cached != null) {
        if (status == null || status.isEmpty) return cached;
        return cached.where((order) => order.status.value == status).toList();
      }
    }
    return const [];
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
    final data = <String, dynamic>{
      'method': PosPaymentMethod.cash.value,
      'amount': amount,
    };
    if (customerId != null && customerId.isNotEmpty) {
      data['customer_id'] = customerId;
    }
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      data['customer_phone'] = customerPhone;
    }
    if (customerEmail != null && customerEmail.isNotEmpty) {
      data['customer_email'] = customerEmail;
    }
    if (loyaltyMemberId != null) data['loyalty_member_id'] = loyaltyMemberId;
    if (loyaltyRewardId != null) data['loyalty_reward_id'] = loyaltyRewardId;
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$orderId/payments/cash',
        data: data,
      );
      return PosPayment.fromJson(_dataMap(response.data));
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: clientId,
        action: 'processCash',
        payload: {
          ...data,
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return PosPayment(
        id: clientId,
        method: PosPaymentMethod.cash.value,
        status: 'pending_sync',
        amount: amount.toDouble(),
        tenderAmount: amount.toDouble(),
        changeAmount: 0,
      );
    }
  }

  Future<PosPayment> initiateDigital(
    String orderId, {
    required double amount,
    String channelCode = 'QRIS',
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final data = <String, dynamic>{
      'method': PosPaymentMethod.digital.value,
      'amount': amount,
      'channel_code': channelCode,
    };
    if (customerId != null && customerId.isNotEmpty) {
      data['customer_id'] = customerId;
    }
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      data['customer_phone'] = customerPhone;
    }
    if (customerEmail != null && customerEmail.isNotEmpty) {
      data['customer_email'] = customerEmail;
    }
    if (loyaltyMemberId != null) data['loyalty_member_id'] = loyaltyMemberId;
    if (loyaltyRewardId != null) data['loyalty_reward_id'] = loyaltyRewardId;
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/payments/digital',
      data: data,
    );
    return PosPayment.fromJson(_dataMap(response.data));
  }

  Future<List<PosPayment>> getPaymentsByOrderId(String orderId) async {
    final response = await _api.get<Map<String, dynamic>>('/pos/orders/$orderId/payments');
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(PosPayment.fromJson)
          .toList();
    }
    return const [];
  }

  Future<XenditConnectionStatus> getXenditConnectionStatus() async {
    final response = await _api.get<Map<String, dynamic>>('/pos/payment/status');
    return XenditConnectionStatus.fromJson(_dataMap(response.data));
  }

  Future<List<PosCustomer>> listCustomers({
    String? search,
    int perPage = 10,
  }) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/customer/customers',
        queryParameters: {
          'per_page': perPage,
          'search': search,
        },
      );
      final raw = response.data?['data'];
      if (raw is List) {
        final customers = raw
            .whereType<Map<String, dynamic>>()
            .map(PosCustomer.fromJson)
            .toList();
        // Update in-memory cache when fetched online.
        if (search == null || search.isEmpty) {
          _customerCache = customers;
        }
        return customers;
      }
      return const [];
    } catch (error) {
      if (error is ApiException && error.isOffline) {
        // Return cached customers so checkout can still look up regulars.
        if (search == null || search.isEmpty) return _customerCache;
        final q = search.toLowerCase();
        return _customerCache
            .where((c) => c.name.toLowerCase().contains(q))
            .toList();
      }
      rethrow;
    }
  }

  Future<PosCustomer> createCustomer({
    required String name,
    String? phone,
    String? email,
  }) async {
    final data = <String, dynamic>{
      'name': name,
      'is_active': true,
    };
    if (phone != null && phone.isNotEmpty) {
      data['contact_person'] = phone;
    }
    if (email != null && email.isNotEmpty) {
      data['email'] = email;
    }

    final response = await _api.post<Map<String, dynamic>>(
      '/customer/customers',
      data: data,
    );
    return PosCustomer.fromJson(_dataMap(response.data));
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
