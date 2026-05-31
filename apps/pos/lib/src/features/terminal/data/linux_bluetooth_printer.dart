import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';

class LinuxBluetoothPrinter {
  static const MethodChannel _channel = MethodChannel('gims_pos/linux_bluetooth');

  /// Sends raw bytes (ESC/POS) to a Bluetooth device on Linux via native plugin.
  /// address: Bluetooth MAC string (e.g. 'AA:BB:CC:DD:EE:FF')
  /// channel: RFCOMM channel (default 1)
  static Future<bool> printRaw(List<int> bytes, {required String address, int channel = 1}) async {
    try {
      final b64 = base64Encode(bytes);
      final res = await _channel.invokeMethod<bool>('printRaw', {
        'bytes': b64,
        'address': address,
        'channel': channel,
      });
      return res == true;
    } on PlatformException {
      return false;
    }
  }
}
