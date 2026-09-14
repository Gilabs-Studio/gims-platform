import { apiClient } from "@/lib/api-client";
import type { StockLedgerFilter, StockLedgerListResponse } from "../types";

export const stockLedgerService = {
  async getByProductId(
    productId?: string | null,
    params?: StockLedgerFilter,
  ): Promise<StockLedgerListResponse> {
    const response = await apiClient.get<StockLedgerListResponse>(
      `/stock/ledger`,
      {
        params: {
          ...params,
          product_id: productId || undefined,
        },
      },
    );
    return response.data;
  },
};

