enum SyncStatus { idle, syncing, offlineQueued, conflictError }

class SyncStatusDetail {
  final SyncStatus status;
  final int pendingCount;
  final int failedCount;
  final String? lastError;

  const SyncStatusDetail({
    required this.status,
    this.pendingCount = 0,
    this.failedCount = 0,
    this.lastError,
  });

  static const SyncStatusDetail idle = SyncStatusDetail(status: SyncStatus.idle);
}
