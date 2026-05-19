import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';

import '../database/isar_provider.dart';
import '../network/api_client.dart';
import '../offline/connectivity_service.dart';
import 'sync_engine.dart';
import 'sync_job.dart';
import 'sync_status.dart';

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final isar = ref.watch(isarProvider);
  final connectivity = ref.watch(connectivityServiceProvider);
  final engine = SyncEngine(
    isar: isar,
    connectivity: connectivity,
    apiClient: ApiClient.instance,
  );
  engine.start();
  ref.onDispose(engine.dispose);
  return engine;
});

final syncStatusProvider = StreamProvider<SyncStatusDetail>((ref) {
  final engine = ref.watch(syncEngineProvider);
  return engine.status$;
});

final pendingJobCountProvider = FutureProvider<int>((ref) async {
  final isar = ref.watch(isarProvider);
  return isar.syncJobs
      .filter()
      .statusEqualTo(SyncJobStatus.pending)
      .count();
});

final failedJobsProvider = FutureProvider<List<SyncJob>>((ref) async {
  final engine = ref.watch(syncEngineProvider);
  return engine.getFailedJobs();
});
