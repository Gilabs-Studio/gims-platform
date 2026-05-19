import 'package:isar/isar.dart';

part 'sync_job.g.dart';

/// Job status constants — stored as string for readability in Isar queries.
class SyncJobStatus {
  static const String pending = 'pending';
  static const String processing = 'processing';
  static const String done = 'done';
  static const String failed = 'failed';
  static const String failedConflict = 'failed_conflict';
}

@Collection()
class SyncJob {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String clientId;

  late String feature;
  late String action;

  /// JSON-encoded payload for the API request.
  late String payload;

  @Index()
  late String status;

  String? errorCode;
  String? errorMessage;
  int attemptCount = 0;

  late DateTime createdAt;
  DateTime? nextRetryAt;

  /// Optional: server-assigned order ID resolved after createOrder sync.
  String? resolvedOrderId;
}
