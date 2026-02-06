// Employee Contract types for Sprint 14

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export type ContractType = "PERMANENT" | "CONTRACT" | "INTERNSHIP" | "PROBATION";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";

export interface EmployeeContract {
  id: string;
  employee_id: string;
  employee?: Employee;
  contract_number: string;
  contract_type: ContractType;
  start_date: string;
  end_date?: string;
  salary: number;
  job_title: string;
  department?: string;
  terms?: string;
  document_path?: string;
  status: ContractStatus;
  is_expiring_soon?: boolean;
  days_until_expiry?: number;
  created_by: string;
  created_by_user?: User;
  updated_by?: string;
  updated_by_user?: User;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Optimized list item (lighter response without department/terms/document_path)
export interface EmployeeContractListItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  contract_number: string;
  contract_type: ContractType;
  start_date: string;
  end_date?: string;
  salary: number;
  job_title: string;
  status: ContractStatus;
  is_expiring_soon?: boolean;
  days_until_expiry?: number;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface EmployeeContractListResponse {
  success: boolean;
  data: EmployeeContractListItem[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface EmployeeContractSingleResponse {
  success: boolean;
  data: EmployeeContract;
  timestamp: string;
  request_id: string;
}

// Form data response types
export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface ContractTypeOption {
  value: string;
  label: string;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface EmployeeContractFormData {
  employees: EmployeeFormOption[];
  contract_types: ContractTypeOption[];
  statuses: StatusOption[];
}

export interface EmployeeContractFormDataResponse {
  success: boolean;
  data: EmployeeContractFormData;
  timestamp: string;
  request_id: string;
}

// Query params
export interface ListEmployeeContractsParams {
  page?: number;
  per_page?: number;
  employee_id?: string;
  status?: ContractStatus;
  contract_type?: ContractType;
  search?: string;
}

export interface ExpiringContractsParams {
  page?: number;
  per_page?: number;
  days?: number;
}

// Request data types
export interface CreateEmployeeContractData {
  employee_id: string;
  contract_number: string;
  contract_type: ContractType;
  start_date: string;
  end_date?: string;
  salary: number;
  job_title: string;
  department?: string;
  terms?: string;
  document_path?: string;
  status?: ContractStatus;
}

export interface UpdateEmployeeContractData {
  contract_number?: string;
  contract_type?: ContractType;
  start_date?: string;
  end_date?: string;
  salary?: number;
  job_title?: string;
  department?: string;
  terms?: string;
  document_path?: string;
  status?: ContractStatus;
}
