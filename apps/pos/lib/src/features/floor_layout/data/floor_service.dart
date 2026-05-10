import 'dart:convert';

import '../../../core/network/api_client.dart';
import '../domain/models/floor_plan.dart';

/// Floor plan service — list, get, save layout, publish.
class FloorService {
  FloorService(this._api);

  final ApiClient _api;

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

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
