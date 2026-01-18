import apiClient from "@/lib/api-client";
import type {
  Employee,
  EmployeeListResponse,
  EmployeeSingleResponse,
  ListEmployeesParams,
  CreateEmployeeData,
  UpdateEmployeeData,
  ApproveEmployeeData,
  AssignEmployeeAreasData,
} from "../types";

const BASE_PATH = "/organization";

export const employeeService = {
  async list(params?: ListEmployeesParams): Promise<EmployeeListResponse> {
    const response = await apiClient.get<EmployeeListResponse>(
      `${BASE_PATH}/employees`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<EmployeeSingleResponse> {
    const response = await apiClient.get<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}`
    );
    return response.data;
  },

  async create(data: CreateEmployeeData): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateEmployeeData
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.put<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/employees/${id}`
    );
    return response.data;
  },

  async submitForApproval(id: string): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}/submit`
    );
    return response.data;
  },

  async approve(
    id: string,
    data: ApproveEmployeeData
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}/approve`,
      data
    );
    return response.data;
  },

  async assignAreas(
    id: string,
    data: AssignEmployeeAreasData
  ): Promise<EmployeeSingleResponse> {
    const response = await apiClient.post<EmployeeSingleResponse>(
      `${BASE_PATH}/employees/${id}/areas`,
      data
    );
    return response.data;
  },
};
