import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/models/loyalty_member.dart';
import '../../../shared/models/api_list.dart';

/// Loyalty service — member lookup, enroll, redeem.
class LoyaltyService {
  LoyaltyService(this._api);

  final ApiClient _api;
  static const _uuid = Uuid();
  static const _pendingLoyaltyKey = 'gims_pos_pending_loyalty_actions_v1';
  static final Map<String, LoyaltyMemberLookup> _lookupCacheByName = {};
  static List<LoyaltyMember> _memberCache = const [];
  static List<Map<String, dynamic>> _programCache = const [];

  bool _isOfflineError(Object error) {
    return error is ApiException && error.statusCode == null;
  }

  Future<List<Map<String, dynamic>>> _loadPendingActions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingLoyaltyKey);
    if (raw == null || raw.isEmpty) return <Map<String, dynamic>>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((item) => item.map((k, v) => MapEntry('$k', v)))
            .toList();
      }
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
    return <Map<String, dynamic>>[];
  }

  Future<void> _savePendingActions(List<Map<String, dynamic>> actions) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingLoyaltyKey, jsonEncode(actions));
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

  Future<void> _tryFlushPendingActions() async {
    final actions = await _loadPendingActions();
    if (actions.isEmpty) return;
    final remaining = <Map<String, dynamic>>[];

    for (final action in actions) {
      final type = action['action'] as String?;
      final payloadAny = action['payload'];
      final payload = payloadAny is Map
          ? payloadAny.map((k, v) => MapEntry('$k', v))
          : <String, dynamic>{};
      if (type == null || payload.isEmpty) {
        continue;
      }

      try {
        if (type == 'enroll_member') {
          final clientId = payload['client_id'] as String?;
          final data = Map<String, dynamic>.from(payload)..remove('client_id');
          if (clientId != null && clientId.isNotEmpty) {
            _api.setNextRequestHeader('X-Idempotency-Key', clientId);
          }
          await _api.post<Map<String, dynamic>>(
            '/loyalty/members/enroll',
            data: data,
          );
        } else if (type == 'redeem_reward') {
          final clientId = payload['client_id'] as String?;
          final data = Map<String, dynamic>.from(payload)..remove('client_id');
          if (clientId != null && clientId.isNotEmpty) {
            _api.setNextRequestHeader('X-Idempotency-Key', clientId);
          }
          await _api.post<Map<String, dynamic>>(
            '/loyalty/redeem',
            data: data,
          );
        } else {
          remaining.add(action);
        }
      } catch (error) {
        remaining.add(action);
        if (_isOfflineError(error)) {
          remaining.addAll(actions.skip(actions.indexOf(action) + 1));
          break;
        }
      }
    }

    await _savePendingActions(remaining);
  }

  Future<LoyaltyMemberLookup> lookupMember({
    required String name,
    required String outletId,
  }) async {
    await _tryFlushPendingActions();
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/loyalty/members/lookup',
        queryParameters: {'name': name, 'outlet_id': outletId},
      );
      final lookup = LoyaltyMemberLookup.fromJson(_dataMap(response.data));
      _lookupCacheByName[name.trim().toLowerCase()] = lookup;
      return lookup;
    } catch (error) {
      final cached = _lookupCacheByName[name.trim().toLowerCase()];
      if (cached != null) return cached;
      rethrow;
    }
  }

  Future<LoyaltyMemberLookup?> getMemberByCustomer(String customerId) async {
    await _tryFlushPendingActions();
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
    } on ApiException catch (error) {
      if (error.statusCode == 404 || error.code == 'NOT_FOUND') {
        return null;
      }
      rethrow;
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
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    final data = <String, dynamic>{
      'name': name,
      'outlet_id': outletId,
      'client_id': clientId,
    };
    if (phone != null && phone.isNotEmpty) data['phone'] = phone;
    if (email != null && email.isNotEmpty) data['email'] = email;
    if (programId != null && programId.isNotEmpty) data['program_id'] = programId;
    if (orderId != null) data['pos_order_id'] = orderId;
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
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
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      await _enqueuePendingAction('enroll_member', data);
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
  }

  Future<ApiList<LoyaltyMember>> listMembers({
    int page = 1,
    int perPage = 20,
    String? search,
  }) async {
    final qp = <String, dynamic>{'page': page, 'per_page': perPage};
    if (search != null && search.isNotEmpty) qp['search'] = search;
    await _tryFlushPendingActions();
    try {
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
      _memberCache = items;
      return ApiList(items: items, total: total);
    } catch (_) {
      return ApiList(items: _memberCache, total: _memberCache.length);
    }
  }

  Future<void> redeemReward({
    required String memberId,
    required String rewardId,
    required String transactionId,
  }) async {
    await _tryFlushPendingActions();
    final clientId = _uuid.v4();
    final payload = {
      'member_id': memberId,
      'reward_id': rewardId,
      'transaction_id': transactionId,
      'transaction_type': 'pos_order',
      'client_id': clientId,
    };
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      await _api.post<Map<String, dynamic>>(
        '/loyalty/redeem',
        data: payload,
      );
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      await _enqueuePendingAction('redeem_reward', payload);
    }
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }

  Future<List<Map<String, dynamic>>> listPrograms({int perPage = 100}) async {
    await _tryFlushPendingActions();
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/loyalty/programs',
        queryParameters: {'per_page': perPage},
      );
      if (response.data != null) {
        final list = response.data!['data'];
        if (list is List) {
          _programCache = list.whereType<Map<String, dynamic>>().toList();
          return _programCache;
        }
      }
      return _programCache;
    } catch (_) {
      return _programCache;
    }
  }
}
