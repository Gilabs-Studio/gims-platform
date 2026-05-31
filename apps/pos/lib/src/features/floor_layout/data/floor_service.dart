import 'dart:convert';

import 'package:isar/isar.dart';

import '../../../core/database/isar_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/models/floor_plan.dart';

/// Floor plan service — list, get, save layout, publish.
class FloorService {
  FloorService(this._api, this._isar);

  final ApiClient _api;
  final Isar _isar;
  static final Map<String, List<FloorPlan>> _plansByOutlet = {};
  static final Map<String, FloorPlan> _planById = {};

  Future<List<FloorPlan>> listFloorPlans({
    String? outletId,
    String? status,
    int perPage = 100,
  }) async {
    try {
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
        final plans = raw
            .whereType<Map<String, dynamic>>()
            .map(FloorPlan.fromJson)
            .toList();
        if (outletId != null && outletId.isNotEmpty) {
          _plansByOutlet[outletId] = plans;
          await _cachePlans(outletId, plans);
        }
        for (final plan in plans) {
          _planById[plan.id] = plan;
        }
        return plans;
      }
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      // Fall back to persisted cache or the latest in-memory snapshot.
    }

    if (outletId != null && outletId.isNotEmpty) {
      final persisted = await _getCachedPlans(
        outletId: outletId,
        status: status,
      );
      if (persisted.isNotEmpty) return persisted;
      final cached = _plansByOutlet[outletId] ?? const <FloorPlan>[];
      if (status == null || status.isEmpty) return cached;
      return cached.where((plan) => plan.status == status).toList();
    }
    final persisted = await _getCachedPlans(status: status);
    if (persisted.isNotEmpty) return persisted;
    final all = _planById.values.toList(growable: false);
    if (status == null || status.isEmpty) return all;
    return all.where((plan) => plan.status == status).toList();
  }

  Future<FloorPlan> getFloorPlan(String id) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/floor-plans/$id',
      );
      final plan = FloorPlan.fromJson(_dataMap(response.data));
      _planById[id] = plan;
      await _cachePlans(plan.outletId, [plan]);
      return plan;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final cached = _planById[id];
      if (cached != null) return cached;
      final persisted = await _isar.cachedFloorPlans
          .filter()
          .planIdEqualTo(id)
          .findFirst();
      if (persisted != null) return _cachedToFloorPlan(persisted);
      rethrow;
    }
  }

  Future<FloorPlan> saveFloorLayout(FloorPlan plan) async {
    final layout = jsonDecode(plan.encodeLayout());
    final response = await _api.put<Map<String, dynamic>>(
      '/pos/floor-plans/${plan.id}/layout',
      data: {'layout_data': layout},
    );
    final updated = FloorPlan.fromJson(_dataMap(response.data));
    await _cachePlans(updated.outletId, [updated]);
    return updated;
  }

  Future<FloorPlan> publishFloorPlan(String id) async {
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/floor-plans/$id/publish',
    );
    final updated = FloorPlan.fromJson(_dataMap(response.data));
    await _cachePlans(updated.outletId, [updated]);
    return updated;
  }

  Future<void> _cachePlans(String outletId, List<FloorPlan> plans) async {
    await _isar.writeTxn(() async {
      for (final plan in plans) {
        final existing = await _isar.cachedFloorPlans
            .filter()
            .planIdEqualTo(plan.id)
            .findFirst();
        final cached = existing ?? CachedFloorPlan();
        cached
          ..planId = plan.id
          ..outletId = outletId
          ..name = plan.name
          ..status = plan.status
          ..layoutJson = plan.encodeLayout()
          ..cachedAt = DateTime.now();
        await _isar.cachedFloorPlans.put(cached);
      }
    });
  }

  Future<List<FloorPlan>> _getCachedPlans({
    String? outletId,
    String? status,
  }) async {
    final cached = outletId == null || outletId.isEmpty
        ? await _isar.cachedFloorPlans.where().findAll()
        : await _isar.cachedFloorPlans
              .filter()
              .outletIdEqualTo(outletId)
              .findAll();
    final filtered = status == null || status.isEmpty
        ? cached
        : cached.where((p) => p.status == status).toList();
    return filtered.map(_cachedToFloorPlan).toList();
  }

  FloorPlan _cachedToFloorPlan(CachedFloorPlan c) {
    Object? layout;
    try {
      layout = jsonDecode(c.layoutJson);
    } catch (_) {
      layout = const <dynamic>[];
    }
    return FloorPlan.fromJson({
      'id': c.planId,
      'outlet_id': c.outletId,
      'name': c.name,
      'floor_number': 1,
      'status': c.status,
      'grid_size': 20,
      'snap_to_grid': true,
      'width': 900,
      'height': 600,
      'layout_data': layout,
    });
  }

  bool _isOfflineError(Object error) {
    return error is ApiException && error.isOffline;
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
