import '../../../core/network/api_client.dart';
import '../domain/models/loyalty_member.dart';

/// Loyalty service — member lookup, enroll, redeem.
class LoyaltyService {
  LoyaltyService(this._api);

  final ApiClient _api;

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

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
