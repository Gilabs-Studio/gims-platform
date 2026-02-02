import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  PurchaseRequisitionListItem,
  PurchaseRequisitionListParams,
} from "../types";

const BASE_URL = "/purchase/purchase-requisitions";

export const purchaseRequisitionsService = {
  list: async (
    params?: PurchaseRequisitionListParams,
  ): Promise<ApiResponse<PurchaseRequisitionListItem[]>> => {
    const response = await apiClient.get<ApiResponse<PurchaseRequisitionListItem[]>>(
      BASE_URL,
      { params },
    );
    return response.data;
  },
};
