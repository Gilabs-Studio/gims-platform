import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';

import '../../../core/database/isar_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/offline/connectivity_service.dart';
import '../domain/models/outlet.dart';

final outletRepositoryProvider = Provider<OutletRepository>((ref) {
  return OutletRepository(
    isar: ref.watch(isarProvider),
    connectivity: ref.watch(connectivityServiceProvider),
    api: ApiClient.instance,
  );
});

class OutletRepository {
  OutletRepository({
    required Isar isar,
    required ConnectivityService connectivity,
    required ApiClient api,
  })  : _isar = isar,
        _connectivity = connectivity,
        _api = api;

  final Isar _isar;
  final ConnectivityService _connectivity;
  final ApiClient _api;

  Future<List<Outlet>> listOutlets() async {
    if (_connectivity.isOnline) {
      try {
        final response =
            await _api.get<Map<String, dynamic>>('/pos/outlets');
        final raw = response.data?['data'];
        if (raw is List) {
          final outlets = raw
              .whereType<Map<String, dynamic>>()
              .map(Outlet.fromJson)
              .toList();
          await _cacheOutlets(outlets);
          return outlets;
        }
      } catch (_) {
        // Fall through to cache on network error.
      }
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
    return cached
        .map((c) => Outlet(id: c.outletId, name: c.name))
        .toList();
  }
}
