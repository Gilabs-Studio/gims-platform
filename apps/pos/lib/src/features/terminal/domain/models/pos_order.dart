import '../../../../shared/models/json_helpers.dart';

/// POS order status lifecycle.
enum PosOrderStatus {
  draft('DRAFT'),
  inProgress('IN_PROGRESS'),
  ready('READY'),
  waitingPayment('WAITING_PAYMENT'),
  paid('PAID'),
  partialServed('PARTIAL_SERVED'),
  served('SERVED'),
  completed('COMPLETED'),
  voided('VOIDED');

  const PosOrderStatus(this.value);
  final String value;

  static PosOrderStatus fromValue(String? value) {
    return PosOrderStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => PosOrderStatus.draft,
    );
  }
}

/// POS payment method.
enum PosPaymentMethod {
  cash('CASH'),
  card('CARD'),
  qris('QRIS'),
  transfer('TRANSFER'),
  digital('DIGITAL');

  const PosPaymentMethod(this.value);
  final String value;
}

/// Line item within a POS order.
class PosOrderItem {
  PosOrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.productCode,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    required this.status,
    this.notes,
  });

  final String id;
  final String productId;
  final String productName;
  final String productCode;
  final double quantity;
  final double unitPrice;
  final double subtotal;
  final String status;
  final String? notes;

  factory PosOrderItem.fromJson(Map<String, dynamic> json) {
    return PosOrderItem(
      id: json['id'] as String? ?? '',
      productId: json['product_id'] as String? ?? '',
      productName: json['product_name'] as String? ?? '',
      productCode: json['product_code'] as String? ?? '',
      quantity: asDouble(json['quantity']),
      unitPrice: asDouble(json['unit_price']),
      subtotal: asDouble(json['subtotal']),
      status: json['status'] as String? ?? 'PENDING',
      notes: json['notes'] as String?,
    );
  }
}

/// A complete POS order with items, amounts, and metadata.
class PosOrder {
  PosOrder({
    required this.id,
    required this.orderNumber,
    required this.outletId,
    required this.status,
    required this.guestCount,
    required this.subtotal,
    required this.taxAmount,
    required this.serviceCharge,
    required this.discountAmount,
    required this.totalAmount,
    required this.items,
    required this.createdAt,
    this.tableId,
    this.tableLabel,
    this.customerId,
    this.customerName,
    this.loyaltyMemberId,
    this.loyaltyRewardId,
    this.orderSource,
    this.notes,
  });

  final String id;
  final String orderNumber;
  final String outletId;
  final PosOrderStatus status;
  final int guestCount;
  final double subtotal;
  final double taxAmount;
  final double serviceCharge;
  final double discountAmount;
  final double totalAmount;
  final List<PosOrderItem> items;
  final DateTime createdAt;
  final String? tableId;
  final String? tableLabel;
  final String? customerId;
  final String? customerName;
  final String? loyaltyMemberId;
  final String? loyaltyRewardId;
  final String? orderSource;
  final String? notes;

  factory PosOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return PosOrder(
      id: json['id'] as String? ?? '',
      orderNumber: json['order_number'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      status: PosOrderStatus.fromValue(json['status'] as String?),
      guestCount: (json['guest_count'] as num?)?.toInt() ?? 1,
      subtotal: asDouble(json['subtotal']),
      taxAmount: asDouble(json['tax_amount']),
      serviceCharge: asDouble(json['service_charge']),
      discountAmount: asDouble(json['discount_amount']),
      totalAmount: asDouble(json['total_amount']),
      items: rawItems is List
          ? rawItems
                .whereType<Map<String, dynamic>>()
                .map(PosOrderItem.fromJson)
                .toList()
          : const [],
      createdAt: DateTime.tryParse('${json['created_at']}') ?? DateTime.now(),
      tableId: json['table_id'] as String?,
      tableLabel: json['table_label'] as String?,
      customerId: json['customer_id'] as String?,
      customerName: json['customer_name'] as String?,
      loyaltyMemberId: json['loyalty_member_id'] as String?,
      loyaltyRewardId: json['loyalty_reward_id'] as String?,
      orderSource: json['order_source'] as String?,
      notes: json['notes'] as String?,
    );
  }

  PosOrder copyWith({
    String? id,
    String? orderNumber,
    String? outletId,
    PosOrderStatus? status,
    int? guestCount,
    double? subtotal,
    double? taxAmount,
    double? serviceCharge,
    double? discountAmount,
    double? totalAmount,
    List<PosOrderItem>? items,
    DateTime? createdAt,
    String? tableId,
    String? tableLabel,
    String? customerId,
    String? customerName,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
    String? orderSource,
    String? notes,
  }) {
    return PosOrder(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      outletId: outletId ?? this.outletId,
      status: status ?? this.status,
      guestCount: guestCount ?? this.guestCount,
      subtotal: subtotal ?? this.subtotal,
      taxAmount: taxAmount ?? this.taxAmount,
      serviceCharge: serviceCharge ?? this.serviceCharge,
      discountAmount: discountAmount ?? this.discountAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      items: items ?? this.items,
      createdAt: createdAt ?? this.createdAt,
      tableId: tableId ?? this.tableId,
      tableLabel: tableLabel ?? this.tableLabel,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      loyaltyMemberId: loyaltyMemberId ?? this.loyaltyMemberId,
      loyaltyRewardId: loyaltyRewardId ?? this.loyaltyRewardId,
      orderSource: orderSource ?? this.orderSource,
      notes: notes ?? this.notes,
    );
  }
}

/// Payment result from cash or digital payment.
class PosPayment {
  PosPayment({
    required this.id,
    required this.method,
    required this.status,
    required this.amount,
    this.tenderAmount,
    this.changeAmount,
    this.paymentUrl,
    this.qrCode,
    this.vaNumber,
    this.channelCode,
    this.expiresAt,
  });

  final String id;
  final String method;
  final String status;
  final double amount;
  final double? tenderAmount;
  final double? changeAmount;
  final String? paymentUrl;
  final String? qrCode;
  final String? vaNumber;
  final String? channelCode;
  final DateTime? expiresAt;

  factory PosPayment.fromJson(Map<String, dynamic> json) {
    return PosPayment(
      id: json['id'] as String? ?? '',
      method: json['method'] as String? ?? '',
      status: json['status'] as String? ?? '',
      amount: asDouble(json['amount']),
        tenderAmount: json['tender_amount'] == null
          ? null
          : asDouble(json['tender_amount']),
        changeAmount: json['change_amount'] == null
          ? null
          : asDouble(json['change_amount']),
      paymentUrl: json['payment_url'] as String?,
      qrCode: json['qr_code'] as String?,
      vaNumber: json['va_number'] as String?,
      channelCode: json['channel_code'] as String?,
      expiresAt: DateTime.tryParse('${json['expires_at']}'),
    );
  }
}
