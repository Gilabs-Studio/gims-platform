import apiClient from "@/lib/api-client";
import type {
  GenerateTableTokenData,
  TableQRTokenListResponse,
  TableQRTokenSingleResponse,
} from "../types/table-qr";

const BASE_PATH = "/pos/floor-plans";

export const tableQRService = {
  async generateToken(
    floorPlanId: string,
    objectId: string,
    data: GenerateTableTokenData
  ): Promise<TableQRTokenSingleResponse> {
    const res = await apiClient.post<TableQRTokenSingleResponse>(
      `${BASE_PATH}/${floorPlanId}/tables/${objectId}/token`,
      data
    );
    return res.data;
  },

  async listTokens(
    floorPlanId: string
  ): Promise<TableQRTokenListResponse> {
    const res = await apiClient.get<TableQRTokenListResponse>(
      `${BASE_PATH}/${floorPlanId}/table-tokens`
    );
    return res.data;
  },

  async revokeToken(
    floorPlanId: string,
    objectId: string
  ): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `${BASE_PATH}/${floorPlanId}/tables/${objectId}/token`
    );
    return res.data;
  },
};
