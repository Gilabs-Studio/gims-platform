import { apiClient } from "@/lib/api-client";

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan: string;
  billing_period: string;
  status: "active" | "trial" | "past_due" | "suspended" | "expired" | "cancelled";
  starts_at: string;
  expires_at?: string;
  next_billing_at?: string;
  user_count: number;
  seat_limit?: number;
  active_users?: number;
  amount_paid_idr: number;
  coupon_code?: string;
  notes?: string;
  created_at: string;
}

export interface TenantEntitlements {
  modules: string[];
  menu_urls?: string[];
  permission_codes?: string[];
}

export type BillingChangeAction = "add_seat" | "upgrade_plan" | "add_module" | "downgrade";

export interface BillingChangeRequest {
  action: BillingChangeAction;
  target: string;
  action_date: string;
  coupon_code?: string;
  idempotency_key?: string;
  xendit_customer_id?: string;
  xendit_plan_id?: string;
}

export interface BillingChangeResponse {
  status: "ok" | "error";
  error_code?: string | null;
  sync_required?: boolean;
  billing_change: {
    old_seat_limit: number;
    new_seat_limit: number;
    old_amount_per_cycle: number;
    new_amount_per_cycle: number;
    proration_amount: number;
    proration_waived_reason?: string | null;
  };
  coupon_applied: {
    code: string | null;
    discount_amount: number;
    mark_as_used: boolean;
  };
  xendit_action: "update_cycle" | "create_invoice" | "update_plan" | "none";
  xendit_payload: Record<string, unknown>;
  user_notification: {
    title: string;
    message: string;
    amount_due_now: number;
  };
}

export interface BillingConfirmResponse {
  status: "synced" | "already_synced";
}

export interface TenantPaymentMethod {
  id: string;
  tenant_id: string;
  xendit_token_id: string;
  masked_card_number: string;
  card_brand: string;
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  created_at: string;
}

export const billingService = {
  getMySubscription: async (): Promise<TenantSubscription | null> => {
    const response = await apiClient.get<{ success: boolean; data: TenantSubscription | null }>(
      "/billing/subscription",
    );
    return response.data.data;
  },

  getMyEntitlements: async (): Promise<TenantEntitlements> => {
    const response = await apiClient.get<{ success: boolean; data: TenantEntitlements }>(
      "/billing/entitlements",
    );
    return {
      modules: response.data.data?.modules ?? [],
      menu_urls: response.data.data?.menu_urls ?? [],
      permission_codes: response.data.data?.permission_codes ?? [],
    };
  },

  changeSubscription: async (payload: BillingChangeRequest): Promise<BillingChangeResponse> => {
    const response = await apiClient.post<{ success: boolean; data: BillingChangeResponse }>(
      "/billing/change",
      payload,
    );
    return response.data.data;
  },

  confirmSubscriptionChange: async (token: string): Promise<BillingConfirmResponse> => {
    const response = await apiClient.post<{ success: boolean; data: BillingConfirmResponse }>(
      "/billing/change/confirm",
      { token },
    );
    return response.data.data;
  },

  cancelSubscription: async (): Promise<{ status: string }> => {
    const response = await apiClient.delete<{ success: boolean; data: { status: string } }>(
      "/billing/subscription",
    );
    return response.data.data;
  },

  listPaymentMethods: async (): Promise<TenantPaymentMethod[]> => {
    const response = await apiClient.get<{ success: boolean; data: TenantPaymentMethod[] }>(
      "/billing/payment-methods",
    );
    return response.data.data ?? [];
  },

  addPaymentMethod: async (xenditTokenId: string): Promise<TenantPaymentMethod> => {
    const response = await apiClient.post<{ success: boolean; data: TenantPaymentMethod }>(
      "/billing/payment-methods",
      { xendit_token_id: xenditTokenId },
    );
    return response.data.data;
  },

  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    await apiClient.patch(`/billing/payment-methods/${id}/default`, {});
  },

  removePaymentMethod: async (id: string): Promise<void> => {
    await apiClient.delete(`/billing/payment-methods/${id}`);
  },
};
