import 'dart:convert';

enum PosOrderStatus {
  draft('DRAFT'),
  inProgress('IN_PROGRESS'),
  ready('READY'),
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

enum PosPaymentMethod {
  cash('CASH'),
  card('CARD'),
  qris('QRIS'),
  transfer('TRANSFER'),
  digital('DIGITAL');

  const PosPaymentMethod(this.value);
  final String value;
}

class ApiList<T> {
  ApiList({required this.items, this.total = 0});

  final List<T> items;
  final int total;
}

class UserSession {
  UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.roleName,
    required this.permissions,
  });

  final String id;
  final String name;
  final String email;
  final String roleName;
  final Map<String, String> permissions;

  factory UserSession.fromJson(Map<String, dynamic> json) {
    final role = json['role'] as Map<String, dynamic>? ?? {};
    final rawPermissions = json['permissions'];
    return UserSession(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Cashier',
      email: json['email'] as String? ?? '',
      roleName: role['name'] as String? ?? role['code'] as String? ?? '',
      permissions: rawPermissions is Map<String, dynamic>
          ? rawPermissions.map((key, value) => MapEntry(key, '$value'))
          : const {},
    );
  }
}

class Outlet {
  Outlet({required this.id, required this.name});

  final String id;
  final String name;

  factory Outlet.fromJson(Map<String, dynamic> json) {
    return Outlet(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Outlet',
    );
  }
}

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
  final double taxRate;
  final double serviceChargeRate;
  final bool printReceiptAuto;
  final String? receiptFooter;
  final String? receiptWhatsAppTemplate;

  factory PosConfig.fromJson(Map<String, dynamic> json) {
    return PosConfig(
      currency: json['currency'] as String? ?? 'IDR',
      taxRate: _asDouble(json['tax_rate']),
      serviceChargeRate: _asDouble(json['service_charge_rate']),
      printReceiptAuto: json['print_receipt_auto'] as bool? ?? false,
      receiptFooter: json['receipt_footer'] as String?,
      receiptWhatsAppTemplate: json['receipt_whatsapp_template'] as String?,
    );
  }
}

class CatalogItem {
  CatalogItem({
    required this.productId,
    required this.productCode,
    required this.productName,
    required this.productKind,
    required this.price,
    required this.stock,
    required this.isAvailable,
    this.imageUrl,
    this.category,
  });

  final String productId;
  final String productCode;
  final String productName;
  final String productKind;
  final double price;
  final double stock;
  final bool isAvailable;
  final String? imageUrl;
  final String? category;

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    return CatalogItem(
      productId: json['product_id'] as String? ?? '',
      productCode: json['product_code'] as String? ?? '',
      productName: json['product_name'] as String? ?? 'Product',
      productKind: json['product_kind'] as String? ?? 'STOCK',
      price: _asDouble(json['price']),
      stock: _asDouble(json['stock']),
      isAvailable: json['is_available'] as bool? ?? true,
      imageUrl: json['image_url'] as String?,
      category: json['category'] as String?,
    );
  }
}

class CartLine {
  CartLine({required this.product, this.quantity = 1, this.notes});

  final CatalogItem product;
  double quantity;
  String? notes;

  double get subtotal => product.price * quantity;
}

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
      quantity: _asDouble(json['quantity']),
      unitPrice: _asDouble(json['unit_price']),
      subtotal: _asDouble(json['subtotal']),
      status: json['status'] as String? ?? 'PENDING',
      notes: json['notes'] as String?,
    );
  }
}

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
  final String? notes;

  factory PosOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return PosOrder(
      id: json['id'] as String? ?? '',
      orderNumber: json['order_number'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      status: PosOrderStatus.fromValue(json['status'] as String?),
      guestCount: (json['guest_count'] as num?)?.toInt() ?? 1,
      subtotal: _asDouble(json['subtotal']),
      taxAmount: _asDouble(json['tax_amount']),
      serviceCharge: _asDouble(json['service_charge']),
      discountAmount: _asDouble(json['discount_amount']),
      totalAmount: _asDouble(json['total_amount']),
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
      notes: json['notes'] as String?,
    );
  }
}

class PosPayment {
  PosPayment({
    required this.id,
    required this.method,
    required this.status,
    required this.amount,
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
      amount: _asDouble(json['amount']),
      paymentUrl: json['payment_url'] as String?,
      qrCode: json['qr_code'] as String?,
      vaNumber: json['va_number'] as String?,
      channelCode: json['channel_code'] as String?,
      expiresAt: DateTime.tryParse('${json['expires_at']}'),
    );
  }
}

class FloorPlan {
  FloorPlan({
    required this.id,
    required this.outletId,
    required this.name,
    required this.floorNumber,
    required this.status,
    required this.gridSize,
    required this.snapToGrid,
    required this.width,
    required this.height,
    required this.objects,
  });

  final String id;
  final String outletId;
  final String name;
  final int floorNumber;
  final String status;
  final int gridSize;
  final bool snapToGrid;
  final int width;
  final int height;
  final List<LayoutObject> objects;

