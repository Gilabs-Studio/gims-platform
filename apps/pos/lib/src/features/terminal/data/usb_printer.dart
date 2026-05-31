import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';

class UsbPrinter {
  static const MethodChannel _channel = MethodChannel('gims_pos/usb_printer');

  /// Send raw bytes (List<int>) to USB printer on Android via platform channel.
  /// vendorId/productId optional to select device, or deviceName substring.
  static Future<bool> printRaw(List<int> bytes, {int? vendorId, int? productId, String? deviceName}) async {
    try {
      final b64 = base64Encode(bytes);
      final res = await _channel.invokeMethod<bool>('printRaw', {
        'bytes': b64,
        'vendorId': vendorId,
        'productId': productId,
        'deviceName': deviceName,
      });
      return res == true;
    } on PlatformException {
      return false;
    }
  }
}
