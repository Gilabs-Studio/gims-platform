import { apiClient } from "@/lib/api-client";
import type { StockLedgerFilter, StockLedgerListResponse } from "../types";

export const stockLedgerService = {
  async getByProductId(
    productId: string,
    params?: StockLedgerFilter,
  ): Promise<StockLedgerListResponse> {
    const response = await apiClient.get<StockLedgerListResponse>(
      `/inventory/products/${productId}/ledgers`,
      { params },
    );
    return response.data;
  },
};
