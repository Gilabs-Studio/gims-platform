import apiClient from "@/lib/api-client";
import type {
  Division,
  JobPosition,
  BusinessUnit,
  BusinessType,
  Area,
  AreaDetailResponse,
  AssignAreaSupervisorsData,
  AssignAreaMembersData,
  Company,
  OrganizationListResponse,
  OrganizationSingleResponse,
  ListOrganizationParams,
  ListCompaniesParams,
  CreateDivisionData,
  UpdateDivisionData,
  CreateJobPositionData,
  UpdateJobPositionData,
  CreateBusinessUnitData,
  UpdateBusinessUnitData,
  CreateBusinessTypeData,
  UpdateBusinessTypeData,
  CreateAreaData,
  UpdateAreaData,
  CreateCompanyData,
  UpdateCompanyData,
  ApproveCompanyData,
} from "../types";

const BASE_PATH = "/organization";

// Division Service
export const divisionService = {
  async list(
    params?: ListOrganizationParams
  ): Promise<OrganizationListResponse<Division>> {
    const response = await apiClient.get<OrganizationListResponse<Division>>(
      `${BASE_PATH}/divisions`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<Division>> {
    const response = await apiClient.get<OrganizationSingleResponse<Division>>(
      `${BASE_PATH}/divisions/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateDivisionData
  ): Promise<OrganizationSingleResponse<Division>> {
    const response = await apiClient.post<OrganizationSingleResponse<Division>>(
      `${BASE_PATH}/divisions`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateDivisionData
  ): Promise<OrganizationSingleResponse<Division>> {
    const response = await apiClient.put<OrganizationSingleResponse<Division>>(
      `${BASE_PATH}/divisions/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/divisions/${id}`
    );
    return response.data;
  },
};

// Job Position Service
export const jobPositionService = {
  async list(
    params?: ListOrganizationParams
  ): Promise<OrganizationListResponse<JobPosition>> {
    const response = await apiClient.get<OrganizationListResponse<JobPosition>>(
      `${BASE_PATH}/job-positions`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<JobPosition>> {
    const response = await apiClient.get<OrganizationSingleResponse<JobPosition>>(
      `${BASE_PATH}/job-positions/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateJobPositionData
  ): Promise<OrganizationSingleResponse<JobPosition>> {
    const response = await apiClient.post<OrganizationSingleResponse<JobPosition>>(
      `${BASE_PATH}/job-positions`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateJobPositionData
  ): Promise<OrganizationSingleResponse<JobPosition>> {
    const response = await apiClient.put<OrganizationSingleResponse<JobPosition>>(
      `${BASE_PATH}/job-positions/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/job-positions/${id}`
    );
    return response.data;
  },
};

// Business Unit Service
export const businessUnitService = {
  async list(
    params?: ListOrganizationParams
  ): Promise<OrganizationListResponse<BusinessUnit>> {
    const response = await apiClient.get<OrganizationListResponse<BusinessUnit>>(
      `${BASE_PATH}/business-units`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<BusinessUnit>> {
    const response = await apiClient.get<OrganizationSingleResponse<BusinessUnit>>(
      `${BASE_PATH}/business-units/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateBusinessUnitData
  ): Promise<OrganizationSingleResponse<BusinessUnit>> {
    const response = await apiClient.post<OrganizationSingleResponse<BusinessUnit>>(
      `${BASE_PATH}/business-units`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateBusinessUnitData
  ): Promise<OrganizationSingleResponse<BusinessUnit>> {
    const response = await apiClient.put<OrganizationSingleResponse<BusinessUnit>>(
      `${BASE_PATH}/business-units/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/business-units/${id}`
    );
    return response.data;
  },
};

// Business Type Service
export const businessTypeService = {
  async list(
    params?: ListOrganizationParams
  ): Promise<OrganizationListResponse<BusinessType>> {
    const response = await apiClient.get<OrganizationListResponse<BusinessType>>(
      `${BASE_PATH}/business-types`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<BusinessType>> {
    const response = await apiClient.get<OrganizationSingleResponse<BusinessType>>(
      `${BASE_PATH}/business-types/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateBusinessTypeData
  ): Promise<OrganizationSingleResponse<BusinessType>> {
    const response = await apiClient.post<OrganizationSingleResponse<BusinessType>>(
      `${BASE_PATH}/business-types`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateBusinessTypeData
  ): Promise<OrganizationSingleResponse<BusinessType>> {
    const response = await apiClient.put<OrganizationSingleResponse<BusinessType>>(
      `${BASE_PATH}/business-types/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/business-types/${id}`
    );
    return response.data;
  },
};

// Area Service
export const areaService = {
  async list(
    params?: ListOrganizationParams
  ): Promise<OrganizationListResponse<Area>> {
    const response = await apiClient.get<OrganizationListResponse<Area>>(
      `${BASE_PATH}/areas`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<Area>> {
    const response = await apiClient.get<OrganizationSingleResponse<Area>>(
      `${BASE_PATH}/areas/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateAreaData
  ): Promise<OrganizationSingleResponse<Area>> {
    const response = await apiClient.post<OrganizationSingleResponse<Area>>(
      `${BASE_PATH}/areas`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateAreaData
  ): Promise<OrganizationSingleResponse<Area>> {
    const response = await apiClient.put<OrganizationSingleResponse<Area>>(
      `${BASE_PATH}/areas/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/areas/${id}`
    );
    return response.data;
  },

  async getDetail(id: string): Promise<OrganizationSingleResponse<AreaDetailResponse>> {
    const response = await apiClient.get<OrganizationSingleResponse<AreaDetailResponse>>(
      `${BASE_PATH}/areas/${id}/detail`
    );
    return response.data;
  },

  async assignSupervisors(id: string, data: AssignAreaSupervisorsData): Promise<OrganizationSingleResponse<AreaDetailResponse>> {
    const response = await apiClient.post<OrganizationSingleResponse<AreaDetailResponse>>(
      `${BASE_PATH}/areas/${id}/supervisors`,
      data
    );
    return response.data;
  },

  async assignMembers(id: string, data: AssignAreaMembersData): Promise<OrganizationSingleResponse<AreaDetailResponse>> {
    const response = await apiClient.post<OrganizationSingleResponse<AreaDetailResponse>>(
      `${BASE_PATH}/areas/${id}/members`,
      data
    );
    return response.data;
  },

  async removeEmployee(areaId: string, employeeId: string): Promise<OrganizationSingleResponse<AreaDetailResponse>> {
    const response = await apiClient.delete<OrganizationSingleResponse<AreaDetailResponse>>(
      `${BASE_PATH}/areas/${areaId}/employees/${employeeId}`
    );
    return response.data;
  },
};

// Company Service
export const companyService = {
  async list(
    params?: ListCompaniesParams
  ): Promise<OrganizationListResponse<Company>> {
    const response = await apiClient.get<OrganizationListResponse<Company>>(
      `${BASE_PATH}/companies`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OrganizationSingleResponse<Company>> {
    const response = await apiClient.get<OrganizationSingleResponse<Company>>(
      `${BASE_PATH}/companies/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateCompanyData
  ): Promise<OrganizationSingleResponse<Company>> {
    const response = await apiClient.post<OrganizationSingleResponse<Company>>(
      `${BASE_PATH}/companies`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateCompanyData
  ): Promise<OrganizationSingleResponse<Company>> {
    const response = await apiClient.put<OrganizationSingleResponse<Company>>(
      `${BASE_PATH}/companies/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/companies/${id}`
    );
    return response.data;
  },

  async submitForApproval(id: string): Promise<OrganizationSingleResponse<Company>> {
    const response = await apiClient.post<OrganizationSingleResponse<Company>>(
      `${BASE_PATH}/companies/${id}/submit`
    );
    return response.data;
  },

  async approve(
    id: string,
    data: ApproveCompanyData
  ): Promise<OrganizationSingleResponse<Company>> {
    const response = await apiClient.post<OrganizationSingleResponse<Company>>(
      `${BASE_PATH}/companies/${id}/approve`,
      data
    );
    return response.data;
  },
};
