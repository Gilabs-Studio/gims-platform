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
import '../../../features/terminal/data/terminal_repository.dart';
import '../domain/models/floor_plan.dart';

final floorRepositoryProvider = Provider<FloorRepository>((ref) {
  return FloorRepository(
    isar: ref.watch(isarProvider),
    connectivity: ref.watch(connectivityServiceProvider),
    api: ApiClient.instance,
    syncEngine: ref.watch(syncEngineProvider),
  );
});

class FloorRepository {
  FloorRepository({
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

  Future<List<FloorPlan>> listFloorPlans({
    String? outletId,
    String? status,
    int perPage = 100,
  }) async {
    if (_connectivity.isOnline) {
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
          if (outletId != null) await _cachePlans(outletId, plans);
          return plans;
        }
      } catch (_) {
        // Fall through to cache.
      }
    }
    return _getCachedPlans(outletId: outletId, status: status);
  }

  Future<FloorPlan> getFloorPlan(String id) async {
    if (_connectivity.isOnline) {
      try {
        final response =
            await _api.get<Map<String, dynamic>>('/pos/floor-plans/$id');
        final plan = FloorPlan.fromJson(_dataMap(response.data));
        await _cacheSinglePlan(plan);
        return plan;
      } catch (_) {
        // Fall through to cache.
      }
    }
    final cached = await _isar.cachedFloorPlans
        .filter()
        .planIdEqualTo(id)
        .findFirst();
    if (cached != null) return _cachedToFloorPlan(cached);
    throw OfflineException('Floor plan not found in local cache');
  }

  Future<FloorPlan> saveFloorLayout(FloorPlan plan) async {
    final layoutJson = plan.encodeLayout();
    final layout = jsonDecode(layoutJson);
    final clientId = _uuid.v4();

    if (_connectivity.isOnline) {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.put<Map<String, dynamic>>(
        '/pos/floor-plans/${plan.id}/layout',
        data: {'layout_data': layout},
      );
      final updated = FloorPlan.fromJson(_dataMap(response.data));
      await _cacheSinglePlan(updated);
      return updated;
    }

    // Offline path: update cache and queue.
    await _isar.writeTxn(() async {
      final existing = await _isar.cachedFloorPlans
          .filter()
          .planIdEqualTo(plan.id)
          .findFirst();
      final cached = existing ?? CachedFloorPlan();
      cached
        ..planId = plan.id
        ..outletId = plan.outletId
        ..name = plan.name
        ..status = plan.status
        ..layoutJson = layoutJson
        ..cachedAt = DateTime.now();
      await _isar.cachedFloorPlans.put(cached);
    });

    final job = SyncJob()
      ..clientId = clientId
      ..feature = 'floor'
      ..action = 'saveLayout'
      ..payload = jsonEncode({
        'planId': plan.id,
        'layout_data': layout,
        'clientId': clientId,
      })
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);
    return plan;
  }

  /// Publish requires an online connection — it is a server-side action.
  Future<FloorPlan> publishFloorPlan(String id) async {
    if (!_connectivity.isOnline) {
      throw OfflineException(
          'Publikasi denah lantai memerlukan koneksi internet.');
    }
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/floor-plans/$id/publish',
    );
    final plan = FloorPlan.fromJson(_dataMap(response.data));
    await _cacheSinglePlan(plan);
    return plan;
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
          ..outletId = plan.outletId
          ..name = plan.name
          ..status = plan.status
          ..layoutJson = plan.encodeLayout()
          ..cachedAt = DateTime.now();
        await _isar.cachedFloorPlans.put(cached);
      }
    });
  }

  Future<void> _cacheSinglePlan(FloorPlan plan) async {
    await _cachePlans(plan.outletId, [plan]);
  }

  Future<List<FloorPlan>> _getCachedPlans({
    String? outletId,
    String? status,
  }) async {
    var query = _isar.cachedFloorPlans.filter();
    if (outletId != null) {
      final cached = await query.outletIdEqualTo(outletId).findAll();
      return _filterByStatus(cached, status).map(_cachedToFloorPlan).toList();
    }
    final all = await _isar.cachedFloorPlans.where().findAll();
    return _filterByStatus(all, status).map(_cachedToFloorPlan).toList();
  }

  List<CachedFloorPlan> _filterByStatus(
      List<CachedFloorPlan> plans, String? status) {
    if (status == null) return plans;
    return plans.where((p) => p.status == status).toList();
  }

  FloorPlan _cachedToFloorPlan(CachedFloorPlan c) {
    Map<String, dynamic> layoutData = {};
    try {
      layoutData = jsonDecode(c.layoutJson) as Map<String, dynamic>;
    } catch (_) {}
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
      ...layoutData,
    });
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
