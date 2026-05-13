

import '../../../core/network/api_client.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/pos_customer.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/pos_order.dart';

/// Terminal service — catalog, config, orders, payments.
class TerminalService {
  TerminalService(this._api);

  final ApiClient _api;

  String receiptUrl(String orderId) =>
      '${_api.apiV1}/pos/orders/$orderId/receipt';

  Future<List<CatalogItem>> getCatalog(String outletId) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/catalog/outlet/$outletId',
    );
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(CatalogItem.fromJson)
          .toList();
    }
    return const [];
  }

  Future<PosConfig?> getConfig(String outletId) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/config/outlet/$outletId',
    );
    final data = _dataMap(response.data);
    if (data.isEmpty) return null;
    return PosConfig.fromJson(data);
  }

  Future<PosOrder> createOrder({
    required String outletId,
    required String orderType,
    String? tableId,
    String? tableLabel,
    String? customerName,
    int guestCount = 1,
  }) async {
    final data = <String, dynamic>{
      'outlet_id': outletId,
      'order_type': orderType,
      'guest_count': guestCount,
    };
    if (tableId != null) data['table_id'] = tableId;
    if (tableLabel != null) data['table_label'] = tableLabel;
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders',
      data: data,
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> addItem(String orderId, CartLine line) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/items',
      data: {
        'product_id': line.product.productId,
        'quantity': line.quantity,
        if (line.notes != null && line.notes!.isNotEmpty) 'notes': line.notes,
      },
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> getOrderById(String orderId) async {
    final response = await _api.get<Map<String, dynamic>>('/pos/orders/$orderId');
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> confirmOrder(String orderId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/confirm',
      data: <String, dynamic>{},
    );
    return PosOrder.fromJson(_dataMap(response.data));
  }

  Future<PosOrder> voidOrder(String orderId, String reason) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/void',
      data: {'reason': reason},
    );
    return PosOrder.fromJson(_dataMap(response.data));
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
      return raw
          .whereType<Map<String, dynamic>>()
          .map(PosOrder.fromJson)
          .toList();
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
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/payments/cash',
      data: data,
    );
    return PosPayment.fromJson(_dataMap(response.data));
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
