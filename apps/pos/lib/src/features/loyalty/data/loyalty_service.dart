import '../../../core/network/api_client.dart';
import '../domain/models/loyalty_member.dart';
import '../../../shared/models/api_list.dart';

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
    String? programId,
    String? orderId,
  }) async {
    final data = <String, dynamic>{'name': name, 'outlet_id': outletId};
    if (phone != null && phone.isNotEmpty) data['phone'] = phone;
    if (email != null && email.isNotEmpty) data['email'] = email;
    if (programId != null && programId.isNotEmpty) data['program_id'] = programId;
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

  Future<ApiList<LoyaltyMember>> listMembers({
    int page = 1,
    int perPage = 20,
    String? search,
  }) async {
    final qp = <String, dynamic>{'page': page, 'per_page': perPage};
    if (search != null && search.isNotEmpty) qp['search'] = search;
    final response = await _api.get<Map<String, dynamic>>(
      '/loyalty/members',
      queryParameters: qp,
    );
    final List<LoyaltyMember> items = [];
    int total = 0;
    if (response.data != null) {
      final list = response.data!['data'];
      final meta = response.data!['meta'];
      if (list is List) {
        for (final e in list.whereType<Map<String, dynamic>>()) {
          items.add(LoyaltyMember.fromJson(e));
        }
      }
      if (meta is Map<String, dynamic>) {
        final pg = meta['pagination'];
        if (pg is Map<String, dynamic>) {
          total = (pg['total'] as num?)?.toInt() ?? 0;
        }
      }
    }
    return ApiList(items: items, total: total);
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

  Future<List<Map<String, dynamic>>> listPrograms({int perPage = 100}) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/loyalty/programs',
      queryParameters: {'per_page': perPage},
    );
    if (response.data != null) {
      final list = response.data!['data'];
      if (list is List) {
        return list.whereType<Map<String, dynamic>>().toList();
      }
    }
    return <Map<String, dynamic>>[];
  }
}
