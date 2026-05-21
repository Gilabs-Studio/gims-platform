/// Typed exception for API errors with optional error code and HTTP status.
class ApiException implements Exception {
  ApiException(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  /// True when the request never reached the server (network unreachable,
  /// connection timeout, etc.). Callers can use this to silently degrade
  /// instead of surfacing a technical error to the user.
  bool get isOffline => statusCode == null;

  @override
  String toString() => message;
}
