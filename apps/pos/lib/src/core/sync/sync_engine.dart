import 'dart:async';
import 'dart:convert';

import 'package:isar/isar.dart';

import '../database/isar_provider.dart';
import '../network/api_client.dart';
import '../offline/connectivity_service.dart';
import 'sync_job.dart';
import 'sync_status.dart';

class SyncEngine {
  SyncEngine({
    required Isar isar,
    required ConnectivityService connectivity,
    required ApiClient apiClient,
  })  : _isar = isar,
        _connectivity = connectivity,
        _apiClient = apiClient;

  final Isar _isar;
  final ConnectivityService _connectivity;
  final ApiClient _apiClient;

  final StreamController<SyncStatusDetail> _statusController =
      StreamController<SyncStatusDetail>.broadcast();

  Timer? _periodicTimer;
  StreamSubscription<bool>? _connectivitySub;
  bool _processing = false;

  Stream<SyncStatusDetail> get status$ => _statusController.stream;

  ConnectivityService get connectivity => _connectivity;

  void start() {
    _connectivitySub = _connectivity.isOnline$.listen((online) {
      if (online) processQueue();
    });

    // Safety-net timer to catch jobs that slipped through.
    _periodicTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => processQueue(),
    );

    // Emit initial status.
    _emitStatus();
  }

  void dispose() {
    _periodicTimer?.cancel();
    _connectivitySub?.cancel();
    _statusController.close();
  }

  Future<void> enqueue(SyncJob job) async {
    await _isar.writeTxn(() async {
      await _isar.syncJobs.put(job);
    });
    _emitStatus();
    if (_connectivity.isOnline) processQueue();
  }

  Future<void> processQueue() async {
    if (_processing || !_connectivity.isOnline) return;
    _processing = true;
    _emitStatus(syncing: true);

    try {
      final now = DateTime.now();
      final jobs = await _isar.syncJobs
          .filter()
          .statusEqualTo(SyncJobStatus.pending)
          .or()
          .group((q) => q
              .statusEqualTo(SyncJobStatus.failed)
              .nextRetryAtIsNull()
              .or()
              .group((q2) => q2
                  .statusEqualTo(SyncJobStatus.failed)
                  .nextRetryAtLessThan(now)))
          .sortByCreatedAt()
          .findAll();

      for (final job in jobs) {
        await _processJob(job);
      }
    } finally {
      _processing = false;
      _emitStatus();
    }
  }

  Future<void> _processJob(SyncJob job) async {
    await _isar.writeTxn(() async {
      job.status = SyncJobStatus.processing;
      await _isar.syncJobs.put(job);
    });

    final payload = jsonDecode(job.payload) as Map<String, dynamic>;

    // Resolve downstream orderId reference if applicable.
    if (payload.containsKey('clientId') && payload['orderId'] == null) {
      final ref = await _isar.cachedOrders
          .filter()
          .clientIdEqualTo(payload['clientId'] as String)
          .findFirst();
      if (ref?.orderId != null) {
        payload['orderId'] = ref!.orderId;
      }
    }

    try {
      _apiClient.setNextRequestHeader('X-Idempotency-Key', job.clientId);
      final (statusCode, body) = await _dispatchJob(job.feature, job.action, payload);

      if (statusCode >= 200 && statusCode < 300) {
        // For createOrder: capture the server-assigned orderId.
        if (job.feature == 'terminal' && job.action == 'createOrder') {
          final orderId = _extractOrderId(body);
          if (orderId != null) {
            final cached = await _isar.cachedOrders
                .filter()
                .clientIdEqualTo(job.clientId)
                .findFirst();
            if (cached != null) {
              await _isar.writeTxn(() async {
                cached.orderId = orderId;
                cached.syncStatus = CachedOrderSyncStatus.synced;
                await _isar.cachedOrders.put(cached);
              });
            }
            // Propagate resolved orderId to downstream jobs.
            await _resolveDownstreamJobs(job.clientId, orderId);
          }
        }

        await _isar.writeTxn(() async {
          job.status = SyncJobStatus.done;
          await _isar.syncJobs.put(job);
        });
      } else {
        await _handleJobFailure(job, 'HTTP $statusCode', null);
      }
    } catch (e) {
      final errorCode = e is _ApiError ? e.code : null;
      final isConflict = errorCode == 'STOCK_INSUFFICIENT' ||
          errorCode == 'OUT_OF_STOCK' ||
          statusCodeFromError(e) == 409;
      await _handleJobFailure(
        job,
        e.toString(),
        isConflict ? errorCode : null,
      );
    }
  }

  Future<void> _resolveDownstreamJobs(
      String parentClientId, String orderId) async {
    final downstreamJobs = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.pending)
        .findAll();

    final toUpdate = <SyncJob>[];
    for (final j in downstreamJobs) {
      final p = jsonDecode(j.payload) as Map<String, dynamic>;
      if (p['clientId'] == parentClientId && p['orderId'] == null) {
        p['orderId'] = orderId;
        j
          ..payload = jsonEncode(p)
          ..resolvedOrderId = orderId;
        toUpdate.add(j);
      }
    }

    if (toUpdate.isNotEmpty) {
      await _isar.writeTxn(() async {
        await _isar.syncJobs.putAll(toUpdate);
      });
    }
  }

  Future<void> _handleJobFailure(
      SyncJob job, String error, String? conflictCode) async {
    await _isar.writeTxn(() async {
      job.attemptCount += 1;
      job.errorMessage = error;
      if (conflictCode != null) {
        job.status = SyncJobStatus.failedConflict;
        job.errorCode = conflictCode;
        // Update cached order status.
        if (job.feature == 'terminal') {
          final clientId = _clientIdFromJob(job);
          if (clientId != null) {
            final cached = await _isar.cachedOrders
                .filter()
                .clientIdEqualTo(clientId)
                .findFirst();
            if (cached != null) {
              cached.syncStatus = CachedOrderSyncStatus.conflict;
              await _isar.cachedOrders.put(cached);
            }
          }
        }
      } else if (job.attemptCount >= 3) {
        job.status = SyncJobStatus.failed;
      } else {
        job.status = SyncJobStatus.failed;
        final backoff = _backoffSeconds(job.attemptCount);
        job.nextRetryAt =
            DateTime.now().add(Duration(seconds: backoff));
      }
      await _isar.syncJobs.put(job);
    });
    _emitStatus();
  }

  int _backoffSeconds(int attempt) {
    switch (attempt) {
      case 1:
        return 5;
      case 2:
        return 30;
      default:
        return 120;
    }
  }

  /// Dispatches a sync job to the correct API endpoint.
  /// Returns (httpStatusCode, responseBody).
  Future<(int, dynamic)> _dispatchJob(
      String feature, String action, Map<String, dynamic> payload) async {
    final api = _apiClient;
    switch ('$feature.$action') {
      case 'terminal.createOrder':
        final res = await api.post('/pos/orders', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'terminal.addItem':
        final orderId = payload['orderId'] as String;
        final res =
            await api.post('/pos/orders/$orderId/items', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'terminal.confirmOrder':
        final orderId = payload['orderId'] as String;
        final res =
            await api.post('/pos/orders/$orderId/confirm', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'terminal.processCash':
        final orderId = payload['orderId'] as String;
        final res =
            await api.post('/pos/orders/$orderId/payments/cash', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'terminal.voidOrder':
        final orderId = payload['orderId'] as String;
        final reason = payload['reason'] as String? ?? 'Canceled offline';
        final res = await api.post(
          '/pos/orders/$orderId/void',
          data: {'reason': reason},
        );
        return (res.statusCode ?? 200, res.data);
      case 'floor.saveLayout':
        final planId = payload['planId'] as String;
        final res =
            await api.put('/pos/floor-plans/$planId/layout', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'loyalty.enrollMember':
        final res = await api.post('/pos/loyalty/members', data: payload);
        return (res.statusCode ?? 200, res.data);
      case 'loyalty.redeemReward':
        final res = await api.post('/pos/loyalty/redeem', data: payload);
        return (res.statusCode ?? 200, res.data);
      default:
        throw _ApiError(
          'Unsupported sync action: $feature.$action',
          null,
          statusCode: null,
        );
    }
  }

  String? _extractOrderId(dynamic body) {
    if (body is Map<String, dynamic>) {
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        return data['id'] as String?;
      }
    }
    return null;
  }

  String? _clientIdFromJob(SyncJob job) {
    try {
      final p = jsonDecode(job.payload) as Map<String, dynamic>;
      return p['clientId'] as String?;
    } catch (_) {
      return null;
    }
  }

  int? statusCodeFromError(Object e) {
    if (e is _ApiError) return e.statusCode;
    return null;
  }

  Future<void> _emitStatus({bool syncing = false}) async {
    final pending = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.pending)
        .count();
    final failed = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.failedConflict)
        .count();
    final lastFailedJob = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.failedConflict)
        .sortByCreatedAtDesc()
        .findFirst();

    final SyncStatus status;
    if (syncing) {
      status = SyncStatus.syncing;
    } else if (failed > 0) {
      status = SyncStatus.conflictError;
    } else if (pending > 0) {
      status = SyncStatus.offlineQueued;
    } else {
      status = SyncStatus.idle;
    }

    if (!_statusController.isClosed) {
      _statusController.add(SyncStatusDetail(
        status: status,
        pendingCount: pending,
        failedCount: failed,
        lastError: lastFailedJob?.errorMessage,
      ));
    }
  }

  Future<List<SyncJob>> getFailedJobs() async {
    return _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.failedConflict)
        .or()
        .statusEqualTo(SyncJobStatus.failed)
        .sortByCreatedAtDesc()
        .findAll();
  }

  Future<void> retryJob(Id jobId) async {
    final job = await _isar.syncJobs.get(jobId);
    if (job == null) return;
    await _isar.writeTxn(() async {
      job
        ..status = SyncJobStatus.pending
        ..attemptCount = 0
        ..errorCode = null
        ..errorMessage = null
        ..nextRetryAt = null;
      await _isar.syncJobs.put(job);
    });
    if (_connectivity.isOnline) processQueue();
  }

  Future<void> cancelJob(Id jobId) async {
    await _isar.writeTxn(() async {
      await _isar.syncJobs.delete(jobId);
    });
    _emitStatus();
  }
}

class _ApiError implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  _ApiError(this.message, this.code, {this.statusCode});

  @override
  String toString() => message;
}
