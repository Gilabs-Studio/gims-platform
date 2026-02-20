import apiClient from "@/lib/api-client";
import type {
  EvaluationGroupListResponse,
  EvaluationGroupSingleResponse,
  EvaluationCriteriaListResponse,
  EvaluationCriteriaSingleResponse,
  EmployeeEvaluationListResponse,
  EmployeeEvaluationSingleResponse,
  EmployeeEvaluationFormDataResponse,
  ListEvaluationGroupsParams,
  ListEvaluationCriteriaParams,
  ListEmployeeEvaluationsParams,
  CreateEvaluationGroupData,
  UpdateEvaluationGroupData,
  CreateEvaluationCriteriaData,
  UpdateEvaluationCriteriaData,
  CreateEmployeeEvaluationData,
  UpdateEmployeeEvaluationData,
  UpdateEvaluationStatusData,
} from "../types";

const GROUP_PATH = "/hrd/evaluation-groups";
const CRITERIA_PATH = "/hrd/evaluation-criteria";
const EVALUATION_PATH = "/hrd/employee-evaluations";

// ---- Evaluation Group Service ----

export const evaluationGroupService = {
  async list(params?: ListEvaluationGroupsParams): Promise<EvaluationGroupListResponse> {
    const response = await apiClient.get<EvaluationGroupListResponse>(GROUP_PATH, { params });
    return response.data;
  },

  async getById(id: string): Promise<EvaluationGroupSingleResponse> {
    const response = await apiClient.get<EvaluationGroupSingleResponse>(`${GROUP_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreateEvaluationGroupData): Promise<EvaluationGroupSingleResponse> {
    const response = await apiClient.post<EvaluationGroupSingleResponse>(GROUP_PATH, data);
    return response.data;
  },

  async update(id: string, data: UpdateEvaluationGroupData): Promise<EvaluationGroupSingleResponse> {
    const response = await apiClient.put<EvaluationGroupSingleResponse>(`${GROUP_PATH}/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`${GROUP_PATH}/${id}`);
    return response.data;
  },
};

// ---- Evaluation Criteria Service ----

export const evaluationCriteriaService = {
  async list(params?: ListEvaluationCriteriaParams): Promise<EvaluationCriteriaListResponse> {
    const response = await apiClient.get<EvaluationCriteriaListResponse>(CRITERIA_PATH, { params });
    return response.data;
  },

  async getByGroupId(
    groupId: string,
    params?: ListEvaluationCriteriaParams,
  ): Promise<EvaluationCriteriaListResponse> {
    const response = await apiClient.get<EvaluationCriteriaListResponse>(
      `${CRITERIA_PATH}/group/${groupId}`,
      { params },
    );
    return response.data;
  },

  async getById(id: string): Promise<EvaluationCriteriaSingleResponse> {
    const response = await apiClient.get<EvaluationCriteriaSingleResponse>(`${CRITERIA_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreateEvaluationCriteriaData): Promise<EvaluationCriteriaSingleResponse> {
    const response = await apiClient.post<EvaluationCriteriaSingleResponse>(CRITERIA_PATH, data);
    return response.data;
  },

  async update(id: string, data: UpdateEvaluationCriteriaData): Promise<EvaluationCriteriaSingleResponse> {
    const response = await apiClient.put<EvaluationCriteriaSingleResponse>(`${CRITERIA_PATH}/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`${CRITERIA_PATH}/${id}`);
    return response.data;
  },
};

// ---- Employee Evaluation Service ----

export const employeeEvaluationService = {
  async list(params?: ListEmployeeEvaluationsParams): Promise<EmployeeEvaluationListResponse> {
    const response = await apiClient.get<EmployeeEvaluationListResponse>(EVALUATION_PATH, { params });
    return response.data;
  },

  async getById(id: string): Promise<EmployeeEvaluationSingleResponse> {
    const response = await apiClient.get<EmployeeEvaluationSingleResponse>(`${EVALUATION_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreateEmployeeEvaluationData): Promise<EmployeeEvaluationSingleResponse> {
    const response = await apiClient.post<EmployeeEvaluationSingleResponse>(EVALUATION_PATH, data);
    return response.data;
  },

  async update(id: string, data: UpdateEmployeeEvaluationData): Promise<EmployeeEvaluationSingleResponse> {
    const response = await apiClient.put<EmployeeEvaluationSingleResponse>(`${EVALUATION_PATH}/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`${EVALUATION_PATH}/${id}`);
    return response.data;
  },

  async updateStatus(id: string, data: UpdateEvaluationStatusData): Promise<EmployeeEvaluationSingleResponse> {
    const response = await apiClient.post<EmployeeEvaluationSingleResponse>(
      `${EVALUATION_PATH}/${id}/status`,
      data,
    );
    return response.data;
  },

  async getFormData(): Promise<EmployeeEvaluationFormDataResponse> {
    const response = await apiClient.get<EmployeeEvaluationFormDataResponse>(`${EVALUATION_PATH}/form-data`);
    return response.data;
  },
};
