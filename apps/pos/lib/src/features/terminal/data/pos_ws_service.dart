import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/network/api_client.dart';
import 'pos_ws_channel.dart';

enum PosWsConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

/// POS WebSocket event from the server.
class PosWsEvent {
  final String event;
  final Map<String, dynamic> data;
  final String? outletId;
  final String? tenantId;

  const PosWsEvent({
    required this.event,
    required this.data,
    this.outletId,
    this.tenantId,
  });

  Map<String, dynamic> get payload => data;

  factory PosWsEvent.fromJson(Map<String, dynamic> json) => PosWsEvent(
    event: json['event'] as String? ?? json['type'] as String? ?? '',
    data: _mapValue(json['data']) ?? _mapValue(json['payload']) ?? {},
    outletId: json['outlet_id'] as String?,
    tenantId: json['tenant_id'] as String?,
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
  PosWsService({required this.outletId, this.onAuthRejected});

  final String outletId;
  final void Function(Object error)? onAuthRejected;

  final _controller = StreamController<PosWsEvent>.broadcast();
  final _stateController = StreamController<PosWsConnectionState>.broadcast();
  Stream<PosWsEvent> get events => _controller.stream;
  Stream<PosWsConnectionState> get connectionState$ => _stateController.stream;

  WebSocketChannel? _channel;
  Timer? _reconnectTimer;
  int _attempt = 0;
  bool _disposed = false;
  PosWsConnectionState _connectionState = PosWsConnectionState.disconnected;

  PosWsConnectionState get connectionState => _connectionState;

  /// Builds the WebSocket URL from the API origin (http→ws).
  String get _wsUrl {
    final origin = ApiClient.instance.apiOrigin.replaceFirst(
      RegExp(r'^http'),
      'ws',
    );
    return '$origin/api/v1/pos/ws?outlet_id=$outletId';
  }

  /// Opens the WebSocket connection. Reconnects on error with exponential back-off.
  Future<void> connect() async {
    if (_disposed) return;
    try {
      _emitConnectionState(
        _attempt == 0
            ? PosWsConnectionState.connecting
            : PosWsConnectionState.reconnecting,
      );
      _reconnectTimer?.cancel();
      _channel?.sink.close();
      final cookie = ApiClient.instance.cookieHeader;
      _channel = createPosWsChannel(
        _wsUrl,
        headers: cookie == null ? null : {'Cookie': cookie},
      );
      await _channel!.ready;
      _attempt = 0;
      _emitConnectionState(PosWsConnectionState.connected);

      _channel!.stream.listen(
        (data) {
          if (_disposed) return;
          try {
            final json = _decodeFrame(data);
            if (json == null) {
              return;
            }
            final event = PosWsEvent.fromJson(json);
            _controller.add(event);
          } catch (e) {
            // ignore malformed frames
          }
        },
        onDone: () {
          _scheduleReconnect();
        },
        onError: (e) {
          _scheduleReconnect();
        },
        cancelOnError: false,
      );
    } catch (error) {
      final text = error.toString();
      if (text.contains('401') || text.contains('403')) {
        _emitConnectionState(PosWsConnectionState.disconnected);
        onAuthRejected?.call(error);
        dispose();
        return;
      }
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _emitConnectionState(PosWsConnectionState.reconnecting);
    _reconnectTimer?.cancel();
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
    _emitConnectionState(PosWsConnectionState.disconnected);
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _controller.close();
    _stateController.close();
  }

  void _emitConnectionState(PosWsConnectionState state) {
    if (_connectionState == state) return;
    _connectionState = state;
    if (!_stateController.isClosed) {
      _stateController.add(state);
    }
  }
}

Map<String, dynamic>? _decodeFrame(Object? data) {
  if (data is Map<String, dynamic>) {
    return data;
  }
  if (data is Map) {
    return data.map((key, value) => MapEntry('$key', value));
  }

  String? raw;
  if (data is String) {
    raw = data;
  } else if (data is Uint8List) {
    raw = utf8.decode(data);
  } else if (data is List<int>) {
    raw = utf8.decode(data);
  }

  if (raw == null || raw.isEmpty) {
    return null;
  }
  
  final decoded = jsonDecode(raw);
  if (decoded is Map<String, dynamic>) {
    return decoded;
  }
  if (decoded is Map) {
    return decoded.map((key, value) => MapEntry('$key', value));
  }
  return null;
}

Map<String, dynamic>? _mapValue(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry('$key', item));
  }
  return null;
}
