// Employee Certification types for Sprint 14

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface EmployeeCertification {
  id: string;
  employee_id: string;
  employee?: Employee;
  certificate_name: string;
  issued_by: string;
  issue_date: string;
  expiry_date?: string | null;
  certificate_number?: string | null;
  certificate_file?: string | null;
  description?: string | null;
  is_expired: boolean;
  days_until_expiry: number;
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListCertificationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
}

// Create request data
export interface CreateCertificationData {
  employee_id: string;
  certificate_name: string;
  issued_by: string;
  issue_date: string;
  expiry_date?: string | null;
  certificate_number?: string | null;
  certificate_file?: string | null;
  description?: string | null;
}

// Update request data  
export interface UpdateCertificationData {
  certificate_name?: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string | null;
  certificate_number?: string | null;
  certificate_file?: string | null;
  description?: string | null;
}

// Form data response
export interface CertificationFormData {
  employees: EmployeeFormOption[];
}

export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
}

// API response types
export interface CertificationResponse {
  success: boolean;
  data: EmployeeCertification;
  timestamp: string;
  request_id: string;
}

export interface CertificationListResponse {
  success: boolean;
  data: EmployeeCertification[];
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

export interface CertificationFormDataResponse {
  success: boolean;
  data: CertificationFormData;
  timestamp: string;
  request_id: string;
}

// Expiring certifications params
export interface ExpiringCertificationsParams {
  days?: number;
}
