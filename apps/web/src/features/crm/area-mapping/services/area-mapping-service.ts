import { apiClient } from "@/lib/api-client";
import type {
  AreaCaptureListResponse,
  AreaCaptureResponse,
  CreateAreaCaptureData,
  HeatmapApiResponse,
  CoverageApiResponse,
  ListCapturesParams,
  AreaMappingApiResponse,
  AreaMappingRequest,
} from "../types";

const BASE_URL = "/crm/area-mapping";

export const areaMappingService = {
    /**
     * Get area mapping data for map visualization
     * Returns customers and leads with their locations and activity metrics
     */
    async getAreaMapping(params?: AreaMappingRequest): Promise<AreaMappingApiResponse> {
      const response = await apiClient.get<AreaMappingApiResponse>(
        `${BASE_URL}/map`,
        { params }
      );
      return response.data;
    },

  async capture(data: CreateAreaCaptureData): Promise<AreaCaptureResponse> {
    const response = await apiClient.post<AreaCaptureResponse>(
      `${BASE_URL}/capture`,
      data
    );
    return response.data;
  },

  async listCaptures(
    params?: ListCapturesParams
  ): Promise<AreaCaptureListResponse> {
    const response = await apiClient.get<AreaCaptureListResponse>(
      `${BASE_URL}/captures`,
      { params }
    );
    return response.data;
  },

  async getHeatmap(areaId?: string): Promise<HeatmapApiResponse> {
    const response = await apiClient.get<HeatmapApiResponse>(
      `${BASE_URL}/heatmap`,
      { params: areaId ? { area_id: areaId } : undefined }
    );
    return response.data;
  },

  async getCoverage(): Promise<CoverageApiResponse> {
    const response = await apiClient.get<CoverageApiResponse>(
      `${BASE_URL}/coverage`
    );
    return response.data;
  },
};
