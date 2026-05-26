import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../../../core/utils/formatters.dart';
import '../domain/models/pos_order.dart';
import '../domain/models/pos_config.dart';
import '../presentation/widgets/thermal_printer_settings_dialog.dart';

class ThermalPrinterService {
  ThermalPrinterService._();
  static final instance = ThermalPrinterService._();

  // Settings keys
  static const String _keyType = 'gims_printer_type';
  static const String _keyAddress = 'gims_printer_address';
  static const String _keyName = 'gims_printer_name';
  static const String _keyPaperSize = 'gims_printer_paper_size';

  // Printer configuration state
  String connectionType = 'system'; // 'system' | 'bluetooth'
  String? deviceAddress;
  String? deviceName;
  String paperSize = '58mm'; // '58mm' | '80mm'

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      connectionType = prefs.getString(_keyType) ?? 'system';
      deviceAddress = prefs.getString(_keyAddress);
      deviceName = prefs.getString(_keyName);
      paperSize = prefs.getString(_keyPaperSize) ?? '58mm';
      _initialized = true;
    } catch (_) {}
  }

  Future<void> saveSettings({
    required String type,
    required String? address,
    required String? name,
    required String size,
  }) async {
    connectionType = type;
    deviceAddress = address;
    deviceName = name;
    paperSize = size;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyType, type);
      if (address != null) {
        await prefs.setString(_keyAddress, address);
      } else {
        await prefs.remove(_keyAddress);
      }
      if (name != null) {
        await prefs.setString(_keyName, name);
      } else {
        await prefs.remove(_keyName);
      }
      await prefs.setString(_keyPaperSize, size);
    } catch (_) {}
  }

  /// Lists paired/bonded Bluetooth devices
  Future<List<BluetoothInfo>> getBluetoothDevices() async {
    try {
      final List<BluetoothInfo> list = await PrintBluetoothThermal.pairedBluetooths;
      return list;
    } catch (e) {
      debugPrint('Failed to get bluetooth devices: $e');
      return [];
    }
  }

  /// Generates clean receipt string formatting for thermal rolls
  String generateReceiptText(
    PosOrder order,
    PosConfig? config,
    String outletName, {
    required bool isOffline,
    double? tenderAmount,
    double? changeAmount,
  }) {
    final width = paperSize == '80mm' ? 48 : 32;
    final buffer = StringBuffer();

    String padCenter(String text) {
      if (text.length >= width) return text.substring(0, width);
      final spaces = (width - text.length) ~/ 2;
      return ' ' * spaces + text;
    }

    String row(String left, String right) {
      if (left.length + right.length >= width) {
        final available = width - right.length - 1;
        if (available > 0) {
          return left.substring(0, available) + ' ' + right;
        }
        return left + '\n' + ' ' * (width - right.length) + right;
      }
      final spaces = width - left.length - right.length;
      return left + ' ' * spaces + right;
    }

    // Header
    buffer.writeln(padCenter(outletName));
    buffer.writeln(padCenter('=== RECEIPT ==='));
    buffer.writeln('-' * width);

    // Meta Information
    buffer.writeln(row('No. Order', '#${order.orderNumber}'));
    if (isOffline) {
      buffer.writeln(padCenter('** MODE OFFLINE - ANTRIAN SYNC **'));
    }
    buffer.writeln(row('Tanggal', _formatDate(order.createdAt)));
    buffer.writeln(row('Jam', _formatTime(order.createdAt)));
    if (order.tableLabel != null && order.tableLabel!.isNotEmpty) {
      buffer.writeln(row('Meja', order.tableLabel!));
    }
    if (order.customerName != null && order.customerName!.isNotEmpty) {
      buffer.writeln(row('Pelanggan', order.customerName!));
    }

    buffer.writeln('-' * width);

    // Items Column Header
    if (width == 32) {
      buffer.writeln('Qty Item                Subtotal');
    } else {
      buffer.writeln('Qty  Item                               Subtotal');
    }
    buffer.writeln('-' * width);

    // Items List
    final currency = config?.currency ?? 'IDR';
    for (final item in order.items) {
      final qtyStr = '${item.quantity.toStringAsFixed(0)}x ';
      final subtotalStr = formatMoney(item.subtotal, currency);
      final unitPriceStr = '@ ${formatMoney(item.unitPrice, currency)}';

      final nameAvailableWidth = width - qtyStr.length - subtotalStr.length - 1;
      String nameLine = item.productName;
      if (nameLine.length > nameAvailableWidth) {
        nameLine = nameLine.substring(0, nameAvailableWidth);
      }

      buffer.writeln(row('$qtyStr$nameLine', subtotalStr));
      buffer.writeln('     $unitPriceStr');
      if (item.notes != null && item.notes!.isNotEmpty) {
        buffer.writeln('     * ${item.notes}');
      }
    }

    buffer.writeln('-' * width);

    // Summary calculation
    buffer.writeln(row('Subtotal', formatMoney(order.subtotal, currency)));
    if (order.discountAmount > 0) {
      buffer.writeln(row('Diskon', '- ${formatMoney(order.discountAmount, currency)}'));
    }
    if (order.taxAmount > 0) {
      buffer.writeln(row('Pajak', formatMoney(order.taxAmount, currency)));
    }
    if (order.serviceCharge > 0) {
      buffer.writeln(row('Service', formatMoney(order.serviceCharge, currency)));
    }

    buffer.writeln('=' * width);
    buffer.writeln(row('TOTAL', formatMoney(order.totalAmount, currency)));
    buffer.writeln('-' * width);

    // Payment details
    final paymentMethod = (order.status == PosOrderStatus.completed || order.status == PosOrderStatus.paid || order.status == PosOrderStatus.served) ? 'CASH' : 'CASH (OFFLINE)';
    buffer.writeln(row('Pembayaran', paymentMethod));
    
    // Tender and change details
    if (tenderAmount != null && tenderAmount > 0) {
      buffer.writeln(row('Diterima', formatMoney(tenderAmount, currency)));
      final change = changeAmount ?? (tenderAmount - order.totalAmount);
      buffer.writeln(row('Kembalian', formatMoney(change < 0 ? 0 : change, currency)));
    }

    buffer.writeln('-' * width);

    // Footer
    final footer = config?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!';
    for (final line in footer.split('\n')) {
      if (line.trim().isNotEmpty) {
        buffer.writeln(padCenter(line.trim()));
      }
    }

    if (isOffline) {
      buffer.writeln('');
      buffer.writeln(padCenter('* KONEKSI INTERNET OFFLINE *'));
      buffer.writeln(padCenter('Beberapa informasi loyalty/'));
      buffer.writeln(padCenter('feedback dinonaktifkan.'));
    }

    buffer.writeln('\n\n\n\n'); // Spacing to feed past cutter
    return buffer.toString();
  }

  /// Print receipt based on selected printer type
  Future<bool> printReceipt(
    BuildContext context,
    PosOrder order,
    PosConfig? config,
    String outletName, {
    bool isOffline = false,
    double? tenderAmount,
    double? changeAmount,
  }) async {
    await init();



    if (connectionType == 'system') {
      try {
        final isLocalOrder = order.id.startsWith('local-');
        if (!isLocalOrder) {
          try {
            final response = await ApiClient.instance.get<String>(
              '/pos/orders/${order.id}/receipt',
              options: Options(responseType: ResponseType.plain),
            ).timeout(const Duration(seconds: 5));
            final htmlContent = response.data;
            if (htmlContent != null && htmlContent.isNotEmpty) {
              final format = paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57;
              final pdfBytes = await Printing.convertHtml(
                html: htmlContent,
                format: format,
              );
              await Printing.layoutPdf(
                onLayout: (PdfPageFormat _) async => pdfBytes,
                format: format,
                name: 'Receipt_${order.orderNumber}',
              );
              return true;
            }
          } catch (htmlError) {
            debugPrint('Online HTML print failed, falling back to local PDF: $htmlError');
          }
        }

        final doc = await _generatePdfDocument(
          order,
          config,
          outletName,
          isOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
        );
        final format = paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57;
        await _printOrSharePdf(doc, format, 'Receipt_${order.orderNumber}');
        return true;
      } catch (e) {
        debugPrint('System print error: $e');
        return false;
      }
    }

    if (connectionType == 'bluetooth') {
      final address = deviceAddress;
      if (address == null || address.isEmpty) {
        if (context.mounted) {
          ThermalPrinterSettingsDialog.show(context);
        }
        return false;
      }

      try {
        final isConnected = await PrintBluetoothThermal.connectionStatus;
        if (!isConnected) {
          final connectRes = await PrintBluetoothThermal.connect(macPrinterAddress: address);
          if (!connectRes) {
            if (context.mounted) {
              ThermalPrinterSettingsDialog.show(context);
            }
            return false;
          }
        }

        // Send ESC/POS commands
        final text = generateReceiptText(
          order,
          config,
          outletName,
          isOffline: isOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
        );
        
        // Basic ESC/POS command array
        final List<int> bytes = [];
        // ESC @ (Initialize)
        bytes.addAll([0x1B, 0x40]);
        // Raw text bytes
        bytes.addAll(utf8.encode(text));
        // Cut paper command (GS V 66 0)
        bytes.addAll([0x1D, 0x56, 0x42, 0x00]);

        final printRes = await PrintBluetoothThermal.writeBytes(bytes);
        return printRes;
      } catch (e) {
        debugPrint('Bluetooth print error: $e');
        return false;
      }
    }

    return false;
  }

  /// Print test page to check printer connection
  Future<bool> printTestPage(BuildContext context) async {
    await init();


    if (connectionType == 'system') {
      try {
        final doc = pw.Document();
        doc.addPage(
          pw.Page(
            pageFormat: paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57,
            build: (pw.Context context) {
              return pw.Container(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text('TEST PAGE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                    pw.SizedBox(height: 5),
                    pw.Text('Printer: System Print'),
                    pw.Text('Paper Size: $paperSize'),
                    pw.Text('Status: Working correctly!'),
                    pw.Divider(borderStyle: pw.BorderStyle.dashed),
                    pw.Text('GIMS POS - Gilabs Studio', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              );
            },
          ),
        );
        final format = paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57;
        await _printOrSharePdf(doc, format, 'Test_Print');
        return true;
      } catch (e) {
        debugPrint('System print test error: $e');
        return false;
      }
    }

    if (connectionType == 'bluetooth') {
      final address = deviceAddress;
      if (address == null || address.isEmpty) {
        return false;
      }
      try {
        final isConnected = await PrintBluetoothThermal.connectionStatus;
        if (!isConnected) {
          final connectRes = await PrintBluetoothThermal.connect(macPrinterAddress: address);
          if (!connectRes) return false;
        }

        final List<int> bytes = [];
        bytes.addAll([0x1B, 0x40]); // Init
        bytes.addAll(utf8.encode(
          'TEST PAGE\n'
          'Printer: $deviceName\n'
          'Address: $deviceAddress\n'
          'Paper Size: $paperSize\n'
          'Status: OK\n'
          '${'-' * (paperSize == '80mm' ? 48 : 32)}\n'
          'GIMS POS by Gilabs Studio\n\n\n\n'
        ));
        bytes.addAll([0x1D, 0x56, 0x42, 0x00]); // Cut
        return await PrintBluetoothThermal.writeBytes(bytes);
      } catch (e) {
        debugPrint('Bluetooth print test error: $e');
        return false;
      }
    }

    return false;
  }

  /// Prints a PDF document using the native OS print dialog when available
  /// (iOS, macOS, Windows, Linux), or falls back to [Printing.sharePdf] on
  /// Android where [Printing.layoutPdf] triggers a MissingPluginException.
  Future<void> _printOrSharePdf(
    pw.Document doc,
    PdfPageFormat format,
    String name,
  ) async {
    final bytes = await doc.save();
    
    // On desktop platforms, always use layoutPdf because sharePdf is not supported
    final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS);
    if (isDesktop) {
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat _) async => bytes,
        format: format,
        name: name,
      );
      return;
    }

    try {
      final info = await Printing.info();
      if (info.canPrint) {
        await Printing.layoutPdf(
          onLayout: (PdfPageFormat _) async => bytes,
          format: format,
          name: name,
        );
      } else {
        await Printing.sharePdf(bytes: bytes, filename: '$name.pdf');
      }
    } catch (_) {
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat _) async => bytes,
        format: format,
        name: name,
      );
    }
  }

  /// Helper to generate PDF document for native system printing
  Future<pw.Document> _generatePdfDocument(
    PosOrder order,
    PosConfig? config,
    String outletName,
    bool isOffline, {
    double? tenderAmount,
    double? changeAmount,
  }) async {
    final doc = pw.Document();
    final currency = config?.currency ?? 'IDR';

    doc.addPage(
      pw.Page(
        pageFormat: paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57,
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 2, vertical: 4),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Text(outletName, textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13)),
                pw.Text('=== RECEIPT ===', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                pw.SizedBox(height: 4),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('No. Order', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
                    pw.Text('#${order.orderNumber}', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
                  ],
                ),
                if (isOffline) ...[
                  pw.SizedBox(height: 2),
                  pw.Text('** MODE OFFLINE - ANTRIAN SYNC **', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 8, color: PdfColors.orange700, fontWeight: pw.FontWeight.bold)),
                ],
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Tanggal/Jam', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('${_formatDate(order.createdAt)} ${_formatTime(order.createdAt)}', style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
                if (order.tableLabel != null && order.tableLabel!.isNotEmpty)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Meja', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(order.tableLabel!, style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                if (order.customerName != null && order.customerName!.isNotEmpty)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Pelanggan', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(order.customerName!, style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),

                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                // Items list
                ...order.items.map((item) {
                  return pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Expanded(
                              child: pw.Text(
                                '${item.quantity.toStringAsFixed(0)}x ${item.productName}',
                                style: const pw.TextStyle(fontSize: 9),
                              ),
                            ),
                            pw.SizedBox(width: 8),
                            pw.Text(formatMoney(item.subtotal, currency), style: const pw.TextStyle(fontSize: 9)),
                          ],
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(left: 12),
                          child: pw.Text('@ ${formatMoney(item.unitPrice, currency)}', style: pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                        ),
                        if (item.notes != null && item.notes!.isNotEmpty)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 12),
                            child: pw.Text('* ${item.notes!}', style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: PdfColors.grey700)),
                          ),
                      ],
                    ),
                  );
                }),

                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Subtotal', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text(formatMoney(order.subtotal, currency), style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
                if (order.discountAmount > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Diskon', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text('- ${formatMoney(order.discountAmount, currency)}', style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                if (order.taxAmount > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Pajak', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(formatMoney(order.taxAmount, currency), style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                if (order.serviceCharge > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Service', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(formatMoney(order.serviceCharge, currency), style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),

                pw.Divider(borderStyle: pw.BorderStyle.solid),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('TOTAL', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                    pw.Text(formatMoney(order.totalAmount, currency), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  ],
                ),

                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Pembayaran', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text((order.status == PosOrderStatus.completed || order.status == PosOrderStatus.paid || order.status == PosOrderStatus.served) ? 'CASH' : 'CASH (OFFLINE)', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                  ],
                ),
                if (tenderAmount != null && tenderAmount > 0) ...[
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Diterima', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(formatMoney(tenderAmount, currency), style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Kembalian', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                      pw.Text(
                        formatMoney(
                          (changeAmount ?? (tenderAmount - order.totalAmount)) < 0 
                            ? 0 
                            : (changeAmount ?? (tenderAmount - order.totalAmount)), 
                          currency
                        ),
                        style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)
                      ),
                    ],
                  ),
                ],

                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                pw.SizedBox(height: 4),

                pw.Text(
                  config?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!',
                  textAlign: pw.TextAlign.center,
                  style: const pw.TextStyle(fontSize: 8),
                ),

                if (isOffline) ...[
                  pw.SizedBox(height: 6),
                  pw.Text('* KONEKSI INTERNET OFFLINE *', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 7, fontWeight: pw.FontWeight.bold)),
                  pw.Text('Beberapa informasi loyalty/feedback dinonaktifkan.', textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 7)),
                ],
              ],
            ),
          );
        },
      ),
    );

    return doc;
  }



  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}
