import { apiClient } from "@/lib/api-client";
import type { PaymentHistoryListResponse, PaymentTransaction } from "../types/payment";

interface PaymentHistoryParams {
  page?: number;
  per_page?: number;
  status?: string;
  provider?: string;
}

export const paymentHistoryService = {
  /**
   * Get payment history for the current tenant.
   */
  getMyPaymentHistory: async (
    params?: PaymentHistoryParams,
  ): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get<PaymentHistoryListResponse>(
      "/billing/payment-history",
      {
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? 20,
          ...(params?.status && { status: params.status }),
          ...(params?.provider && { provider: params.provider }),
        },
      },
    );
    return response.data.data?.data ?? [];
  },
};
