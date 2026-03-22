export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number | null;
  prev_page?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: { field: string; order: string };
  };
  error?: string;
}

// Extended Asset Status untuk lifecycle management
export type AssetStatus =
  | "draft"
  | "pending_capitalization"
  | "active"
  | "in_use"
  | "under_maintenance"
  | "idle"
  | "disposed"
  | "sold"
  | "written_off"
  | "transferred";

export type AssetLifecycleStage =
  | "draft"
  | "pending_capitalization"
  | "active"
  | "in_use"
  | "under_maintenance"
  | "disposed"
  | "written_off";

export interface AssetCategoryLite {
  id: string;
  name: string;
  depreciation_method?: string;
  useful_life_months?: number;
  is_depreciable?: boolean;
}

export interface AssetLocationLite {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// NEW: Company, Business Unit, Department interfaces
export interface CompanyLite {
  id: string;
  name: string;
  code?: string;
}

export interface BusinessUnitLite {
  id: string;
  name: string;
  code?: string;
}

export interface DepartmentLite {
  id: string;
  name: string;
  code?: string;
}

export interface EmployeeLite {
  id: string;
  name: string;
  employee_code?: string;
  position?: string;
  avatar_url?: string;
}

export interface ContactLite {
  id: string;
  name: string;
  contact_type?: string;
}

export interface PurchaseOrderLite {
  id: string;
  po_number: string;
  po_date?: string;
}

export interface SupplierInvoiceLite {
  id: string;
  invoice_number: string;
  invoice_date?: string;
}

export interface UserLite {
  id: string;
  name: string;
  email: string;
}

export interface AssetTransaction {
  id: string;
  asset_id: string;
  type: string;
  transaction_date: string;
  description: string;
  amount: number;
  status: "DRAFT" | "APPROVED" | "CANCELLED";
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface AssetDepreciation {
  id: string;
  asset_id: string;
  period: string;
  depreciation_date: string;
  method: string;
  amount: number;
  accumulated: number;
  book_value: number;
  journal_entry_id?: string | null;
  created_at: string;
}

// NEW: Asset Attachment interface
export interface AssetAttachment {
  id: string;
  asset_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
  created_at: string;
}

// NEW: Asset Audit Log interface
export interface AssetAuditLog {
  id: string;
  asset_id: string;
  action: string;
  changes?: Array<{
    field: string;
    old_value: unknown;
    new_value: unknown;
  }>;
  performed_by?: string;
  performed_at: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// NEW: Asset Assignment History interface
export interface AssetAssignmentHistory {
  id: string;
  asset_id: string;
  employee_id?: string;
  employee_name?: string;
  department_id?: string;
  location_id?: string;
  assigned_at: string;
  assigned_by?: string;
  returned_at?: string;
  return_reason?: string;
  notes?: string;
  created_at: string;
}

// NEW: Warranty & Insurance interfaces
export interface AssetWarranty {
  warranty_start?: string;
  warranty_end?: string;
  warranty_provider?: string;
  warranty_terms?: string;
}

export interface AssetInsurance {
  insurance_policy_number?: string;
  insurance_provider?: string;
  insurance_start?: string;
  insurance_end?: string;
  insurance_value?: number;
}

// NEW: Depreciation Configuration per asset (override category)
export interface AssetDepreciationConfig {
  method: "SL" | "DB" | "SYD" | "UOP" | "NONE";
  useful_life_months: number;
  useful_life_years: number;
  salvage_value: number;
  depreciation_rate?: number; // For DB method
  start_date: string;
}

// NEW: Acquisition Cost Breakdown
export interface AssetAcquisitionCostBreakdown {
  base_price: number;
  shipping_cost: number;
  installation_cost: number;
  tax_amount: number;
  other_costs: number;
  total_cost: number;
  // Acquisition source details
  supplier_id?: string;
  supplier_name?: string;
  purchase_order_id?: string;
  po_number?: string;
  supplier_invoice_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  is_paid?: boolean;
}

// Enhanced Asset interface matching flat backend response
export interface Asset {
  // Basic fields
  id: string;
  code: string;
  name: string;
  description: string;
  category_id: string;
  category?: AssetCategoryLite | null;
  location_id: string;
  location?: AssetLocationLite | null;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value: number;
  accumulated_depreciation: number;
  book_value: number;
  status: AssetStatus;
  disposed_at?: string | null;
  created_at: string;
  updated_at: string;
  depreciations?: AssetDepreciation[];
  transactions?: AssetTransaction[];

  // Identity
  serial_number?: string;
  barcode?: string;
  qr_code?: string;
  asset_tag?: string;

  // Organization
  company_id?: string;
  business_unit_id?: string;
  department_id?: string;

  // Assignment (flat)
  assigned_to_employee_id?: string;
  assignment_date?: string;

  // Cost Breakdown (flat)
  shipping_cost: number;
  installation_cost: number;
  tax_amount: number;
  other_costs: number;
  total_cost: number;

  // Depreciation Config (flat)
  depreciation_method?: string;
  useful_life_months?: number;
  depreciation_start_date?: string;

  // Lifecycle (flat)
  lifecycle_stage: AssetLifecycleStage;
  is_capitalized: boolean;
  is_depreciable: boolean;
  is_fully_deprecated: boolean;
  depreciation_progress: number;
  age_in_months: number;

  // Parent/Child
  parent_asset_id?: string;
  parent_asset?: AssetLite;
  is_parent: boolean;
  child_assets?: AssetLite[];

  // Warranty (flat)
  warranty_start?: string;
  warranty_end?: string;
  warranty_provider?: string;
  warranty_terms?: string;
  is_under_warranty: boolean;
  warranty_days_remaining: number;

