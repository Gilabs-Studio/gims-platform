import 'package:web_socket_channel/web_socket_channel.dart';

import 'pos_ws_channel_io.dart'
    if (dart.library.html) 'pos_ws_channel_web.dart';

WebSocketChannel createPosWsChannel(
  String url, {
  Map<String, dynamic>? headers,
}) {
  return createPosWsChannelImpl(url, headers: headers);
}
