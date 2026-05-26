import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../../app/app.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/error_utils.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/url_utils.dart';
import '../../domain/models/pos_config.dart';
import '../../domain/models/pos_order.dart';
import 'thermal_printer_settings_dialog.dart';

class ReceiptDialog extends StatefulWidget {
  const ReceiptDialog({
    super.key,
    required this.order,
    required this.config,
    required this.outletName,
    this.customerName,
    this.customerPhone,
    this.finalPayment,
  });

  final PosOrder order;
  final PosConfig? config;
  final String outletName;
  final String? customerName;
  final String? customerPhone;
  final PosPayment? finalPayment;

  @override
  State<ReceiptDialog> createState() => _ReceiptDialogState();
}

class _ReceiptDialogState extends State<ReceiptDialog> {
  WebViewController? _receiptPreviewController;
  bool _receiptPreviewError = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _initReceiptPreview();
  }

  void _initReceiptPreview() {
    if (kIsWeb) {
      setState(() => _receiptPreviewError = true);
      return;
    }
    if (widget.order.id.startsWith('local-')) {
      setState(() => _receiptPreviewError = true);
      return;
    }
    final url = ServiceLocator.instance.terminalService.receiptUrl(
      widget.order.id,
    );
    try {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setNavigationDelegate(
          NavigationDelegate(
            onWebResourceError: (_) {
              if (!mounted) return;
              setState(() => _receiptPreviewError = true);
            },
          ),
        )
        ..loadRequest(Uri.parse(url));
      _receiptPreviewController = controller;
    } catch (_) {
      setState(() => _receiptPreviewError = true);
    }
  }

  Future<void> _handlePrint() async {
    final printerService = ServiceLocator.instance.thermalPrinterService;
    final isOffline = widget.order.id.startsWith('local-');
    
    // Calculate tender and change
    final tender = widget.finalPayment?.tenderAmount ?? widget.order.totalAmount;
    final change = widget.finalPayment?.changeAmount ?? 0.0;

    setState(() => _loading = true);
    try {
      final success = await printerService.printReceipt(
        context,
        widget.order,
        widget.config,
        widget.outletName,
        isOffline: isOffline,
        tenderAmount: tender,
        changeAmount: change,
      );
      if (!success && mounted) {
        ThermalPrinterSettingsDialog.show(context);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendWhatsApp() async {
    final phone = widget.customerPhone ?? '';
    if (phone.isEmpty) {
      showError(
        context,
        ApiException('Nomor WhatsApp customer belum tersedia'),
      );
      return;
    }

    final template = widget.config?.receiptWhatsAppTemplate ?? '';
    final rendered = _renderWhatsAppTemplate(
      template: template,
      values: _buildTemplateValues(),
    );

    final waUrl = _formatWhatsAppLink(phone, rendered);
    await openExternal(waUrl);
  }

  Map<String, String> _buildTemplateValues() {
    final tender = widget.finalPayment?.tenderAmount ?? widget.order.totalAmount;
    final change = widget.finalPayment?.changeAmount ?? 0.0;

    return {
      'customer_name': widget.order.customerName ?? widget.customerName ?? '-',
      'order_number': widget.order.orderNumber,
      'outlet_name': widget.outletName,
      'order_date': _formatDateTime(widget.order.createdAt),
      'subtotal': formatMoney(
        widget.order.subtotal,
        widget.config?.currency ?? 'IDR',
      ),
      'tax_amount': formatMoney(
        widget.order.taxAmount,
        widget.config?.currency ?? 'IDR',
      ),
      'service_amount': formatMoney(
        widget.order.serviceCharge,
        widget.config?.currency ?? 'IDR',
      ),
      'discount_amount': formatMoney(
        widget.order.discountAmount,
        widget.config?.currency ?? 'IDR',
      ),
      'total_amount': formatMoney(
        widget.order.totalAmount,
        widget.config?.currency ?? 'IDR',
      ),
      'tender_amount': formatMoney(tender, widget.config?.currency ?? 'IDR'),
      'change_amount': formatMoney(change, widget.config?.currency ?? 'IDR'),
      'items_summary': widget.order.items
          .map((item) => '${item.productName} x${item.quantity.toStringAsFixed(0)}')
          .join(', ')
          .trim()
          .isEmpty
          ? '-'
          : widget.order.items
              .map((item) => '${item.productName} x${item.quantity.toStringAsFixed(0)}')
              .join(', '),
    };
  }

  Widget _buildOfflineReceiptPreview() {
    final printerService = ServiceLocator.instance.thermalPrinterService;
    final isLocal = widget.order.id.startsWith('local-');
    final tender = widget.finalPayment?.tenderAmount ?? widget.order.totalAmount;
    final change = widget.finalPayment?.changeAmount ?? 0.0;

    final receiptText = printerService.generateReceiptText(
      widget.order,
      widget.config,
      widget.outletName,
      isOffline: isLocal,
      tenderAmount: tender,
      changeAmount: change,
    );

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        border: Border.all(color: GimsColors.border),
        borderRadius: BorderRadius.circular(GimsRadius.medium),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                isLocal ? Icons.cloud_upload_outlined : Icons.receipt_long_outlined,
                color: isLocal ? const Color(0xFFF59E0B) : GimsColors.primary,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isLocal ? 'Mode Offline - Preview Nota' : 'Preview Nota',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: isLocal ? const Color(0xFF92400E) : GimsColors.foreground,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isLocal
                ? 'Order disimpan secara lokal dan akan disinkronkan saat online.'
                : 'Menampilkan format printer thermal untuk order ini.',
            style: const TextStyle(color: GimsColors.mutedForeground, fontSize: 12),
          ),
          const Divider(height: 24),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.vertical,
              child: Center(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Container(
                    width: printerService.paperSize == '80mm' ? 380 : 280,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(13),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      receiptText,
                      softWrap: false,
                      style: const TextStyle(
                        fontFamily: 'Courier',
                        fontSize: 13,
                        height: 1.2,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasPhone = (widget.customerPhone ?? '').isNotEmpty;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 560),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pembayaran Berhasil',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.green,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Order #${widget.order.orderNumber}',
                        style: const TextStyle(
                          color: GimsColors.mutedForeground,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Pengaturan Printer',
                  onPressed: () => ThermalPrinterSettingsDialog.show(context),
                  icon: const Icon(Icons.print_outlined),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(height: 24),
            Container(
              height: 460,
              decoration: BoxDecoration(
                border: Border.all(color: GimsColors.border),
                borderRadius: BorderRadius.circular(GimsRadius.medium),
                color: Colors.white,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(GimsRadius.medium),
                child: _receiptPreviewError
                    ? _buildOfflineReceiptPreview()
                    : WebViewWidget(controller: _receiptPreviewController!),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : _handlePrint,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(60),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.print_outlined),
                    label: const Text(
                      'Print',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: hasPhone ? _sendWhatsApp : null,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(60),
                      backgroundColor: GimsColors.success,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: SvgPicture.asset(
                      'assets/logo/whatsapp-svgrepo-com.svg',
                      width: 22,
                      height: 22,
                    ),
                    label: const Text(
                      'Kirim WA',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(60),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Selesai',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

String _formatDateTime(DateTime dt) {
  final local = dt.toLocal();
  final month = {
    1: 'Jan',
    2: 'Feb',
    3: 'Mar',
    4: 'Apr',
    5: 'May',
    6: 'Jun',
    7: 'Jul',
    8: 'Aug',
    9: 'Sep',
    10: 'Oct',
    11: 'Nov',
    12: 'Dec',
  };

  return '${local.day} ${month[local.month]} ${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

String _renderWhatsAppTemplate({
  required String template,
  required Map<String, String> values,
}) {
  final base = template.trim().isEmpty
      ? 'Halo #customer_name, ini receipt order #order_number dari #outlet_name. Total #total_amount. Terima kasih.'
      : template;

  return base
      .replaceAllMapped(RegExp(r'#([A-Za-z0-9_]+)'), (match) {
        final tag = match.group(1) ?? '';
        return values[tag] ?? match.group(0) ?? '';
      })
      .replaceAll('\u202f', ' ');
}

String _formatWhatsAppLink(String phone, String message) {
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  final target = digits.isEmpty ? '' : digits;
  if (target.isEmpty) {
    return 'https://wa.me/?text=${Uri.encodeComponent(message)}';
  }
  return 'https://wa.me/$target?text=${Uri.encodeComponent(message)}';
}