  // Insurance (flat)
  insurance_policy_number?: string;
  insurance_provider?: string;
  insurance_start?: string;
  insurance_end?: string;
  insurance_value?: number;
  is_insured: boolean;

  // Audit
  created_by?: string;
  approved_by?: string;
  approved_at?: string;

  // Relations (populated by detail endpoint)
  attachments?: AssetAttachment[];
  audit_logs?: AssetAuditLog[];
  assignment_histories?: AssetAssignmentHistory[];

  // Legacy nested interfaces (for backward compatibility)
  warranty?: AssetWarranty;
  insurance?: AssetInsurance;
  acquisition_cost_breakdown?: AssetAcquisitionCostBreakdown;
  depreciation_config?: AssetDepreciationConfig;
  metadata?: Record<string, unknown>;
}

// Lite version untuk references
export interface AssetLite {
  id: string;
  code: string;
  name: string;
  category?: AssetCategoryLite;
  status: AssetStatus;
}

// Enhanced List params dengan advanced filters
export interface ListAssetsParams {
  page?: number;
  per_page?: number;
  search?: string;

  // Status filters
  status?: AssetStatus | AssetStatus[];
  lifecycle_stage?: AssetLifecycleStage | AssetLifecycleStage[];

  // Category & Location
  category_id?: string | string[];
  location_id?: string | string[];

  // Company & Organization
  company_id?: string;
  business_unit_id?: string;
  department_id?: string | string[];
  assigned_to_employee_id?: string | string[];

  // Date range filters
  acquisition_date_from?: string;
  acquisition_date_to?: string;

  // Value range filters
  acquisition_cost_min?: number;
  acquisition_cost_max?: number;
  book_value_min?: number;
  book_value_max?: number;

  // Boolean filters
  is_capitalized?: boolean;
  is_depreciable?: boolean;
  is_fully_depreciated?: boolean;
  has_warranty?: boolean;
  warranty_expiring_soon?: boolean; // Within 30 days

  // Assignment filter
  assigned_or_unassigned?: "assigned" | "unassigned";

  // Sorting
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// Enhanced Asset Input untuk create/update
export interface AssetInput {
  // Required fields
  name: string;
  category_id: string;
  location_id: string;
  acquisition_date: string;
  acquisition_cost: number;

  // Optional fields
  code?: string; // Auto-generated if not provided
  description?: string;
  salvage_value?: number;

  // NEW: Identity
  serial_number?: string;
  barcode?: string;
  asset_tag?: string;

  // NEW: Ownership
  company_id?: string;
  business_unit_id?: string;
  department_id?: string;
  assigned_to_employee_id?: string;

  // NEW: Acquisition
  supplier_id?: string;
  purchase_order_id?: string;
  supplier_invoice_id?: string;
  shipping_cost?: number;
  installation_cost?: number;
  tax_amount?: number;
  other_costs?: number;

  // NEW: Depreciation config
  depreciation_method?: "SL" | "DB" | "SYD" | "UOP" | "NONE";
  useful_life_months?: number;
  useful_life_years?: number;
  depreciation_start_date?: string;

  // NEW: Warranty
  warranty_start?: string;
  warranty_end?: string;
  warranty_provider?: string;
  warranty_terms?: string;

  // NEW: Insurance
  insurance_policy_number?: string;
  insurance_provider?: string;
  insurance_start?: string;
  insurance_end?: string;
  insurance_value?: number;
}

// NEW: Assignment Input
export interface AssignAssetInput {
  employee_id?: string;
  department_id?: string;
  location_id?: string;
  assignment_date?: string;
  notes?: string;
}

export interface ReturnAssetInput {
  return_date: string;
  return_reason?: string;
  notes?: string;
}

// NEW: Attachment Input
export interface AssetAttachmentInput {
  file: File;
  file_type: "invoice" | "warranty" | "photo" | "manual" | "other";
  description?: string;
}

// NEW: Bulk Import Types
export interface AssetBulkImportRow {
  name: string;
  category_name: string;
  location_name: string;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value?: number;
  serial_number?: string;
  description?: string;
  // ... other fields
}

export interface AssetBulkImportResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  imported_assets: Asset[];
}

// NEW: Advanced Search Types
export interface AssetAdvancedSearchFilters {
  query?: string;
  status?: AssetStatus[];
  lifecycle_stage?: AssetLifecycleStage[];
  category_ids?: string[];
  location_ids?: string[];
  department_ids?: string[];
  employee_ids?: string[];
  company_id?: string;
  acquisition_date_range?: { from?: string; to?: string };
  value_range?: { min?: number; max?: number };
  is_capitalized?: boolean;
  is_depreciable?: boolean;
  has_warranty?: boolean;
  warranty_expiring_soon?: boolean;
  assigned_or_unassigned?: "assigned" | "unassigned" | "both";
}

// Existing action inputs (remain the same)
export interface DepreciateAssetInput {
  as_of_date: string;
}

export interface TransferAssetInput {
  location_id: string;
  transfer_date: string;
  description?: string;
}

export interface DisposeAssetInput {
  disposal_date: string;
  description?: string;
}

export interface RevalueAssetInput {
  new_cost: number;
  transaction_date: string;
  description?: string;
}

export interface AdjustAssetInput {
  amount: number;
  transaction_date: string;
  description?: string;
}

export interface SellAssetInput {
  disposal_date: string;
  sale_amount: number;
  description?: string;
}

// NEW: Approval workflow types
export interface SubmitForApprovalInput {
  notes?: string;
}

export interface ApproveAssetInput {
  approved: boolean;
  rejection_reason?: string;
}
