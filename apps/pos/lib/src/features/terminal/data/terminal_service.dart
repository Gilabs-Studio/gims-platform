

import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/pos_customer.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/pos_order.dart';

/// Terminal service — catalog, config, orders, payments.
class TerminalService {
  TerminalService(this._api);

  final ApiClient _api;
  static const _uuid = Uuid();
  static const _pendingActionsKey = 'gims_pos_pending_actions_v1';
  static const _orderIdMapKey = 'gims_pos_order_id_map_v1';
  static final Map<String, List<CatalogItem>> _catalogByOutlet = {};
  static final Map<String, PosConfig> _configByOutlet = {};
  static final Map<String, List<PosOrder>> _ordersByOutlet = {};
  static final Map<String, PosOrder> _orderById = {};

  Future<void> _tryFlushPendingActions() async {
    try {
      await _flushPendingActions();
    } catch (_) {
      // Best effort only; never block active user action.
    }
  }

  bool _isOfflineError(Object error) {
    return error is ApiException && error.statusCode == null;
  }

  Future<List<Map<String, dynamic>>> _loadPendingActions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingActionsKey);
    if (raw == null || raw.isEmpty) return <Map<String, dynamic>>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((e) => e.map((k, v) => MapEntry('$k', v)))
            .toList();
      }
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
    return <Map<String, dynamic>>[];
  }

  Future<void> _savePendingActions(List<Map<String, dynamic>> actions) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingActionsKey, jsonEncode(actions));
  }

  Future<void> _enqueuePendingAction(
    String action,
    Map<String, dynamic> payload,
  ) async {
    final actions = await _loadPendingActions();
    actions.add({
      'id': _uuid.v4(),
      'action': action,
      'payload': payload,
      'created_at': DateTime.now().toIso8601String(),
    });
    await _savePendingActions(actions);
  }

  Future<Map<String, String>> _loadOrderIdMap() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_orderIdMapKey);
    if (raw == null || raw.isEmpty) return <String, String>{};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return decoded.map((k, v) => MapEntry(k, '$v'));
      }
      if (decoded is Map) {
        return decoded.map((k, v) => MapEntry('$k', '$v'));
      }
    } catch (_) {
      return <String, String>{};
    }
    return <String, String>{};
  }

  Future<void> _saveOrderIdMap(Map<String, String> map) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_orderIdMapKey, jsonEncode(map));
  }

  Future<void> _flushPendingActions() async {
    final actions = await _loadPendingActions();
    if (actions.isEmpty) return;

    final orderIdMap = await _loadOrderIdMap();
    final remaining = <Map<String, dynamic>>[];

    bool stopProcessing = false;
    final stageOrder = <String>[
      'create_order',
      'add_item',
      'confirm_order',
      'process_cash',
      'void_order',
    ];

    for (final stage in stageOrder) {
      for (final action in actions) {
        final type = action['action'] as String?;
        if (type != stage) continue;

        final payloadAny = action['payload'];
        final payload = payloadAny is Map
            ? payloadAny.map((k, v) => MapEntry('$k', v))
            : <String, dynamic>{};
        if (payload.isEmpty) {
          continue;
        }

        if (stopProcessing) {
          remaining.add(action);
          continue;
        }

        try {
          switch (stage) {
            case 'create_order':
              final localOrderId = payload['local_order_id'] as String?;
              final clientId = payload['client_id'] as String?;
              final request = Map<String, dynamic>.from(payload)
                ..remove('local_order_id');
              if (clientId != null && clientId.isNotEmpty) {
                _api.setNextRequestHeader('X-Idempotency-Key', clientId);
              }
              final response = await _api.post<Map<String, dynamic>>(
                '/pos/orders',
                data: request,
              );
              final created = PosOrder.fromJson(_dataMap(response.data));
              if (localOrderId != null && localOrderId.isNotEmpty) {
                orderIdMap[localOrderId] = created.id;
                _reconcileLocalOrderId(localOrderId, created);
              } else {
                _upsertOrderCache(created);
              }
              break;

            case 'add_item':
            case 'confirm_order':
            case 'process_cash':
            case 'void_order':
              final queuedOrderId = payload['order_id'] as String?;
              final resolvedOrderId = queuedOrderId == null
                  ? null
                  : (orderIdMap[queuedOrderId] ?? queuedOrderId);
              if (resolvedOrderId == null || resolvedOrderId.isEmpty) {
                remaining.add(action);
                continue;
              }

              final clientId = payload['client_id'] as String?;
              if (clientId != null && clientId.isNotEmpty) {
                _api.setNextRequestHeader('X-Idempotency-Key', clientId);
              }

              if (stage == 'add_item') {
                final request = Map<String, dynamic>.from(payload)
                  ..remove('order_id');
                final response = await _api.post<Map<String, dynamic>>(
                  '/pos/orders/$resolvedOrderId/items',
                  data: request,
                );
                final updated = PosOrder.fromJson(_dataMap(response.data));
                _upsertOrderCache(updated);
              } else if (stage == 'confirm_order') {
                final response = await _api.post<Map<String, dynamic>>(
                  '/pos/orders/$resolvedOrderId/confirm',
                  data: <String, dynamic>{},
                );
                final updated = PosOrder.fromJson(_dataMap(response.data));
                _upsertOrderCache(updated);
              } else if (stage == 'process_cash') {
                final request = Map<String, dynamic>.from(payload)
                  ..remove('order_id');
                await _api.post<Map<String, dynamic>>(
                  '/pos/orders/$resolvedOrderId/payments/cash',
                  data: request,
                );
              } else if (stage == 'void_order') {
                final reason = payload['reason'] as String? ?? 'Order canceled';
                final response = await _api.post<Map<String, dynamic>>(
                  '/pos/orders/$resolvedOrderId/void',
                  data: {'reason': reason},
                );
                final updated = PosOrder.fromJson(_dataMap(response.data));
                _upsertOrderCache(updated);
              }
              break;

            default:
              remaining.add(action);
          }
        } catch (error) {
          remaining.add(action);
          if (_isOfflineError(error)) {
            stopProcessing = true;
          }
        }
      }
    }

    for (final action in actions) {
      final type = action['action'] as String?;
      final isKnownStage = stageOrder.contains(type);
      if (!isKnownStage) {
        remaining.add(action);
      }
    }

    await _savePendingActions(remaining);
    await _saveOrderIdMap(orderIdMap);
  }

  String _newLocalOrderId() => 'local-${_uuid.v4()}';

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
    await _tryFlushPendingActions();
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
    await _tryFlushPendingActions();
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
    await _tryFlushPendingActions();
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
        id: _newLocalOrderId(),
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
      await _enqueuePendingAction('create_order', {
        ...data,
        'local_order_id': localOrder.id,
        'client_id': clientId,
      });
      return localOrder;
    }
  }

  Future<PosOrder> addItem(String orderId, CartLine line) async {
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    final payload = {
      'product_id': line.product.productId,
      'quantity': line.quantity,
      if (line.notes != null && line.notes!.isNotEmpty) 'notes': line.notes,
      'client_id': clientId,
    };
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
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
      await _enqueuePendingAction('add_item', {
        ...payload,
        'order_id': orderId,
      });
      return updated;
    }
  }

  Future<PosOrder> getOrderById(String orderId) async {
    await _tryFlushPendingActions();
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
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
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
      await _enqueuePendingAction('confirm_order', {
        'order_id': orderId,
        'client_id': clientId,
      });
      return updated;
    }
  }

  Future<PosOrder> voidOrder(String orderId, String reason) async {
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
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
      await _enqueuePendingAction('void_order', {
        'order_id': orderId,
        'reason': reason,
        'client_id': clientId,
      });
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
    await _tryFlushPendingActions();
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
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    final data = <String, dynamic>{
      'method': PosPaymentMethod.cash.value,
      'amount': amount,
      'client_id': clientId,
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
      await _enqueuePendingAction('process_cash', {
        ...data,
        'order_id': orderId,
        'client_id': clientId,
      });
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
    final response = await _api.get<Map<String, dynamic>>(
      '/customer/customers',
      queryParameters: {
        'per_page': perPage,
        'search': search,
      },
    );
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(PosCustomer.fromJson)
          .toList();
    }
    return const [];
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
