import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;

import '../domain/models/pos_order.dart';
import 'receipt_layout.dart';

class EscPosReceiptRenderer {
  final int widthChars; // 32 = 58mm, 48 = 80mm

  EscPosReceiptRenderer({
    required this.widthChars,
  });

  List<int> generate(
    PosOrder order, {
    required String outletName,
    String? footer,
    bool isOffline = false,
    double? tenderAmount,
    double? changeAmount,
    String? feedbackQrText,
    String currency = 'IDR',
  }) {
    final List<int> bytes = [];
    final enc = utf8;

    final lines = ReceiptLayout.buildLines(
      order: order,
      config: null,
      footer: footer,
      currency: currency,
      outletName: outletName,
      widthChars: widthChars,
      isOffline: isOffline,
      tenderAmount: tenderAmount,
      changeAmount: changeAmount,
    );

    /// INIT PRINTER
    bytes.addAll([0x1B, 0x40]);
    bytes.addAll([0x1B, 0x33, 0x23]); // slightly larger line spacing

    /// TEXT RECEIPT
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      final trimmed = line.trim();

      final isTitle = i == 0;
      final isReceiptHeading = trimmed == '=== RECEIPT ===';
      final isQtyHeader = trimmed == 'Qty Item';
      final isTotalLine = trimmed.startsWith('TOTAL');
      final isFeedbackTitle = trimmed == 'Nilai Pelayanan Kami';

      if (isTitle) {
        bytes.addAll(
          _textStyleCommand(
            bold: true,
            doubleHeight: true,
          ),
        );
      } else if (isReceiptHeading ||
          isQtyHeader ||
          isTotalLine ||
          isFeedbackTitle) {
        bytes.addAll(
          _textStyleCommand(
            bold: true,
          ),
        );
      } else {
        bytes.addAll(_textStyleCommand());
      }

      bytes.addAll(enc.encode(line));
      bytes.addAll(enc.encode('\n'));
    }

    /// RESET STYLE
    bytes.addAll(_textStyleCommand());

    /// QR SECTION
    if (feedbackQrText != null && feedbackQrText.isNotEmpty) {
      bytes.addAll(
        _centerLine(
          enc,
          widthChars,
          'Nilai Pelayanan Kami',
          bold: true,
        ),
      );

      bytes.addAll(
        _centerLine(
          enc,
          widthChars,
          'Scan QR untuk memberikan feedback',
        ),
      );

      final nativeQr = _nativeQrCodeBytes(feedbackQrText);

      if (nativeQr.isNotEmpty) {
        /// CENTER
        bytes.addAll([0x1B, 0x61, 0x01]);

        /// PRINT QR
        bytes.addAll(nativeQr);

        /// BACK TO LEFT
        bytes.addAll([0x1B, 0x61, 0x00]);

        /// SMALL SPACE AFTER QR
        // bytes.addAll(enc.encode('\n'));
        // bytes.addAll(enc.encode('\n'));

        debugPrint(
          'EscPosRenderer: printed native QR (${nativeQr.length} bytes)',
        );
      }
    }

    /// SMALL FEED BEFORE CUT
    bytes.addAll([0x1B, 0x64, 0x03]);

    /// CUT PAPER
    bytes.addAll([0x1D, 0x56, 0x42, 0x00]);

    return bytes;
  }

  /// =========================================================
  /// CENTER TEXT
  /// =========================================================

  List<int> _centerLine(
    Encoding enc,
    int widthChars,
    String text, {
    bool bold = false,
  }) {
    final centered = _centerText(text, widthChars);

    final bytes = <int>[];

    bytes.addAll(
      _textStyleCommand(
        bold: bold,
      ),
    );

    bytes.addAll(enc.encode(centered));
    bytes.addAll(enc.encode('\n'));

    return bytes;
  }

  /// =========================================================
  /// TEXT STYLE
  /// =========================================================

  List<int> _textStyleCommand({
    bool bold = false,
    bool doubleHeight = false,
  }) {
    final bytes = <int>[];

    /// BOLD
    bytes.addAll([
      0x1B,
      0x45,
      bold ? 0x01 : 0x00,
    ]);

    /// DOUBLE HEIGHT
    bytes.addAll([
      0x1D,
      0x21,
      doubleHeight ? 0x10 : 0x00,
    ]);

    return bytes;
  }

  /// =========================================================
  /// CENTER STRING
  /// =========================================================

  String _centerText(
    String text,
    int widthChars,
  ) {
    if (text.length >= widthChars) {
      return text.substring(0, widthChars);
    }

    final leftPad = ((widthChars - text.length) / 2).floor();

    return ' ' * leftPad + text;
  }

  /// =========================================================
  /// NATIVE ESC/POS QR CODE
  /// =========================================================

  List<int> _nativeQrCodeBytes(String text) {
    final bytes = <int>[];

    const header = [
      0x1D,
      0x28,
      0x6B,
    ];

    final textBytes = latin1.encode(text);

    /// 58mm = 4
    /// 80mm = 6
    final size = widthChars == 48 ? 6 : 4;

    /// SELECT MODEL
    bytes.addAll(header);
    bytes.addAll([
      0x04,
      0x00,
      0x31,
      0x41,
      0x32,
      0x00,
    ]);

    /// MODULE SIZE
    bytes.addAll(header);
    bytes.addAll([
      0x03,
      0x00,
      0x31,
      0x43,
      size,
    ]);

    /// ERROR CORRECTION LEVEL
    /// 48 = L
    /// 49 = M
    /// 50 = Q
    /// 51 = H
    bytes.addAll(header);
    bytes.addAll([
      0x03,
      0x00,
      0x31,
      0x45,
      0x31,
    ]);

    /// STORE DATA
    final storeLen = textBytes.length + 3;

    bytes.addAll(header);
    bytes.addAll([
      storeLen & 0xFF,
      (storeLen >> 8) & 0xFF,
      0x31,
      0x50,
      0x30,
    ]);

    bytes.addAll(textBytes);

    /// PRINT QR
    bytes.addAll(header);
    bytes.addAll([
      0x03,
      0x00,
      0x31,
      0x51,
      0x30,
    ]);

    return bytes;
  }
}