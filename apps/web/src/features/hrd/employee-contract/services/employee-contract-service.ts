import apiClient from "@/lib/api-client";
import type {
  EmployeeContractListResponse,
  EmployeeContractSingleResponse,
  EmployeeContractFormDataResponse,
  ListEmployeeContractsParams,
  ExpiringContractsParams,
  CreateEmployeeContractData,
  UpdateEmployeeContractData,
} from "../types";

const BASE_PATH = "/hrd/employee-contracts";

// Employee Contract Service
export const employeeContractService = {
  async list(
    params?: ListEmployeeContractsParams
  ): Promise<EmployeeContractListResponse> {
    const response = await apiClient.get<EmployeeContractListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<EmployeeContractSingleResponse> {
    const response = await apiClient.get<EmployeeContractSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getByEmployeeId(employeeId: string): Promise<EmployeeContractListResponse> {
    const response = await apiClient.get<EmployeeContractListResponse>(
      `${BASE_PATH}/employee/${employeeId}`
    );
    return response.data;
  },

  async getExpiring(
    params?: ExpiringContractsParams
  ): Promise<EmployeeContractListResponse> {
    const response = await apiClient.get<EmployeeContractListResponse>(
      `${BASE_PATH}/expiring`,
      { params }
    );
    return response.data;
  },

  async getFormData(): Promise<EmployeeContractFormDataResponse> {
    const response = await apiClient.get<EmployeeContractFormDataResponse>(
      `${BASE_PATH}/form-data`
    );
    return response.data;
  },

  async create(
    data: CreateEmployeeContractData
  ): Promise<EmployeeContractSingleResponse> {
    const response = await apiClient.post<EmployeeContractSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateEmployeeContractData
  ): Promise<EmployeeContractSingleResponse> {
    const response = await apiClient.put<EmployeeContractSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },
};
