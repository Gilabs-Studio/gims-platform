import apiClient from "@/lib/api-client";
import type {
  Country,
  Province,
  City,
  District,
  Village,
  GeographicListResponse,
  GeographicSingleResponse,
  ListGeographicParams,
  ListProvincesParams,
  ListCitiesParams,
  ListDistrictsParams,
  ListVillagesParams,
  MapDataParams,
  MapDataResponse,
} from "../types";

const BASE_PATH = "/geographic";

// Country Service (read-only)
export const countryService = {
  async list(
    params?: ListGeographicParams
  ): Promise<GeographicListResponse<Country>> {
    const response = await apiClient.get<GeographicListResponse<Country>>(
      `${BASE_PATH}/countries`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<GeographicSingleResponse<Country>> {
    const response = await apiClient.get<GeographicSingleResponse<Country>>(
      `${BASE_PATH}/countries/${id}`
    );
    return response.data;
  },
};

// Province Service (read-only)
export const provinceService = {
  async list(
    params?: ListProvincesParams
  ): Promise<GeographicListResponse<Province>> {
    const response = await apiClient.get<GeographicListResponse<Province>>(
      `${BASE_PATH}/provinces`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<GeographicSingleResponse<Province>> {
    const response = await apiClient.get<GeographicSingleResponse<Province>>(
      `${BASE_PATH}/provinces/${id}`
    );
    return response.data;
  },
};

// City Service (read-only)
export const cityService = {
  async list(
    params?: ListCitiesParams
  ): Promise<GeographicListResponse<City>> {
    const response = await apiClient.get<GeographicListResponse<City>>(
      `${BASE_PATH}/cities`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<GeographicSingleResponse<City>> {
    const response = await apiClient.get<GeographicSingleResponse<City>>(
      `${BASE_PATH}/cities/${id}`
    );
    return response.data;
  },
};

// District Service (read-only)
export const districtService = {
  async list(
    params?: ListDistrictsParams
  ): Promise<GeographicListResponse<District>> {
    const response = await apiClient.get<GeographicListResponse<District>>(
      `${BASE_PATH}/districts`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<GeographicSingleResponse<District>> {
    const response = await apiClient.get<GeographicSingleResponse<District>>(
      `${BASE_PATH}/districts/${id}`
    );
    return response.data;
  },
};

// Village Service (read-only)
export const villageService = {
  async list(
    params?: ListVillagesParams
  ): Promise<GeographicListResponse<Village>> {
    const response = await apiClient.get<GeographicListResponse<Village>>(
      `${BASE_PATH}/villages`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<GeographicSingleResponse<Village>> {
    const response = await apiClient.get<GeographicSingleResponse<Village>>(
      `${BASE_PATH}/villages/${id}`
    );
    return response.data;
  },
};

// Map Data Service - fetches GeoJSON feature collections for map visualization
export const mapDataService = {
  async getMapData(params: MapDataParams): Promise<MapDataResponse> {
    const response = await apiClient.get<MapDataResponse>(
      `${BASE_PATH}/map-data`,
      { params }
    );
    return response.data;
  },
};
