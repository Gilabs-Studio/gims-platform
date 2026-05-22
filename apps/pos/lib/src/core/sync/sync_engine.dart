import 'dart:async';
import 'dart:convert';

import 'package:isar/isar.dart';

import '../database/isar_provider.dart';
import '../network/api_client.dart';
import '../network/api_exception.dart';
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

      jobs.sort((a, b) {
        final pa = _jobPriority(a);
        final pb = _jobPriority(b);
        if (pa != pb) return pa.compareTo(pb);
        return a.createdAt.compareTo(b.createdAt);
      });

      // Track order IDs whose payment failed this batch so that downstream
      // jobs (serveItem, serveOrder, completeOrder) are skipped in the same run.
      final failedPaymentOrderIds = <String>{};

      for (final job in jobs) {
        // Skip dependent terminal jobs when their order's payment failed this batch.
        if (job.feature == 'terminal' &&
            const {'serveItem', 'serveOrder', 'completeOrder'}.contains(job.action)) {
          final oid = _orderIdFromPayload(job.payload);
          if (oid != null && failedPaymentOrderIds.contains(oid)) {
            continue;
          }
        }

        await _processJob(job);

        // After processing, record payment failures to skip downstream jobs.
        if (job.feature == 'terminal' &&
            job.action == 'processCash' &&
            job.status == SyncJobStatus.failedConflict) {
          final oid = _orderIdFromPayload(job.payload);
          if (oid != null) failedPaymentOrderIds.add(oid);
        }
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

        // For confirmOrder: update any pending processCash amount to the
        // server-confirmed total, preventing offline tax-rate mismatch rejections.
        if (job.feature == 'terminal' && job.action == 'confirmOrder') {
          final confirmedTotal = _extractTotalAmount(body);
          final confirmedOrderId = payload['orderId'] as String?;
          if (confirmedTotal != null &&
              confirmedOrderId != null &&
              confirmedOrderId.isNotEmpty) {
            await _updatePendingCashPaymentAmount(confirmedOrderId, confirmedTotal);
          }
        }

        await _isar.writeTxn(() async {
          job.status = SyncJobStatus.done;
          await _isar.syncJobs.put(job);
        });
      } else if (await _isIdempotentTerminalState(job, statusCode, body, payload)) {
        await _isar.writeTxn(() async {
          job.status = SyncJobStatus.done;
          job.errorCode = null;
          job.errorMessage = null;
          await _isar.syncJobs.put(job);
        });
      } else {
        await _handleJobFailure(job, 'HTTP $statusCode', null);
      }
    } catch (e) {
      if (e is ApiException) {
        final statusCode = e.statusCode;
        final errorCode = e.code;
        final errorDetail = <String, dynamic>{'message': e.message};
        if (errorCode != null) {
          errorDetail['code'] = errorCode;
        }
        final errorBody = <String, dynamic>{
          'message': e.message,
          'error': errorDetail,
        };

        if (statusCode != null &&
            await _isIdempotentTerminalState(job, statusCode, errorBody, payload)) {
          await _isar.writeTxn(() async {
            job.status = SyncJobStatus.done;
            job.errorCode = null;
            job.errorMessage = null;
            await _isar.syncJobs.put(job);
          });
          return;
        }

        final shouldStopRetry = _isNonRetriableClientError(
          job: job,
          statusCode: statusCode,
          errorCode: errorCode,
          message: e.message,
        );

        await _handleJobFailure(
          job,
          _formatApiError(e),
          shouldStopRetry ? (errorCode ?? 'NON_RETRIABLE_CLIENT_ERROR') : null,
        );
        return;
      }

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

    // Cascade-fail dependent downstream jobs when a cash payment definitively fails,
    // so serveItem/serveOrder/completeOrder are not dispatched against an unpaid order.
    if (conflictCode != null &&
        job.feature == 'terminal' &&
        job.action == 'processCash') {
      try {
        final p = jsonDecode(job.payload) as Map<String, dynamic>;
        final orderId = p['orderId'] as String?;
        if (orderId != null && orderId.isNotEmpty) {
          await _cascadeFailDependentJobs(
            orderId,
            'Upstream payment failed — dependent serve/complete jobs cancelled',
          );
        }
      } catch (_) {
        // Payload parse failure must not block status emission.
      }
    }

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
      case 'terminal.serveOrder':
        final orderId = payload['orderId'] as String;
        final res = await api.post('/pos/orders/$orderId/serve');
        return (res.statusCode ?? 200, res.data);
      case 'terminal.completeOrder':
        final orderId = payload['orderId'] as String;
        final res = await api.post('/pos/orders/$orderId/complete');
        return (res.statusCode ?? 200, res.data);
      case 'terminal.serveItem':
        final orderId = payload['orderId'] as String;
        var itemId = payload['itemId'] as String;
        if (itemId.startsWith('item-')) {
          final productId = payload['productId'] as String?;
          if (productId != null && productId.isNotEmpty) {
            final resolved = await _resolveServerItemId(
              api: api,
              orderId: orderId,
              productId: productId,
            );
            if (resolved != null && resolved.isNotEmpty) {
              itemId = resolved;
              payload['itemId'] = itemId;
            } else {
              // Local item ID cannot be mapped; treat as already applied.
              return (200, const <String, dynamic>{});
            }
          }
        }
        final res = await api.post('/pos/orders/$orderId/items/$itemId/serve');
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

  Future<String?> _resolveServerItemId({
    required ApiClient api,
    required String orderId,
    required String productId,
  }) async {
    final res = await api.get<Map<String, dynamic>>('/pos/orders/$orderId');
    final envelope = res.data;
    if (envelope == null) return null;
    final data = envelope['data'];
    if (data is! Map<String, dynamic>) return null;
    final items = data['items'];
    if (items is! List) return null;

    for (final raw in items) {
      if (raw is! Map<String, dynamic>) continue;
      final pid = raw['product_id'] as String?;
      if (pid != productId) continue;
      final status = (raw['status'] as String? ?? '').toUpperCase();
      if (status == 'SERVED' || status == 'CANCELLED') continue;
      final id = raw['id'] as String?;
      if (id != null && id.isNotEmpty) return id;
    }
    return null;
  }

  int _jobPriority(SyncJob job) {
    if (job.feature != 'terminal') return 100;

    switch (job.action) {
      case 'createOrder':
        return 0;
      case 'addItem':
        return 1;
      case 'confirmOrder':
        return 2;
      case 'processCash':
        return 3;
      case 'serveItem':
        return 4;
      case 'serveOrder':
        return 5;
      case 'completeOrder':
        return 6;
      case 'voidOrder':
        return 7;
      default:
        return 100;
    }
  }

  Future<bool> _isIdempotentTerminalState(
    SyncJob job,
    int statusCode,
    dynamic body,
    Map<String, dynamic> payload,
  ) async {
    if (job.feature != 'terminal') return false;
    if (!const {'serveOrder', 'serveItem', 'completeOrder', 'processCash'}
        .contains(job.action)) {
      return false;
    }
    if (statusCode < 400 || statusCode >= 500) return false;

    final text = _extractErrorText(body).toLowerCase();
    if (job.action == 'processCash') {
      return text.contains('already paid') || text.contains('already settled');
    }

    if (text.contains('already served') || text.contains('already completed')) {
      return true;
    }

    if (!text.contains('cannot be modified in its current state')) {
      return false;
    }

    return _isEffectAlreadyApplied(job.action, payload);
  }

  Future<bool> _isEffectAlreadyApplied(
    String action,
    Map<String, dynamic> payload,
  ) async {
    final orderId = payload['orderId'] as String?;
    if (orderId == null || orderId.isEmpty) return false;

    try {
      final res = await _apiClient.get<Map<String, dynamic>>('/pos/orders/$orderId');
      final envelope = res.data;
      if (envelope == null) return false;
      final data = envelope['data'];
      if (data is! Map<String, dynamic>) return false;

      final orderStatus = (data['status'] as String? ?? '').toUpperCase();

      switch (action) {
        case 'completeOrder':
          return orderStatus == 'COMPLETED';
        case 'serveOrder':
          return orderStatus == 'SERVED' || orderStatus == 'COMPLETED';
        case 'serveItem':
          final items = data['items'];
          if (items is! List) return false;
          final itemId = payload['itemId'] as String?;
          final productId = payload['productId'] as String?;
          for (final raw in items) {
            if (raw is! Map<String, dynamic>) continue;
            final matchedById = itemId != null && raw['id'] == itemId;
            final matchedByProduct =
                !matchedById && productId != null && raw['product_id'] == productId;
            if (!matchedById && !matchedByProduct) continue;
            final itemStatus = (raw['status'] as String? ?? '').toUpperCase();
            return itemStatus == 'SERVED' || itemStatus == 'CANCELLED';
          }
          return false;
        default:
          return false;
      }
    } catch (_) {
      return false;
    }
  }

  String _extractErrorText(dynamic body) {
    if (body is String) return body;
    if (body is Map<String, dynamic>) {
      final error = body['error'];
      if (error is Map<String, dynamic>) {
        final message = error['message'] as String?;
        if (message != null && message.isNotEmpty) return message;
      }
      final message = body['message'] as String?;
      if (message != null && message.isNotEmpty) return message;
    }
    return '$body';
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

  bool _isNonRetriableClientError({
    required SyncJob job,
    required int? statusCode,
    required String? errorCode,
    required String message,
  }) {
    if (statusCode == null) return false;
    if (statusCode == 409) return true;
    if (statusCode < 400 || statusCode >= 500) return false;

    final knownCodes = <String>{
      'POS_ORDER_CANNOT_MODIFY',
      'POS_ORDER_ALREADY_PAID',
      'POS_ITEM_ALREADY_SERVED',
      'INSUFFICIENT_STOCK',
      'STOCK_INSUFFICIENT',
      'OUT_OF_STOCK',
      'POS_INSUFFICIENT_PAYMENT',
      'NON_RETRIABLE_CLIENT_ERROR',
    };
    if (errorCode != null && knownCodes.contains(errorCode)) {
      return true;
    }

    final lower = message.toLowerCase();
    if (lower.contains('already paid') ||
        lower.contains('already served') ||
        lower.contains('already completed') ||
        lower.contains('cannot be modified in its current state') ||
        lower.contains('insufficient payment') ||
        lower.contains('insufficient stock') ||
        lower.contains('out of stock')) {
      return true;
    }

    // For terminal sync actions, 4xx responses are usually business-rule
    // rejections and should not be retried indefinitely.
    return job.feature == 'terminal';
  }

  String _formatApiError(ApiException e) {
    final code = e.code;
    final status = e.statusCode;
    if (status == null) {
      return e.message;
    }
    if (code == null || code.isEmpty) {
      return 'HTTP $status: ${e.message}';
    }
    return 'HTTP $status [$code]: ${e.message}';
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

  /// Extracts the `orderId` from a JSON-encoded job payload string.
  String? _orderIdFromPayload(String payloadJson) {
    try {
      final p = jsonDecode(payloadJson) as Map<String, dynamic>;
      return p['orderId'] as String?;
    } catch (_) {
      return null;
    }
  }

  /// Extracts `total_amount` from a server response envelope `{data: {total_amount: ...}}`.
  double? _extractTotalAmount(dynamic body) {
    if (body is Map<String, dynamic>) {
      final data = body['data'];
      if (data is Map<String, dynamic>) {
        final v = data['total_amount'];
        if (v is num) return v.toDouble();
      }
    }
    return null;
  }

  /// Updates the `amount` field of all pending `processCash` jobs for [orderId]
  /// to match [serverTotal], correcting offline tax-rate discrepancies before sync.
  Future<void> _updatePendingCashPaymentAmount(
      String orderId, double serverTotal) async {
    final jobs = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.pending)
        .findAll();

    final toUpdate = <SyncJob>[];
    for (final j in jobs) {
      if (j.feature != 'terminal' || j.action != 'processCash') continue;
      try {
        final p = jsonDecode(j.payload) as Map<String, dynamic>;
        if (p['orderId'] != orderId) continue;
        final currentAmount = (p['amount'] as num?)?.toDouble();
        if (currentAmount != null && currentAmount >= serverTotal) continue;
        // Offline amount is less than server total; align to server-confirmed total.
        p['amount'] = serverTotal;
        j.payload = jsonEncode(p);
        toUpdate.add(j);
      } catch (_) {
        continue;
      }
    }

    if (toUpdate.isNotEmpty) {
      await _isar.writeTxn(() async {
        await _isar.syncJobs.putAll(toUpdate);
      });
    }
  }

  /// Marks all pending/failed `serveItem`, `serveOrder`, and `completeOrder` jobs
  /// for [orderId] as `failedConflict`, blocking them from dispatching against
  /// an order that cannot transition because payment failed.
  Future<void> _cascadeFailDependentJobs(
      String orderId, String reason) async {
    const downstream = {'serveItem', 'serveOrder', 'completeOrder'};

    final jobs = await _isar.syncJobs
        .filter()
        .statusEqualTo(SyncJobStatus.pending)
        .or()
        .statusEqualTo(SyncJobStatus.failed)
        .findAll();

    final toUpdate = <SyncJob>[];
    for (final j in jobs) {
      if (j.feature != 'terminal') continue;
      if (!downstream.contains(j.action)) continue;
      try {
        final p = jsonDecode(j.payload) as Map<String, dynamic>;
        if (p['orderId'] != orderId) continue;
      } catch (_) {
        continue;
      }
      j
        ..status = SyncJobStatus.failedConflict
        ..errorCode = 'PAYMENT_FAILED_UPSTREAM'
        ..errorMessage = reason
        ..attemptCount = j.attemptCount + 1;
      toUpdate.add(j);
    }

    if (toUpdate.isNotEmpty) {
      await _isar.writeTxn(() async {
        await _isar.syncJobs.putAll(toUpdate);
      });
    }
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
