import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:dio/dio.dart';

import 'escpos_renderer.dart';
import 'network_printer.dart';
import 'linux_usb_printer.dart';
import 'usb_printer.dart';
import 'linux_bluetooth_printer.dart';
import 'receipt_layout.dart';

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
    final normalizedAddress = type == 'system' ? null : address;
    final normalizedName = type == 'system' ? null : name;

    connectionType = type;
    deviceAddress = normalizedAddress;
    deviceName = normalizedName;
    paperSize = size;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyType, type);
      if (normalizedAddress != null) {
        await prefs.setString(_keyAddress, normalizedAddress);
      } else {
        await prefs.remove(_keyAddress);
      }
      if (normalizedName != null) {
        await prefs.setString(_keyName, normalizedName);
      } else {
        await prefs.remove(_keyName);
      }
      await prefs.setString(_keyPaperSize, size);
    } catch (_) {}
  }

  /// Lists paired/bonded Bluetooth devices
  Future<List<BluetoothInfo>> getBluetoothDevices() async {
    try {
      final List<BluetoothInfo> list =
          await PrintBluetoothThermal.pairedBluetooths;
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
    final lines = ReceiptLayout.buildLines(
      order: order,
      config: config,
      outletName: outletName,
      widthChars: width,
      isOffline: isOffline,
      tenderAmount: tenderAmount,
      changeAmount: changeAmount,
    );
    return '${lines.join('\n')}\n\n\n\n';
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

    final bool isDesktop =
        !kIsWeb && (Platform.isLinux || Platform.isWindows || Platform.isMacOS);

    // Allow overriding `system` route when a deviceAddress is configured
    // and looks like a network host or bluetooth MAC. This helps when the
    // operator saved a raw printer address but left the type as `system`.
    String type = connectionType;
    final addrProbe = deviceAddress ?? '';
    if (type == 'system' && addrProbe.isNotEmpty) {
      // host:port or ip.address -> treat as network (helps users who set
      // a raw printer address but left the type as `system`)
      final looksLikeIp =
          addrProbe.contains('.') ||
          (addrProbe.contains(':') &&
              addrProbe.split(':').length == 2 &&
              int.tryParse(addrProbe.split(':').last) != null);
      if (looksLikeIp) {
        type = 'network';
      }
    }

    if (type == 'system') {
      try {
        if (Platform.isLinux) {
          final isLocalOrder = order.id.startsWith('local-');
          bool isTrulyOffline = isOffline;

          if (!isLocalOrder) {
            try {
              await ApiClient.instance
                  .get<String>(
                    '/pos/orders/${order.id}/receipt',
                    options: Options(responseType: ResponseType.plain),
                  )
                  .timeout(const Duration(seconds: 5));
              isTrulyOffline = false;
            } catch (htmlError) {
              if (htmlError is DioException) {
                final type = htmlError.type;
                if (type == DioExceptionType.connectionTimeout ||
                    type == DioExceptionType.sendTimeout ||
                    type == DioExceptionType.receiveTimeout ||
                    type == DioExceptionType.connectionError ||
                    (htmlError.error != null &&
                        htmlError.error.toString().contains(
                          'SocketException',
                        ))) {
                  isTrulyOffline = true;
                }
              }
            }
          }

          final renderer = EscPosReceiptRenderer(
            widthChars: paperSize == '80mm' ? 48 : 32,
          );
          String? qrText;
          if (!isTrulyOffline && !isLocalOrder) {
            try {
              final resp = await ApiClient.instance
                  .get<String>(
                    '/pos/orders/${order.id}/receipt',
                    options: Options(responseType: ResponseType.plain),
                  )
                  .timeout(const Duration(seconds: 3));
              final html = resp.data ?? '';
              qrText = _extractFeedbackUrlFromHtml(html);
              if (qrText != null) {
                debugPrint(
                  'ThermalPrinterService: extracted feedback QR text: $qrText',
                );
              }
            } catch (_) {}
          }

          final bytes = renderer.generate(
            order,
            outletName: outletName,
            footer: config?.receiptFooter,
            feedbackQrText: qrText,
            currency: config?.currency ?? 'IDR',
          );

          final printerIdentifier = (deviceAddress?.trim().isNotEmpty == true)
              ? deviceAddress!.trim()
              : deviceName?.trim();

          final ok = await sendRawToLinuxUsbPrinter(
            bytes,
            printerName: printerIdentifier,
          );
          debugPrint(
            'Thermal print (system->linux-raw) -> printer=$printerIdentifier bytes=${bytes.length} ok=$ok',
          );
          if (!ok &&
              (printerIdentifier == null || printerIdentifier.isEmpty) &&
              context.mounted) {
            ThermalPrinterSettingsDialog.show(context);
          }
          return ok;
        }

        final isLocalOrder = order.id.startsWith('local-');
        bool isTrulyOffline = isOffline;

        if (!isLocalOrder) {
          try {
            final response = await ApiClient.instance
                .get<String>(
                  '/pos/orders/${order.id}/receipt',
                  options: Options(responseType: ResponseType.plain),
                )
                .timeout(const Duration(seconds: 5));

            isTrulyOffline = false;

            final htmlContent = response.data;
            if (htmlContent != null && htmlContent.isNotEmpty) {
              try {
                final format = paperSize == '80mm'
                    ? PdfPageFormat.roll80
                    : PdfPageFormat.roll57;
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
              } catch (_) {
                // fallthrough to local PDF generation
              }
            }
          } catch (htmlError) {
            debugPrint(
              'Online HTML print failed, falling back to local PDF: $htmlError',
            );
            if (htmlError is DioException) {
              final type = htmlError.type;
              if (type == DioExceptionType.connectionTimeout ||
                  type == DioExceptionType.sendTimeout ||
                  type == DioExceptionType.receiveTimeout ||
                  type == DioExceptionType.connectionError ||
                  (htmlError.error != null &&
                      htmlError.error.toString().contains('SocketException'))) {
                isTrulyOffline = true;
              }
            }
          }
        }

        final doc = await _generatePdfDocument(
          order,
          config,
          outletName,
          isTrulyOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
        );
        final format = paperSize == '80mm'
            ? PdfPageFormat.roll80
            : PdfPageFormat.roll57;
        await _printOrSharePdf(doc, format, 'Receipt_${order.orderNumber}');
        return true;
      } catch (e) {
        debugPrint('System print error: $e');
        return false;
      }
    }
    if (type == 'bluetooth') {
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
          final connectRes = await PrintBluetoothThermal.connect(
            macPrinterAddress: address,
          );
          if (!connectRes) {
            if (context.mounted) {
              ThermalPrinterSettingsDialog.show(context);
            }
            return false;
          }
        }

        final isLocalOrder = order.id.startsWith('local-');
        bool isTrulyOffline = isOffline;
        if (!isLocalOrder) {
          try {
            await ApiClient.instance
                .get<String>(
                  '/pos/orders/${order.id}/receipt',
                  options: Options(responseType: ResponseType.plain),
                )
                .timeout(const Duration(seconds: 3));
            isTrulyOffline = false;
          } catch (htmlError) {
            if (htmlError is DioException) {
              final type = htmlError.type;
              if (type == DioExceptionType.connectionTimeout ||
                  type == DioExceptionType.sendTimeout ||
                  type == DioExceptionType.receiveTimeout ||
                  type == DioExceptionType.connectionError ||
                  (htmlError.error != null &&
                      htmlError.error.toString().contains('SocketException'))) {
                isTrulyOffline = true;
              }
            }
          }
        }

        // Try to fetch HTML receipt to extract embedded QR (if any)
        String? qrText;
        if (!isTrulyOffline) {
          try {
            final resp = await ApiClient.instance
                .get<String>(
                  '/pos/orders/${order.id}/receipt',
                  options: Options(responseType: ResponseType.plain),
                )
                .timeout(const Duration(seconds: 3));
            final html = resp.data ?? '';
            qrText = _extractFeedbackUrlFromHtml(html);
          } catch (_) {}
        }

        // Build ESC/POS bytes via renderer
        final renderer = EscPosReceiptRenderer(
          widthChars: paperSize == '80mm' ? 48 : 32,
        );
        final bytes = renderer.generate(
          order,
          outletName: outletName,
          footer: config?.receiptFooter,
          isOffline: isOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
          feedbackQrText: qrText,
          currency: config?.currency ?? 'IDR',
        );
        debugPrint(
          'Thermal print (bluetooth) -> address=$address bytes=${bytes.length}',
        );

        // Desktop native bluetooth integration is not implemented here.
        // For mobile use the plugin; on desktop show settings to instruct
        // the operator to configure a network/driver-backed printer.
        if (isDesktop) {
          if (context.mounted) ThermalPrinterSettingsDialog.show(context);
          return false;
        }

        // On Linux, use native RFCOMM plugin (agentless) if available
        if (Platform.isLinux) {
          try {
            final addr = address; // from earlier
            if (addr.isEmpty) {
              if (context.mounted) ThermalPrinterSettingsDialog.show(context);
              return false;
            }
            final ok = await LinuxBluetoothPrinter.printRaw(
              bytes,
              address: addr,
              channel: 1,
            );
            return ok;
          } catch (_) {
            return false;
          }
        }

        final printRes = await PrintBluetoothThermal.writeBytes(bytes);
        return printRes;
      } catch (e) {
        debugPrint('Bluetooth print error: $e');
        return false;
      }
    }

    if (type == 'network') {
      final address = deviceAddress;
      if (address == null || address.isEmpty) {
        if (context.mounted) ThermalPrinterSettingsDialog.show(context);
        return false;
      }

      // parse host:port
      var host = address;
      var port = 9100;
      if (address.contains(':')) {
        final parts = address.split(':');
        host = parts[0];
        try {
          port = int.parse(parts[1]);
        } catch (_) {}
      }

      try {
        bool isTrulyOffline = isOffline;
        String? qrText;
        if (!order.id.startsWith('local-')) {
          try {
            final resp = await ApiClient.instance
                .get<String>(
                  '/pos/orders/${order.id}/receipt',
                  options: Options(responseType: ResponseType.plain),
                )
                .timeout(const Duration(seconds: 3));
            final html = resp.data ?? '';
            qrText = _extractFeedbackUrlFromHtml(html);
          } catch (_) {}
        }

        final renderer = EscPosReceiptRenderer(
          widthChars: paperSize == '80mm' ? 48 : 32,
        );
        final bytes = renderer.generate(
          order,
          outletName: outletName,
          footer: config?.receiptFooter,
          isOffline: isTrulyOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
          feedbackQrText: qrText,
          currency: config?.currency ?? 'IDR',
        );
        debugPrint(
          'Thermal print (network) -> host=$host port=$port bytes=${bytes.length}',
        );

        final sendRes = await sendRawToNetworkPrinter(host, port, bytes);
        return sendRes;
      } catch (e) {
        debugPrint('Network print error: $e');
        return false;
      }
    }

    if (type == 'usb') {
      try {
        // Try to extract QR as earlier
        String? qrText;
        final isLocalOrder = order.id.startsWith('local-');
        if (!isLocalOrder) {
          try {
            final resp = await ApiClient.instance
                .get<String>(
                  '/pos/orders/${order.id}/receipt',
                  options: Options(responseType: ResponseType.plain),
                )
                .timeout(const Duration(seconds: 3));
            final html = resp.data ?? '';
            qrText = _extractFeedbackUrlFromHtml(html);
          } catch (_) {}
        }

        final renderer = EscPosReceiptRenderer(
          widthChars: paperSize == '80mm' ? 48 : 32,
        );
        final bytes = renderer.generate(
          order,
          outletName: outletName,
          footer: config?.receiptFooter,
          isOffline: isOffline,
          tenderAmount: tenderAmount,
          changeAmount: changeAmount,
          feedbackQrText: qrText,
          currency: config?.currency ?? 'IDR',
        );
        final printerIdentifier = (deviceAddress?.trim().isNotEmpty == true)
            ? deviceAddress!.trim()
            : deviceName?.trim();

        if (Platform.isLinux) {
          final ok = await sendRawToLinuxUsbPrinter(
            bytes,
            printerName: printerIdentifier,
          );
          debugPrint(
            'Thermal print (usb-linux) -> printer=$printerIdentifier bytes=${bytes.length} ok=$ok',
          );
          return ok;
        }

        // Fallback: Android/native path uses platform channel wrapper.
        final address = printerIdentifier;
        String? usbDeviceName = address;
        int? vendorId;
        int? productId;
        if (address != null && address.contains(':')) {
          final parts = address.split(':');
          try {
            vendorId = int.parse(parts[0]);
            productId = int.parse(parts[1]);
          } catch (_) {}
        }

        final ok = await UsbPrinter.printRaw(
          bytes,
          vendorId: vendorId,
          productId: productId,
          deviceName: usbDeviceName,
        );
        return ok;
      } catch (e) {
        debugPrint('USB print error: $e');
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
            pageFormat: paperSize == '80mm'
                ? PdfPageFormat.roll80
                : PdfPageFormat.roll57,
            build: (pw.Context context) {
              return pw.Container(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text(
                      'TEST PAGE',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    pw.SizedBox(height: 5),
                    pw.Text('Printer: System Print'),
                    pw.Text('Paper Size: $paperSize'),
                    pw.Text('Status: Working correctly!'),
                    pw.Divider(borderStyle: pw.BorderStyle.dashed),
                    pw.Text(
                      'GIMS POS - Gilabs Studio',
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                  ],
                ),
              );
            },
          ),
        );
        final format = paperSize == '80mm'
            ? PdfPageFormat.roll80
            : PdfPageFormat.roll57;
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
          final connectRes = await PrintBluetoothThermal.connect(
            macPrinterAddress: address,
          );
          if (!connectRes) return false;
        }

        final List<int> bytes = [];
        bytes.addAll([0x1B, 0x40]); // Init
        bytes.addAll(
          utf8.encode(
            'TEST PAGE\n'
            'Printer: $deviceName\n'
            'Address: $deviceAddress\n'
            'Paper Size: $paperSize\n'
            'Status: OK\n'
            '${'-' * (paperSize == '80mm' ? 48 : 32)}\n'
            'GIMS POS by Gilabs Studio\n\n\n\n',
          ),
        );
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
    final isDesktop =
        !kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS);
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
        pageFormat: paperSize == '80mm'
            ? PdfPageFormat.roll80
            : PdfPageFormat.roll57,
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 2, vertical: 4),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Text(
                  outletName,
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                pw.Text(
                  '=== RECEIPT ===',
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
                ),
                pw.SizedBox(height: 4),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'No. Order',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      '#${order.orderNumber}',
                      style: pw.TextStyle(
                        fontSize: 9,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (isOffline) ...[
                  pw.SizedBox(height: 2),
                  pw.Text(
                    '** MODE OFFLINE - ANTRIAN SYNC **',
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(
                      fontSize: 8,
                      color: PdfColors.orange700,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Tanggal/Jam',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                    pw.Text(
                      '${_formatDate(order.createdAt)} ${_formatTime(order.createdAt)}',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ],
                ),
                if (order.tableLabel != null && order.tableLabel!.isNotEmpty)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Meja', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(
                        order.tableLabel!,
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),
                if (order.customerName != null &&
                    order.customerName!.isNotEmpty)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Pelanggan',
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                      pw.Text(
                        order.customerName!,
                        style: const pw.TextStyle(fontSize: 8),
                      ),
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
                            pw.Text(
                              formatMoney(item.subtotal, currency),
                              style: const pw.TextStyle(fontSize: 9),
                            ),
                          ],
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.only(left: 12),
                          child: pw.Text(
                            '@ ${formatMoney(item.unitPrice, currency)}',
                            style: pw.TextStyle(
                              fontSize: 8,
                              color: PdfColors.grey700,
                            ),
                          ),
                        ),
                        if (item.notes != null && item.notes!.isNotEmpty)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 12),
                            child: pw.Text(
                              '* ${item.notes!}',
                              style: pw.TextStyle(
                                fontSize: 8,
                                fontStyle: pw.FontStyle.italic,
                                color: PdfColors.grey700,
                              ),
                            ),
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
                    pw.Text(
                      formatMoney(order.subtotal, currency),
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ],
                ),
                if (order.discountAmount > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Diskon', style: const pw.TextStyle(fontSize: 8)),
                      pw.Text(
                        '- ${formatMoney(order.discountAmount, currency)}',
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),
                if (order.serviceCharge > 0)
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Service',
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                      pw.Text(
                        formatMoney(order.serviceCharge, currency),
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),

                pw.Divider(borderStyle: pw.BorderStyle.solid),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'TOTAL',
                      style: pw.TextStyle(
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      formatMoney(order.totalAmount, currency),
                      style: pw.TextStyle(
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),

                pw.Divider(borderStyle: pw.BorderStyle.dashed),

                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Pembayaran',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                    pw.Text(
                      (order.status == PosOrderStatus.completed ||
                              order.status == PosOrderStatus.paid ||
                              order.status == PosOrderStatus.served)
                          ? 'CASH'
                          : 'CASH (OFFLINE)',
                      style: pw.TextStyle(
                        fontSize: 8,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (tenderAmount != null && tenderAmount > 0) ...[
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Diterima',
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                      pw.Text(
                        formatMoney(tenderAmount, currency),
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Kembalian',
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        formatMoney(
                          (changeAmount ?? (tenderAmount - order.totalAmount)) <
                                  0
                              ? 0
                              : (changeAmount ??
                                    (tenderAmount - order.totalAmount)),
                          currency,
                        ),
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                        ),
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
                  pw.Text(
                    '* KONEKSI INTERNET OFFLINE *',
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(
                      fontSize: 7,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    'Beberapa informasi loyalty/feedback dinonaktifkan.',
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(fontSize: 7),
                  ),
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

  String? _extractFeedbackUrlFromHtml(String html) {
    try {
      final attrReg = RegExp(
        "data-feedback-url=[\"']([^\"']+)[\"']",
        dotAll: true,
      );
      final attrMatch = attrReg.firstMatch(html);
      final attrUrl = attrMatch?.group(1)?.trim();
      if (attrUrl != null && attrUrl.isNotEmpty) {
        return _unescapeHtmlEntities(attrUrl);
      }

      final reg = RegExp(
        r'<!--\s*FEEDBACK_URL:\s*([^<\s]+)\s*-->',
        dotAll: true,
      );
      final m = reg.firstMatch(html);
      final commentUrl = m?.group(1)?.trim();
      if (commentUrl != null && commentUrl.isNotEmpty) {
        return _unescapeHtmlEntities(commentUrl);
      }

      final genericReg = RegExp(
        "(https?:\\/\\/[^\"'\\s<>]+\\/(?:[a-z]{2}\\/)?(?:f|feedback)\\/[^\"'\\s<>]+)",
        dotAll: true,
      );
      final genericMatch = genericReg.firstMatch(html);
      final genericUrl = genericMatch?.group(1)?.trim();
      if (genericUrl != null && genericUrl.isNotEmpty) {
        return _unescapeHtmlEntities(genericUrl);
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  String _unescapeHtmlEntities(String value) {
    return value
        .replaceAll('&amp;', '&')
        .replaceAll('&#43;', '+')
        .replaceAll('&plus;', '+')
        .replaceAll('&#47;', '/')
        .replaceAll('&sol;', '/')
        .replaceAll('&#61;', '=')
        .replaceAll('&equals;', '=')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
  }
}
