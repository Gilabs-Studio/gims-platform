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
  CreateCountryData,
  UpdateCountryData,
  CreateProvinceData,
  UpdateProvinceData,
  CreateCityData,
  UpdateCityData,
  CreateDistrictData,
  UpdateDistrictData,
  CreateVillageData,
  UpdateVillageData,
} from "../types";

const BASE_PATH = "/geographic";

// Country Service
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

  async create(
    data: CreateCountryData
  ): Promise<GeographicSingleResponse<Country>> {
    const response = await apiClient.post<GeographicSingleResponse<Country>>(
      `${BASE_PATH}/countries`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateCountryData
  ): Promise<GeographicSingleResponse<Country>> {
    const response = await apiClient.put<GeographicSingleResponse<Country>>(
      `${BASE_PATH}/countries/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/countries/${id}`
    );
    return response.data;
  },
};

// Province Service
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

  async create(
    data: CreateProvinceData
  ): Promise<GeographicSingleResponse<Province>> {
    const response = await apiClient.post<GeographicSingleResponse<Province>>(
      `${BASE_PATH}/provinces`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateProvinceData
  ): Promise<GeographicSingleResponse<Province>> {
    const response = await apiClient.put<GeographicSingleResponse<Province>>(
      `${BASE_PATH}/provinces/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/provinces/${id}`
    );
    return response.data;
  },
};

// City Service
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

  async create(data: CreateCityData): Promise<GeographicSingleResponse<City>> {
    const response = await apiClient.post<GeographicSingleResponse<City>>(
      `${BASE_PATH}/cities`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateCityData
  ): Promise<GeographicSingleResponse<City>> {
    const response = await apiClient.put<GeographicSingleResponse<City>>(
      `${BASE_PATH}/cities/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/cities/${id}`
    );
    return response.data;
  },
};

// District Service
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

  async create(
    data: CreateDistrictData
  ): Promise<GeographicSingleResponse<District>> {
    const response = await apiClient.post<GeographicSingleResponse<District>>(
      `${BASE_PATH}/districts`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateDistrictData
  ): Promise<GeographicSingleResponse<District>> {
    const response = await apiClient.put<GeographicSingleResponse<District>>(
      `${BASE_PATH}/districts/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/districts/${id}`
    );
    return response.data;
  },
};

// Village Service
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

  async create(
    data: CreateVillageData
  ): Promise<GeographicSingleResponse<Village>> {
    const response = await apiClient.post<GeographicSingleResponse<Village>>(
      `${BASE_PATH}/villages`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateVillageData
  ): Promise<GeographicSingleResponse<Village>> {
    const response = await apiClient.put<GeographicSingleResponse<Village>>(
      `${BASE_PATH}/villages/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/villages/${id}`
    );
    return response.data;
  },
};
