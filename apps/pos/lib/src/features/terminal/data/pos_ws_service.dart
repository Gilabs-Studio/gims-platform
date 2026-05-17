import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/network/api_client.dart';

/// POS WebSocket event from the server.
class PosWsEvent {
  final String event;
  final Map<String, dynamic> payload;

  const PosWsEvent({required this.event, required this.payload});

  factory PosWsEvent.fromJson(Map<String, dynamic> json) => PosWsEvent(
        event: json['event'] as String? ?? '',
        payload: json['payload'] as Map<String, dynamic>? ?? {},
      );
}

/// Connects to the POS staff WebSocket for a given outlet.
///
/// Usage:
/// ```dart
/// final service = PosWsService(outletId: 'uuid');
/// service.events.listen((e) { ... });
/// await service.connect();
/// // On dispose:
/// service.dispose();
/// ```
class PosWsService {
  PosWsService({required this.outletId});

  final String outletId;

  final _controller = StreamController<PosWsEvent>.broadcast();
  Stream<PosWsEvent> get events => _controller.stream;

  WebSocketChannel? _channel;
  Timer? _reconnectTimer;
  int _attempt = 0;
  bool _disposed = false;

  /// Builds the WebSocket URL from the API origin (http→ws).
  String get _wsUrl {
    final origin = ApiClient.instance.apiOrigin
        .replaceFirst(RegExp(r'^http'), 'ws');
    return '$origin/api/v1/pos/ws?outlet_id=$outletId';
  }

  /// Opens the WebSocket connection. Reconnects on error with exponential back-off.
  Future<void> connect() async {
    if (_disposed) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_wsUrl));
      await _channel!.ready;
      _attempt = 0;

      _channel!.stream.listen(
        (data) {
          if (_disposed) return;
          try {
            final json = jsonDecode(data as String) as Map<String, dynamic>;
            _controller.add(PosWsEvent.fromJson(json));
          } catch (_) {
            // ignore malformed frames
          }
        },
        onDone: _scheduleReconnect,
        onError: (_) => _scheduleReconnect(),
        cancelOnError: false,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    final delay = Duration(
      milliseconds: (_attempt < 6)
          ? (1000 * (1 << _attempt)).clamp(1000, 30000)
          : 30000,
    );
    _attempt++;
    _reconnectTimer = Timer(delay, connect);
  }

  /// Closes the connection and cancels reconnect timers.
  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _controller.close();
  }
}
