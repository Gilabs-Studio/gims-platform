import '../../../../shared/models/json_helpers.dart';

/// POS outlet configuration.
class PosConfig {
  PosConfig({
    required this.currency,
    required this.taxRate,
    required this.serviceChargeRate,
    required this.printReceiptAuto,
    this.receiptFooter,
    this.receiptWhatsAppTemplate,
  });

  final String currency;

  /// Deprecated: parsed for legacy API/cache compatibility; pricing ignores tax.
  final double taxRate;
  final double serviceChargeRate;
  final bool printReceiptAuto;
  final String? receiptFooter;
  final String? receiptWhatsAppTemplate;

  factory PosConfig.fromJson(Map<String, dynamic> json) {
    return PosConfig(
      currency: json['currency'] as String? ?? 'IDR',
      taxRate: asDouble(json['tax_rate']),
      serviceChargeRate: asDouble(json['service_charge_rate']),
      printReceiptAuto: json['print_receipt_auto'] as bool? ?? false,
      receiptFooter: json['receipt_footer'] as String?,
      receiptWhatsAppTemplate: json['receipt_whatsapp_template'] as String?,
    );
  }
}
