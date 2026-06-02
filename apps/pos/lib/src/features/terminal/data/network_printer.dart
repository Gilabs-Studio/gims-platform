import 'dart:io';

Future<bool> sendRawToNetworkPrinter(String host, int port, List<int> bytes, {Duration timeout = const Duration(seconds: 5)}) async {
  try {
    final socket = await Socket.connect(host, port, timeout: timeout);
    socket.add(bytes);
    await socket.flush();
    await socket.close();
    return true;
  } catch (e) {
    // ignore and return false
    return false;
  }
}
