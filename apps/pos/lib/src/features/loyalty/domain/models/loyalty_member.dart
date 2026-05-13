import '../../../../shared/models/json_helpers.dart';

/// Loyalty member lookup result from API.
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
      pointBalance: asDouble(json['point_balance']),
      availableRewards: rewards is List
          ? rewards
                .whereType<Map<String, dynamic>>()
                .map(LoyaltyReward.fromJson)
                .toList()
          : const [],
    );
  }
}

/// Minimal loyalty program model for POS UI.
class LoyaltyProgram {
  LoyaltyProgram({required this.id, required this.name, this.outletId});

  final String id;
  final String name;
  final String? outletId;

  factory LoyaltyProgram.fromJson(Map<String, dynamic> json) {
    return LoyaltyProgram(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      outletId: json['outlet_id'] as String?,
    );
  }
}

/// A loyalty reward that can be redeemed.
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
      value: asDouble(json['value']),
      pointsRequired: asDouble(json['points_required']),
    );
  }
}

/// Loyalty member used in lists with all fields from API.
class LoyaltyMember {
  LoyaltyMember({
    required this.id,
    required this.memberCode,
    required this.customerId,
    required this.customerName,
    this.customerPhone,
    this.programId,
    this.currentTier,
    this.tierBadgeColor,
    this.pointBalance = 0,
    this.lifetimePoints = 0,
    this.totalTransactions = 0,
    this.enrolledOutletId,
    this.enrolledOutletName,
    this.joinedAt,
    this.lastTransactionAt,
  });

  final String id;
  final String memberCode;
  final String? customerId;
  final String? customerName;
  final String? customerPhone;
  final String? programId;
  final String? currentTier;
  final String? tierBadgeColor;
  final double pointBalance;
  final double lifetimePoints;
  final int totalTransactions;
  final String? enrolledOutletId;
  final String? enrolledOutletName;
  final String? joinedAt;
  final String? lastTransactionAt;

  factory LoyaltyMember.fromJson(Map<String, dynamic> json) {
    return LoyaltyMember(
      id: json['id'] as String? ?? '',
      memberCode: json['member_code'] as String? ?? '',
      customerId: json['customer_id'] as String?,
      customerName: json['customer_name'] as String?,
      customerPhone: json['customer_phone'] as String?,
      programId: json['program_id'] as String?,
      currentTier: json['current_tier'] as String?,
      tierBadgeColor: json['tier_badge_color'] as String?,
      pointBalance: asDouble(json['point_balance']),
      lifetimePoints: asDouble(json['lifetime_points']),
      totalTransactions: (json['total_transactions'] as num?)?.toInt() ?? 0,
      enrolledOutletId: json['enrolled_outlet_id'] as String?,
      enrolledOutletName: json['enrolled_outlet_name'] as String?,
      joinedAt: json['joined_at'] as String?,
      lastTransactionAt: json['last_transaction_at'] as String?,
    );
  }
}
