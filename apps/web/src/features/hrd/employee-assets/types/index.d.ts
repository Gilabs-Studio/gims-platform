// Employee Asset Types - HRD Module

export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
export type AssetStatus = "BORROWED" | "RETURNED";

export interface EmployeeSimple {
  id: string;
  employee_code: string;
  name: string;
}

export interface EmployeeAsset {
  id: string;
  employee_id: string;
  employee: EmployeeSimple | null;
  asset_name: string;
  asset_code: string;
  asset_category: string;
  borrow_date: string;
  return_date: string | null;
  borrow_condition: AssetCondition;
  return_condition: AssetCondition | null;
  notes: string | null;
  status: AssetStatus;
  days_borrowed: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAssetListResponse {
  success: boolean;
  data: EmployeeAsset[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface EmployeeAssetDetailResponse {
  success: boolean;
  data: EmployeeAsset;
  timestamp: string;
  request_id: string;
}

export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface EmployeeAssetFormData {
  employees: EmployeeFormOption[];
}

export interface EmployeeAssetFormDataResponse {
  success: boolean;
  data: EmployeeAssetFormData;
  timestamp: string;
  request_id: string;
}

export interface CreateEmployeeAssetRequest {
  employee_id: string;
  asset_name: string;
  asset_code: string;
  asset_category: string;
  borrow_date: string;
  borrow_condition: AssetCondition;
  notes?: string;
}

export interface UpdateEmployeeAssetRequest {
  asset_name?: string;
  asset_code?: string;
  asset_category?: string;
  borrow_date?: string;
  borrow_condition?: AssetCondition;
  notes?: string;
}

export interface ReturnAssetRequest {
  return_date: string;
  return_condition: AssetCondition;
  notes?: string;
}

export interface EmployeeAssetFilters {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  status?: AssetStatus | "";
}
