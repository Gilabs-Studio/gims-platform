import 'dart:convert';

import '../../core/api_client.dart';
import 'models.dart';

class PosRepository {
  PosRepository(this._api);

  final ApiClient _api;

  String receiptUrl(String orderId) =>
      '${_api.apiV1}/pos/orders/$orderId/receipt';

  Future<UserSession> login({
    required String username,
    required String password,
  }) async {
    await _api.clearSession();
    await _api.bootstrapCsrf();
    final response = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': username, 'password': password},
    );
    final data = _dataMap(response.data);
    final user = data['user'];
    if (user is Map<String, dynamic>) {
      return UserSession.fromJson(user);
    }
    throw ApiException('Login response tidak memiliki data user');
  }

  Future<void> logout() async {
    try {
      await _api.post<Map<String, dynamic>>('/auth/logout');
    } finally {
      await _api.clearSession();
    }
  }

  Future<List<Outlet>> listOutlets() async {
    final response = await _api.get<Map<String, dynamic>>('/pos/outlets');
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(Outlet.fromJson)
          .toList();
    }
    return const [];
  }

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

  Future<List<FloorPlan>> listFloorPlans({
    String? outletId,
    String? status,
    int perPage = 100,
  }) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/floor-plans',
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
          .map(FloorPlan.fromJson)
          .toList();
    }
    return const [];
  }

  Future<FloorPlan> getFloorPlan(String id) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/floor-plans/$id',
    );
    return FloorPlan.fromJson(_dataMap(response.data));
  }

  Future<FloorPlan> saveFloorLayout(FloorPlan plan) async {
    final layout = jsonDecode(plan.encodeLayout());
    final response = await _api.put<Map<String, dynamic>>(
      '/pos/floor-plans/${plan.id}/layout',
      data: {'layout_data': layout},
    );
    return FloorPlan.fromJson(_dataMap(response.data));
  }

  Future<FloorPlan> publishFloorPlan(String id) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/floor-plans/$id/publish',
    );
    return FloorPlan.fromJson(_dataMap(response.data));
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

  Future<PosOrder> confirmOrder(String orderId) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/confirm',
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
    required double amount,
    String? customerName,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final data = <String, dynamic>{
      'method': PosPaymentMethod.cash.value,
      'amount': amount,
    };
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
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
    String? customerName,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final data = <String, dynamic>{
      'method': PosPaymentMethod.digital.value,
      'amount': amount,
      'channel_code': channelCode,
    };
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    if (loyaltyMemberId != null) data['loyalty_member_id'] = loyaltyMemberId;
    if (loyaltyRewardId != null) data['loyalty_reward_id'] = loyaltyRewardId;
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/payments/digital',
      data: data,
    );
    return PosPayment.fromJson(_dataMap(response.data));
  }

  Future<LoyaltyMemberLookup> lookupMember({
    required String name,
    required String outletId,
  }) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/loyalty/members/lookup',
      queryParameters: {'name': name, 'outlet_id': outletId},
    );
    return LoyaltyMemberLookup.fromJson(_dataMap(response.data));
  }

  Future<LoyaltyMemberLookup> enrollMember({
    required String name,
    required String outletId,
    String? phone,
    String? email,
    String? orderId,
  }) async {
    final data = <String, dynamic>{'name': name, 'outlet_id': outletId};
    if (phone != null && phone.isNotEmpty) data['phone'] = phone;
    if (email != null && email.isNotEmpty) data['email'] = email;
    if (orderId != null) data['pos_order_id'] = orderId;
    final response = await _api.post<Map<String, dynamic>>(
      '/loyalty/members/enroll',
      data: data,
    );
    final member = _dataMap(response.data);
    return LoyaltyMemberLookup(
      found: true,
      memberId: member['id'] as String?,
      memberCode: member['member_code'] as String?,
      customerId: member['customer_id'] as String?,
      customerName: member['customer_name'] as String?,
      currentTier: member['current_tier'] as String?,
      pointBalance: (member['point_balance'] as num?)?.toDouble() ?? 0,
    );
  }

  Future<void> redeemReward({
    required String memberId,
    required String rewardId,
    required String transactionId,
  }) async {
    await _api.post<Map<String, dynamic>>(
      '/loyalty/redeem',
      data: {
        'member_id': memberId,
        'reward_id': rewardId,
        'transaction_id': transactionId,
        'transaction_type': 'pos_order',
      },
    );
  }

  Future<List<FeedbackForm>> listFeedbackForms({String? outletId}) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/feedback/forms',
      queryParameters: {'outlet_id': outletId, 'per_page': 100},
    );
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(FeedbackForm.fromJson)
          .toList();
    }
    return const [];
  }

  Future<void> createQuickFeedbackForm({
    required String outletId,
    required String title,
  }) async {
    await _api.post<Map<String, dynamic>>(
      '/feedback/forms',
      data: {
        'outlet_id': outletId,
        'title': title,
        'description': 'Mobile POS feedback form',
        'is_active': true,
        'schema_json': {
          'questions': [
            {
              'id': 'rating_${DateTime.now().millisecondsSinceEpoch}',
              'type': 'rating',
              'label': 'Bagaimana pengalaman Anda?',
              'required': true,
              'order': 1,
              'config': {'min': 1, 'max': 5, 'step': 1},
            },
            {
              'id': 'note_${DateTime.now().millisecondsSinceEpoch}',
              'type': 'text',
              'label': 'Catatan',
              'required': false,
              'order': 2,
              'config': {'max_length': 500},
            },
          ],
        },
      },
    );
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
