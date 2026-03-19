import apiClient from "@/lib/api-client";
import type {
  RecruitmentApplicantListResponse,
  RecruitmentApplicantSingleResponse,
  ApplicantsByStageResponse,
  ApplicantStageListResponse,
  ApplicantActivityListResponse,
  ApplicantActivitySingleResponse,
  ListApplicantsParams,
  ListApplicantsByStageParams,
  CreateApplicantData,
  UpdateApplicantData,
  MoveStageData,
  CreateActivityData,
  ConvertApplicantToEmployeeData,
  CanConvertResponse,
} from "../types";

const BASE_PATH = "/hrd/applicants";

export const applicantService = {
  // List all applicants with filters
  async list(params?: ListApplicantsParams): Promise<RecruitmentApplicantListResponse> {
    const response = await apiClient.get<RecruitmentApplicantListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  // Get applicants grouped by stage (for Kanban board)
  async listByStage(
    params?: ListApplicantsByStageParams
  ): Promise<{ success: boolean; data: ApplicantsByStageResponse; timestamp: string; request_id: string }> {
    const response = await apiClient.get<{
      success: boolean;
      data: ApplicantsByStageResponse;
      timestamp: string;
      request_id: string;
    }>(`${BASE_PATH}/by-stage`, { params });
    return response.data;
  },

  // Get single applicant
  async getById(id: string): Promise<RecruitmentApplicantSingleResponse> {
    const response = await apiClient.get<RecruitmentApplicantSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  // Create applicant
  async create(data: CreateApplicantData): Promise<RecruitmentApplicantSingleResponse> {
    const response = await apiClient.post<RecruitmentApplicantSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  // Update applicant
  async update(
    id: string,
    data: UpdateApplicantData
  ): Promise<RecruitmentApplicantSingleResponse> {
    const response = await apiClient.put<RecruitmentApplicantSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  // Delete applicant
  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  // Move applicant to different stage
  async moveStage(
    id: string,
    data: MoveStageData
  ): Promise<RecruitmentApplicantSingleResponse> {
    const response = await apiClient.post<RecruitmentApplicantSingleResponse>(
      `${BASE_PATH}/${id}/move-stage`,
      data
    );
    return response.data;
  },

  // Get all stages
  async getStages(): Promise<ApplicantStageListResponse> {
    const response = await apiClient.get<ApplicantStageListResponse>(
      "/hrd/applicant-stages"
    );
    return response.data;
  },

  // Get applicant activities
  async getActivities(
    applicantId: string,
    page = 1,
    perPage = 20
  ): Promise<ApplicantActivityListResponse> {
    const response = await apiClient.get<ApplicantActivityListResponse>(
      `${BASE_PATH}/${applicantId}/activities`,
      { params: { page, per_page: perPage } }
    );
    return response.data;
  },

  // Add activity to applicant
  async addActivity(
    applicantId: string,
    data: CreateActivityData
  ): Promise<ApplicantActivitySingleResponse> {
    const response = await apiClient.post<ApplicantActivitySingleResponse>(
      `${BASE_PATH}/${applicantId}/activities`,
      data
    );
    return response.data;
  },

  // Get applicants by recruitment request
  async getByRecruitmentRequest(
    recruitmentRequestId: string,
    page = 1,
    perPage = 20
  ): Promise<RecruitmentApplicantListResponse> {
    const response = await apiClient.get<RecruitmentApplicantListResponse>(
      `/hrd/recruitment-requests/${recruitmentRequestId}/applicants`,
      { params: { page, per_page: perPage } }
    );
    return response.data;
  },

  // Check if applicant can be converted to employee
  async canConvertToEmployee(id: string): Promise<CanConvertResponse> {
    const response = await apiClient.get<CanConvertResponse>(
      `${BASE_PATH}/${id}/can-convert`
    );
    return response.data;
  },

  // Convert applicant to employee
  async convertToEmployee(
    id: string,
    data: ConvertApplicantToEmployeeData
  ): Promise<RecruitmentApplicantSingleResponse> {
    const response = await apiClient.post<RecruitmentApplicantSingleResponse>(
      `${BASE_PATH}/${id}/convert-to-employee`,
      data
    );
    return response.data;
  },
};
