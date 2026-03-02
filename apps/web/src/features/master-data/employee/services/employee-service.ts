import apiClient from "@/lib/api-client";
import type {
  Employee,
  EmployeeListResponse,
  EmployeeSingleResponse,
  ListEmployeesParams,
  CreateEmployeeData,
  UpdateEmployeeData,

  AssignEmployeeAreasData,
  BulkUpdateEmployeeAreasData,
  AvailableUsersResponse,
  EmployeeFormDataResponse,
  EmployeeContract,
  CreateEmployeeContractData,
  UpdateEmployeeContractData,
  TerminateEmployeeContractData,
  RenewEmployeeContractData,
  CorrectEmployeeContractData,
  EmployeeEducationHistory,
  CreateEmployeeEducationHistoryData,
  UpdateEmployeeEducationHistoryData,
  EmployeeCertification,
  CreateEmployeeCertificationData,
  UpdateEmployeeCertificationData,
  EmployeeAsset,
  CreateEmployeeAssetData,
  UpdateEmployeeAssetData,
  ReturnEmployeeAssetData,
} from "../types";

const BASE_PATH = "/organization";

export const employeeService = {
  async list(params?: ListEmployeesParams): Promise<EmployeeListResponse> {
    const response = await apiClient.get<EmployeeListResponse>(
      `${BASE_PATH}/employees`,
      { params },
    );
    return response.data;
  },

  async getById(id: string): Promise<EmployeeSingleResponse> {
    const response = await apiClient.get<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}`,
    );
    return response.data;
  },

  async create(data: CreateEmployeeData): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees`,
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateEmployeeData,
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.put<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/employees/${id}`,
    );
    return response.data;
  },


  async assignAreas(
    id: string,
    data: AssignEmployeeAreasData,
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}/areas`,
      data,
    );
    return response.data;
  },

  async bulkUpdateAreas(
    id: string,
    data: BulkUpdateEmployeeAreasData,
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.put<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}/areas`,
      data,
    );
    return response.data;
  },

  async removeAreaAssignment(
    employeeId: string,
    areaId: string,
  ): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(
      `${BASE_PATH}/employees/${employeeId}/areas/${areaId}`,
    );
    return response.data;
  },

  async getAvailableUsers(params?: {
    search?: string;
    exclude_employee_id?: string;
  }): Promise<AvailableUsersResponse> {
    const response = await apiClient.get<AvailableUsersResponse>(
      "/users/available",
      { params },
    );
    return response.data;
  },

  async getFormData(): Promise<EmployeeFormDataResponse> {
    const response = await apiClient.get<EmployeeFormDataResponse>(
      `${BASE_PATH}/employees/form-data`,
    );
    return response.data;
  },

  // Contract management
  async getEmployeeContracts(employeeId: string): Promise<EmployeeContract[]> {
    const response = await apiClient.get<{ data: EmployeeContract[] }>(
      `${BASE_PATH}/employees/${employeeId}/contracts`,
    );
    return response.data.data;
  },

  async getActiveContract(
    employeeId: string,
  ): Promise<EmployeeContract | null> {
    const response = await apiClient.get<{ data: EmployeeContract | null }>(
      `${BASE_PATH}/employees/${employeeId}/contracts/active`,
    );
    return response.data.data;
  },

  async createEmployeeContract(
    employeeId: string,
    data: CreateEmployeeContractData,
  ): Promise<EmployeeContract> {
    const response = await apiClient.post<{ data: EmployeeContract }>(
      `${BASE_PATH}/employees/${employeeId}/contracts`,
      data,
    );
    return response.data.data;
  },

  async updateEmployeeContract(
    employeeId: string,
    contractId: string,
    data: UpdateEmployeeContractData,
  ): Promise<EmployeeContract> {
    const response = await apiClient.put<{ data: EmployeeContract }>(
      `${BASE_PATH}/employees/${employeeId}/contracts/${contractId}`,
      data,
    );
    return response.data.data;
  },

  async deleteEmployeeContract(
    employeeId: string,
    contractId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE_PATH}/employees/${employeeId}/contracts/${contractId}`,
    );
  },

  async terminateEmployeeContract(
    employeeId: string,
    contractId: string,
    data: TerminateEmployeeContractData,
  ): Promise<EmployeeContract> {
    const response = await apiClient.post<{ data: EmployeeContract }>(
      `${BASE_PATH}/employees/${employeeId}/contracts/${contractId}/terminate`,
      data,
    );
    return response.data.data;
  },

  async renewEmployeeContract(
    employeeId: string,
    contractId: string,
    data: RenewEmployeeContractData,
  ): Promise<EmployeeContract> {
    const response = await apiClient.post<{ data: EmployeeContract }>(
      `${BASE_PATH}/employees/${employeeId}/contracts/${contractId}/renew`,
      data,
    );
    return response.data.data;
  },

  async correctActiveEmployeeContract(
    employeeId: string,
    data: CorrectEmployeeContractData,
  ): Promise<EmployeeContract> {
    const response = await apiClient.patch<{ data: EmployeeContract }>(
      `${BASE_PATH}/employees/${employeeId}/contracts/active`,
      data,
    );
    return response.data.data;
  },

  // Education history management
  async getEmployeeEducationHistories(
    employeeId: string,
  ): Promise<EmployeeEducationHistory[]> {
    const response = await apiClient.get<{
      data: EmployeeEducationHistory[];
    }>(`${BASE_PATH}/employees/${employeeId}/education-histories`);
    return response.data.data;
  },

  async createEmployeeEducationHistory(
    employeeId: string,
    data: CreateEmployeeEducationHistoryData,
  ): Promise<EmployeeEducationHistory> {
    const response = await apiClient.post<{
      data: EmployeeEducationHistory;
    }>(`${BASE_PATH}/employees/${employeeId}/education-histories`, data);
    return response.data.data;
  },

  async updateEmployeeEducationHistory(
    employeeId: string,
    educationId: string,
    data: UpdateEmployeeEducationHistoryData,
  ): Promise<EmployeeEducationHistory> {
    const response = await apiClient.put<{
      data: EmployeeEducationHistory;
    }>(
      `${BASE_PATH}/employees/${employeeId}/education-histories/${educationId}`,
      data,
    );
    return response.data.data;
  },

  async deleteEmployeeEducationHistory(
    employeeId: string,
    educationId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE_PATH}/employees/${employeeId}/education-histories/${educationId}`,
    );
  },

  // Certification management
  async getEmployeeCertifications(
    employeeId: string,
  ): Promise<EmployeeCertification[]> {
    const response = await apiClient.get<{
      data: EmployeeCertification[];
    }>(`${BASE_PATH}/employees/${employeeId}/certifications`);
    return response.data.data;
  },

  async createEmployeeCertification(
    employeeId: string,
    data: CreateEmployeeCertificationData,
  ): Promise<EmployeeCertification> {
    const response = await apiClient.post<{
      data: EmployeeCertification;
    }>(`${BASE_PATH}/employees/${employeeId}/certifications`, data);
    return response.data.data;
  },

  async updateEmployeeCertification(
    employeeId: string,
    certId: string,
    data: UpdateEmployeeCertificationData,
  ): Promise<EmployeeCertification> {
    const response = await apiClient.put<{
      data: EmployeeCertification;
    }>(
      `${BASE_PATH}/employees/${employeeId}/certifications/${certId}`,
      data,
    );
    return response.data.data;
  },

  async deleteEmployeeCertification(
    employeeId: string,
    certId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE_PATH}/employees/${employeeId}/certifications/${certId}`,
    );
  },

  // Asset management
  async getEmployeeAssets(employeeId: string): Promise<EmployeeAsset[]> {
    const response = await apiClient.get<{
      data: EmployeeAsset[];
    }>(`${BASE_PATH}/employees/${employeeId}/assets`);
    return response.data.data;
  },

  async createEmployeeAsset(
    employeeId: string,
    data: CreateEmployeeAssetData,
  ): Promise<EmployeeAsset> {
    const response = await apiClient.post<{
      data: EmployeeAsset;
    }>(`${BASE_PATH}/employees/${employeeId}/assets`, data);
    return response.data.data;
  },

  async updateEmployeeAsset(
    employeeId: string,
    assetId: string,
    data: UpdateEmployeeAssetData,
  ): Promise<EmployeeAsset> {
    const response = await apiClient.put<{
      data: EmployeeAsset;
    }>(`${BASE_PATH}/employees/${employeeId}/assets/${assetId}`, data);
    return response.data.data;
  },

  async returnEmployeeAsset(
    employeeId: string,
    assetId: string,
    data: ReturnEmployeeAssetData,
  ): Promise<EmployeeAsset> {
    const response = await apiClient.post<{
      data: EmployeeAsset;
    }>(`${BASE_PATH}/employees/${employeeId}/assets/${assetId}/return`, data);
    return response.data.data;
  },

  async deleteEmployeeAsset(
    employeeId: string,
    assetId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE_PATH}/employees/${employeeId}/assets/${assetId}`,
    );
  },
};
