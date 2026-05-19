import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/offline/connectivity_service.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/sync/sync_job.dart';
import '../../../core/sync/sync_provider.dart';
import '../domain/models/loyalty_member.dart';

final loyaltyRepositoryProvider = Provider<LoyaltyRepository>((ref) {
  return LoyaltyRepository(
    connectivity: ref.watch(connectivityServiceProvider),
    api: ApiClient.instance,
    syncEngine: ref.watch(syncEngineProvider),
  );
});

class LoyaltyRepository {
  LoyaltyRepository({
    required ConnectivityService connectivity,
    required ApiClient api,
    required SyncEngine syncEngine,
  })  : _connectivity = connectivity,
        _api = api,
        _syncEngine = syncEngine;

  final ConnectivityService _connectivity;
  final ApiClient _api;
  final SyncEngine _syncEngine;

  static const _uuid = Uuid();

  Future<LoyaltyMemberLookup?> lookupMember({
    required String name,
    required String outletId,
  }) async {
    if (!_connectivity.isOnline) return null;
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/loyalty/members/lookup',
        queryParameters: {'name': name, 'outlet_id': outletId},
      );
      return LoyaltyMemberLookup.fromJson(_dataMap(response.data));
    } catch (_) {
      return null;
    }
  }

  Future<LoyaltyMemberLookup?> getMemberByCustomer(String customerId) async {
    if (!_connectivity.isOnline) return null;
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/loyalty/members/by-customer/$customerId',
      );
      final data = _dataMap(response.data);
      if (data.isEmpty) return null;
      return LoyaltyMemberLookup(
        found: true,
        memberId: data['id'] as String?,
        memberCode: data['member_code'] as String?,
        customerId: data['customer_id'] as String?,
        customerName: data['customer_name'] as String?,
        currentTier: data['current_tier'] as String?,
        pointBalance: (data['point_balance'] as num?)?.toDouble() ?? 0,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404 || e.code == 'NOT_FOUND') return null;
      return null;
    }
  }

  Future<LoyaltyMemberLookup> enrollMember({
    required String name,
    required String outletId,
    String? phone,
    String? email,
    String? programId,
    String? orderId,
  }) async {
    final clientId = _uuid.v4();
    final payload = <String, dynamic>{
      'name': name,
      'outlet_id': outletId,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (email != null && email.isNotEmpty) 'email': email,
      if (programId != null && programId.isNotEmpty) 'program_id': programId,
      if (orderId != null) 'pos_order_id': orderId,
    };

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/loyalty/members/enroll',
        data: payload,
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

    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'loyalty'
      ..action = 'enrollMember'
      ..payload = jsonEncode({...payload, 'clientId': clientId})
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);

    // Return an optimistic placeholder.
    return LoyaltyMemberLookup(
      found: true,
      memberId: null,
      memberCode: null,
      customerId: null,
      customerName: name,
      currentTier: null,
      pointBalance: 0,
    );
  }

  Future<void> redeemReward({
    required String memberId,
    required String rewardId,
    String? orderId,
  }) async {
    final clientId = _uuid.v4();
    final payload = <String, dynamic>{
      'member_id': memberId,
      'reward_id': rewardId,
      if (orderId != null) 'order_id': orderId,
    };

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      await _api.post<Map<String, dynamic>>(
        '/loyalty/redeem',
        data: payload,
      );
      return;
    }

    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'loyalty'
      ..action = 'redeemReward'
      ..payload = jsonEncode({...payload, 'clientId': clientId})
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
