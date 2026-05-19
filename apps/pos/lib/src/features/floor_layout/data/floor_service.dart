import 'dart:convert';

import '../../../core/network/api_client.dart';
import '../domain/models/floor_plan.dart';

/// Floor plan service — list, get, save layout, publish.
class FloorService {
  FloorService(this._api);

  final ApiClient _api;
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
        }
        for (final plan in plans) {
          _planById[plan.id] = plan;
        }
        return plans;
      }
    } catch (_) {
      // Fall back to the latest in-memory snapshot for current session.
    }

    if (outletId != null && outletId.isNotEmpty) {
      final cached = _plansByOutlet[outletId] ?? const <FloorPlan>[];
      if (status == null || status.isEmpty) return cached;
      return cached.where((plan) => plan.status == status).toList();
    }
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
      return plan;
    } catch (_) {
      final cached = _planById[id];
      if (cached != null) return cached;
      rethrow;
    }
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

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
