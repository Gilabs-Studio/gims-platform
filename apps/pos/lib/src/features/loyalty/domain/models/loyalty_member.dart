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
