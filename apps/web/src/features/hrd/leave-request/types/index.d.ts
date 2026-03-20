export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveDuration = "FULL_DAY" | "HALF_DAY" | "MULTI_DAY";

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_cut_annual_leave: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  remaining_balance?: number;
}

export interface LeaveRequest {
  id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  total_days: number;
  reason: string;
  status: LeaveRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestDetail {
  id: string;
  employee_id: string;
  employee: Employee;
  leave_type_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  total_days: number;
  reason: string;
  status: LeaveRequestStatus;
  approved_by_id: string | null;
  approved_by: Employee | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  employee_id: string;
  employee: Employee;
  leave_type_id: string;
  leave_type: LeaveType;
  total_leave_quota: number;
  used_leave: number;
  leave_balance: number;
}

export interface LeaveRequestsResponse {
  success: boolean;
  data: LeaveRequest[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface LeaveRequestDetailResponse {
  success: boolean;
  data: LeaveRequestDetail;
  timestamp: string;
  request_id: string;
}

export interface LeaveBalancesResponse {
  success: boolean;
  data: LeaveBalance[];
  timestamp: string;
  request_id: string;
}

// Backend GetMyBalance returns a single object, not an array
export interface MyLeaveBalance {
  employee_id: string;
  total_quota: number;
  used_days: number;
  remaining_balance: number;
  carry_over_balance: number;
  total_available_leave: number;
  pending_requests_days: number;
  calculated_at: string;
}

export interface MyLeaveBalanceResponse {
  success: boolean;
  data: MyLeaveBalance;
  timestamp: string;
  request_id: string;
}

export interface LeaveFormData {
  leave_types: LeaveType[];
  employees: Employee[];
}

export interface LeaveFormDataResponse {
  success: boolean;
  data: LeaveFormData;
  timestamp: string;
  request_id: string;
}

export interface CreateLeaveRequestPayload {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  reason: string;
}

export interface UpdateLeaveRequestPayload {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  reason: string;
}

export interface ApproveLeaveRequestPayload {
  notes?: string;
}

export interface RejectLeaveRequestPayload {
  rejection_note: string;
}

export interface CancelLeaveRequestPayload {
  cancellation_note?: string;
}

export interface CreateLeaveRequestFormData {
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  duration: LeaveDuration;
  reason: string;
}

export interface UpdateLeaveRequestFormData {
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  duration: LeaveDuration;
  reason: string;
}

export interface ApproveLeaveRequestFormData {
  notes?: string;
}

export interface RejectLeaveRequestFormData {
  rejection_note: string;
}

export interface CancelLeaveRequestFormData {
  cancellation_note?: string;
}

export interface LeaveRequestFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: LeaveRequestStatus;
  leave_type_id?: string;
  employee_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface LeaveRequestAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface LeaveRequestAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: LeaveRequestAuditTrailUser | null;
  created_at: string;
}

export interface LeaveRequestAuditTrailResponse {
  success: boolean;
  data: LeaveRequestAuditTrailEntry[];
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