  factory FloorPlan.fromJson(Map<String, dynamic> json) {
    return FloorPlan(
      id: json['id'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      name: json['name'] as String? ?? 'Floor',
      floorNumber: (json['floor_number'] as num?)?.toInt() ?? 1,
      status: json['status'] as String? ?? 'draft',
      gridSize: (json['grid_size'] as num?)?.toInt() ?? 20,
      snapToGrid: json['snap_to_grid'] as bool? ?? true,
      width: (json['width'] as num?)?.toInt() ?? 900,
      height: (json['height'] as num?)?.toInt() ?? 600,
      objects: LayoutObject.decodeList(json['layout_data']),
    );
  }

  String encodeLayout() {
    return jsonEncode(objects.map((object) => object.toJson()).toList());
  }
}

class LayoutObject {
  LayoutObject({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    this.rotation = 0,
    this.label,
    this.parentId,
    this.tableNumber,
    this.tableShape,
    this.capacity,
    this.zoneType,
    this.color,
    this.opacity,
  });

  final String id;
  final String type;
  double x;
  double y;
  double width;
  double height;
  double rotation;
  String? label;
  String? parentId;
  int? tableNumber;
  String? tableShape;
  int? capacity;
  String? zoneType;
  String? color;
  double? opacity;

  bool get isTable => type == 'table';
  bool get isChair => type == 'chair';

  factory LayoutObject.fromJson(Map<String, dynamic> json) {
    return LayoutObject(
      id:
          json['id'] as String? ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      type: json['type'] as String? ?? 'table',
      x: _asDouble(json['x']),
      y: _asDouble(json['y']),
      width: _asDouble(json['width'], fallback: 90),
      height: _asDouble(json['height'], fallback: 70),
      rotation: _asDouble(json['rotation']),
      label: json['label'] as String?,
      parentId: json['parentId'] as String?,
      tableNumber: (json['tableNumber'] as num?)?.toInt(),
      tableShape: json['tableShape'] as String?,
      capacity: (json['capacity'] as num?)?.toInt(),
      zoneType: json['zoneType'] as String?,
      color: json['color'] as String?,
      opacity: _nullableDouble(json['opacity']),
    );
  }

  static List<LayoutObject> decodeList(Object? value) {
    Object? parsed = value;
    if (value is String && value.trim().isNotEmpty) {
      parsed = jsonDecode(value);
    }
    if (parsed is List) {
      return parsed
          .whereType<Map<String, dynamic>>()
          .map(LayoutObject.fromJson)
          .toList();
    }
    return [];
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'rotation': rotation,
      if (label != null) 'label': label,
      if (parentId != null) 'parentId': parentId,
      if (tableNumber != null) 'tableNumber': tableNumber,
      if (tableShape != null) 'tableShape': tableShape,
      if (capacity != null) 'capacity': capacity,
      if (zoneType != null) 'zoneType': zoneType,
      if (color != null) 'color': color,
      if (opacity != null) 'opacity': opacity,
    };
  }
}

class LiveTableInfo {
  LiveTableInfo({
    required this.table,
    required this.seatCount,
    required this.status,
    required this.duration,
    this.order,
  });

  final LayoutObject table;
  final int seatCount;
  final String status;
  final Duration duration;
  final PosOrder? order;
}

class LoyaltyMemberLookup {
  LoyaltyMemberLookup({
    required this.found,
    this.memberId,
    this.memberCode,
    this.customerId,
    this.customerName,
    this.currentTier,
    this.pointBalance = 0,
    this.availableRewards = const [],
  });

  final bool found;
  final String? memberId;
  final String? memberCode;
  final String? customerId;
  final String? customerName;
  final String? currentTier;
  final double pointBalance;
  final List<LoyaltyReward> availableRewards;

  factory LoyaltyMemberLookup.fromJson(Map<String, dynamic> json) {
    final rewards = json['available_rewards'];
    return LoyaltyMemberLookup(
      found: json['found'] as bool? ?? false,
      memberId: json['member_id'] as String?,
      memberCode: json['member_code'] as String?,
      customerId: json['customer_id'] as String?,
      customerName: json['customer_name'] as String?,
      currentTier: json['current_tier'] as String?,
      pointBalance: _asDouble(json['point_balance']),
      availableRewards: rewards is List
          ? rewards
                .whereType<Map<String, dynamic>>()
                .map(LoyaltyReward.fromJson)
                .toList()
          : const [],
    );
  }
}

class LoyaltyReward {
  LoyaltyReward({
    required this.id,
    required this.name,
    required this.type,
    required this.value,
    required this.pointsRequired,
  });

  final String id;
  final String name;
  final String type;
  final double value;
  final double pointsRequired;

  factory LoyaltyReward.fromJson(Map<String, dynamic> json) {
    return LoyaltyReward(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Reward',
      type: json['type'] as String? ?? '',
      value: _asDouble(json['value']),
      pointsRequired: _asDouble(json['points_required']),
    );
  }
}

class FeedbackForm {
  FeedbackForm({
    required this.id,
    required this.outletId,
    required this.title,
    required this.isActive,
    this.description,
  });

  final String id;
  final String outletId;
  final String title;
  final bool isActive;
  final String? description;

  factory FeedbackForm.fromJson(Map<String, dynamic> json) {
    return FeedbackForm(
      id: json['id'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      title: json['title'] as String? ?? 'Feedback',
      isActive: json['is_active'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }
}

double _asDouble(Object? value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

double? _nullableDouble(Object? value) {
  if (value == null) return null;
  return _asDouble(value);
}
