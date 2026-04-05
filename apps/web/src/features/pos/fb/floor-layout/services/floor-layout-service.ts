import apiClient from "@/lib/api-client";
import type {
  FloorPlanListResponse,
  FloorPlanSingleResponse,
  FloorPlanFormDataResponse,
  LayoutVersionListResponse,
  ListFloorPlanParams,
  CreateFloorPlanData,
  UpdateFloorPlanData,
} from "../types";

const BASE_PATH = "/pos/floor-plans";

export const floorLayoutService = {
  async list(params?: ListFloorPlanParams): Promise<FloorPlanListResponse> {
    const response = await apiClient.get<FloorPlanListResponse>(BASE_PATH, {
      params,
    });
    return response.data;
  },

  async getById(id: string): Promise<FloorPlanSingleResponse> {
    const response = await apiClient.get<FloorPlanSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async create(data: CreateFloorPlanData): Promise<FloorPlanSingleResponse> {
    const response = await apiClient.post<FloorPlanSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateFloorPlanData
  ): Promise<FloorPlanSingleResponse> {
    const response = await apiClient.put<FloorPlanSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async saveLayoutData(
    id: string,
    layoutData: string
  ): Promise<FloorPlanSingleResponse> {
    const response = await apiClient.put<FloorPlanSingleResponse>(
      `${BASE_PATH}/${id}/layout`,
      { layout_data: layoutData }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  async publish(id: string): Promise<FloorPlanSingleResponse> {
    const response = await apiClient.post<FloorPlanSingleResponse>(
      `${BASE_PATH}/${id}/publish`
    );
    return response.data;
  },

  async listVersions(id: string): Promise<LayoutVersionListResponse> {
    const response = await apiClient.get<LayoutVersionListResponse>(
      `${BASE_PATH}/${id}/versions`
    );
    return response.data;
  },

  async getFormData(): Promise<FloorPlanFormDataResponse> {
    const response = await apiClient.get<FloorPlanFormDataResponse>(
      `${BASE_PATH}/form-data`
    );
    return response.data;
  },
};
