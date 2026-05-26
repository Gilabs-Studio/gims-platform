import 'package:isar/isar.dart';

import '../../../core/database/isar_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/models/outlet.dart';

/// Outlet listing service.
class OutletService {
  OutletService(this._api, this._isar);

  final ApiClient _api;
  final Isar _isar;

  Future<List<Outlet>> listOutlets() async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/pos/outlets');
      final raw = response.data?['data'];
      if (raw is List) {
        final outlets = raw
            .whereType<Map<String, dynamic>>()
            .map(Outlet.fromJson)
            .toList();
        await _cacheOutlets(outlets);
        return outlets;
      }
    } catch (error) {
      if (error is! ApiException || !error.isOffline) rethrow;
      // Fall through to persisted offline cache.
    }
    return _getCachedOutlets();
  }

  Future<void> _cacheOutlets(List<Outlet> outlets) async {
    final now = DateTime.now();
    await _isar.writeTxn(() async {
      for (final outlet in outlets) {
        final existing = await _isar.cachedOutlets
            .filter()
            .outletIdEqualTo(outlet.id)
            .findFirst();
        final cached = existing ?? CachedOutlet();
        cached
          ..outletId = outlet.id
          ..name = outlet.name
          ..code = outlet.id
          ..address = null
          ..cachedAt = now;
        await _isar.cachedOutlets.put(cached);
      }
    });
  }

  Future<List<Outlet>> _getCachedOutlets() async {
    final cached = await _isar.cachedOutlets.where().findAll();
    return cached.map((c) => Outlet(id: c.outletId, name: c.name)).toList();
  }
}
