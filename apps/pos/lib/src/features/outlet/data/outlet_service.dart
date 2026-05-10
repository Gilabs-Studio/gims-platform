import '../../../core/network/api_client.dart';
import '../domain/models/outlet.dart';

/// Outlet listing service.
class OutletService {
  OutletService(this._api);

  final ApiClient _api;

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
}
