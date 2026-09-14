export type AssetCategory =
  | "electronics"
  | "vehicles"
  | "office_equipment"
  | "audio_visual"
  | "it_hardware";

export type AssetItemStatus =
  | "available"
  | "borrowed"
  | "maintenance"
  | "disposed";

export type AssetCondition =
  | "excellent"
  | "good"
  | "fair"
  | "damaged"
  | "under_repair";

export type BorrowingStatus =
  | "draft"
  | "pending"
  | "approved"
  | "borrowed"
  | "returned"
  | "rejected"
  | "overdue"
  | "cancelled";

export type DamageSeverity = "low" | "medium" | "high" | "critical";

export type DamageReportStatus =
  | "reported"
  | "in_review"
  | "repaired"
  | "scrapped";

export type MaintenanceServiceType =
  | "routine_service"
  | "repair"
  | "calibration"
  | "inspection";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed";

export interface CurrentBorrower {
  employee_id: string;
  employee_name: string;
  department: string;
  borrowed_at: string;
  expected_return: string;
}

export interface AssetItem {
  id: string;
  code: string;
  finance_asset_code: string;
  name: string;
  category: AssetCategory;
  serial_number: string;
  location: string;
  status: AssetItemStatus;
  condition: AssetCondition;
  purchase_date: string;
  book_value: number;
  warranty_until: string;
  description?: string;
  custodian?: string;
  image_url: string;
  current_borrower?: CurrentBorrower;
}

export interface BorrowingRequest {
  id: string;
  request_number: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  asset_category: AssetCategory;
  borrower_id: string;
  borrower_name: string;
  borrower_department: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  purpose: string;
  initial_condition_notes?: string;
  return_condition_notes?: string;
  status: BorrowingStatus;
  approver_name?: string;
  approval_date?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface DamageReport {
  id: string;
  asset_id: string;
  report_number: string;
  reported_by_id: string;
  reported_by_name: string;
  severity: DamageSeverity;
  description: string;
  reported_date: string;
  status: DamageReportStatus;
  resolution_notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  maintenance_number: string;
  service_type: MaintenanceServiceType;
  maintenance_date: string;
  completion_date?: string;
  cost: number;
  vendor_name: string;
  notes: string;
  status: MaintenanceStatus;
}
