import { apiClient } from "@/lib/api-client";

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan: string;
  billing_period: string;
  status: "active" | "trial" | "expired" | "cancelled";
  starts_at: string;
  expires_at?: string;
  next_billing_at?: string;
  user_count: number;
  amount_paid_idr: number;
  coupon_code?: string;
  notes?: string;
  created_at: string;
}

export interface TenantEntitlements {
  modules: string[];
}

export const billingService = {
  getMySubscription: async (): Promise<TenantSubscription | null> => {
    const response = await apiClient.get<{ success: boolean; data: TenantSubscription | null }>(
      "/billing/subscription",
    );
    return response.data.data;
  },

  getMyEntitlements: async (): Promise<string[]> => {
    const response = await apiClient.get<{ success: boolean; data: TenantEntitlements }>(
      "/billing/entitlements",
    );
    return response.data.data?.modules ?? [];
  },
};
