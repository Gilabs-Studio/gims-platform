export interface TierConfig {
  name: string;
  min_lifetime_points: number;
  multiplier: number;
  badge_color: string;
}

export interface RewardConfig {
  id: string;
  name: string;
  points_cost: number;
  description: string;
}

export interface PointRules {
  amount_per_point: number;
  points_per_amount: number;
}

export interface LoyaltyConfigJSON {
  point_rules: PointRules;
  tiers: TierConfig[];
  rewards: RewardConfig[];
  point_expiry_days: number;
}

export interface LoyaltyProgram {
  id: string;
  outlet_id?: string;
  name: string;
  description?: string;
  config: LoyaltyConfigJSON;
  is_active: boolean;
  member_count?: number;
  members_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyMember {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  program_id: string;
  program_name?: string;
  member_code: string;
  current_tier: string;
  tier_badge_color: string;
  point_balance: number;
  lifetime_points: number;
  total_transactions: number;
  joined_at: string;
}

export interface LoyaltyMemberLookup {
  found: boolean;
  member?: LoyaltyMember;
  available_rewards?: RewardConfig[];
  already_member: boolean;
  point_balance: number;
}

export interface PointLedgerEntry {
  id: string;
  member_id: string;
  entry_type: "earned" | "redeemed" | "expired" | "adjusted";
  transaction_type?: string;
  transaction_id?: string;
  points: number;
  balance_after: number;
  lifetime_after: number;
  multiplier: number;
  reward_id?: string;
  reward_name?: string;
  note?: string;
  processed_by?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateLoyaltyProgramRequest {
  outlet_id?: string;
  name: string;
  description?: string;
  config: LoyaltyConfigJSON;
  is_active?: boolean;
}

export interface UpdateLoyaltyProgramRequest {
  name?: string;
  description?: string;
  config?: LoyaltyConfigJSON;
  is_active?: boolean;
}

export interface EnrollMemberRequest {
  program_id?: string;
  outlet_id?: string;
  customer_id?: string;
  name: string;
  phone?: string;
  email?: string;
  pos_order_id?: string;
}

export interface RedeemPointsRequest {
  member_id: string;
  reward_id: string;
}

export interface RedeemPointsResponse {
  member_id: string;
  reward_id: string;
  reward_name: string;
  points_redeemed: number;
  point_balance: number;
}

export interface AdjustPointsRequest {
  member_id: string;
  points: number;
  note?: string;
}

export interface PublicSelfRegisterRequest {
  outlet_id: string;
  pos_order_id?: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface PublicSelfRegisterResponse {
  member_code: string;
  tier: string;
  point_balance: number;
  already_member: boolean;
  message: string;
}

export interface LoyaltyProgramListParams {
  page?: number;
  per_page?: number;
}

export interface LoyaltyMemberListParams {
  page?: number;
  per_page?: number;
  tier?: string;
  outlet_id?: string;
}

export interface LedgerListParams {
  page?: number;
  per_page?: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta?: { pagination?: PaginationMeta };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: PaginationMeta };
}
