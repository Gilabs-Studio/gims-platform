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

// Enums
export type MaintenanceScheduleType = "preventive" | "corrective";
export type MaintenanceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type WorkOrderType = "preventive" | "corrective" | "emergency";
export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

// Asset Mini
export interface AssetMini {
  id: string;
  code: string;
  name: string;
}

// Employee Mini
export interface EmployeeMini {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
}

// Maintenance Schedule
export interface MaintenanceSchedule {
  id: string;
  asset_id: string;
  asset?: AssetMini;
  schedule_type: MaintenanceScheduleType;
  frequency: MaintenanceFrequency;
  frequency_value: number;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
  description: string;
  estimated_cost: number;
  assigned_to?: string | null;
  employee?: EmployeeMini;
  is_active: boolean;
  is_overdue: boolean;
  days_until_due: number;
  created_at: string;
  updated_at: string;
}

// Work Order
export interface WorkOrderSparePart {
  id: string;
  spare_part_id: string;
  spare_part?: SparePartMini;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  asset_id: string;
  asset?: AssetMini;
  schedule_id?: string | null;
  wo_type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string;
  planned_date?: string | null;
  completed_date?: string | null;
  assigned_to?: string | null;
  employee?: EmployeeMini;
  actual_cost: number;
  downtime_hours: number;
  notes: string;
  spare_parts: WorkOrderSparePart[];
  total_cost: number;
  can_transition: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// Spare Part
export interface SparePartMini {
  id: string;
  part_number: string;
  part_name: string;
  unit_of_measure: string;
  current_stock: number;
  unit_cost: number;
}

export interface SparePart {
  id: string;
  part_number: string;
  part_name: string;
  description: string;
  category_id?: string | null;
  unit_of_measure: string;
  min_stock_level: number;
  max_stock_level?: number | null;
  reorder_point: number;
  current_stock: number;
  unit_cost: number;
  stock_value: number;
  supplier_id?: string | null;
  location: string;
  is_active: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  linked_assets?: AssetMini[];
  created_at: string;
  updated_at: string;
}

// Alerts
export interface MaintenanceAlert {
  type: "overdue" | "upcoming" | "low_stock";
  title: string;
  description: string;
  asset_id?: string;
  asset_code?: string;
  asset_name?: string;
  due_date?: string;
  days_overdue?: number;
  days_until_due?: number;
  schedule_id?: string;
  spare_part_id?: string;
  spare_part_name?: string;
  current_stock?: number;
  reorder_point?: number;
}

// Dashboard
export interface MaintenanceDashboard {
  total_schedules: number;
  active_schedules: number;
  overdue_maintenance: number;
  upcoming_maintenance: number;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_this_month: number;
  total_spare_parts: number;
  low_stock_items: number;
  total_maintenance_cost: number;
  alerts: MaintenanceAlert[];
}

// Form Data
export interface AssetMini {
  id: string;
  code: string;
  name: string;
}

export interface EmployeeMini {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
}

export interface UOMMini {
  id: string;
  name: string;
  symbol: string;
}

export interface WarehouseMini {
  id: string;
  code: string;
  name: string;
}

export interface MaintenanceFormData {
  assets: AssetMini[];
  employees: EmployeeMini[];
  uoms: UOMMini[];
  warehouses: WarehouseMini[];
}

// Input Types
export interface CreateMaintenanceScheduleInput {
  asset_id: string;
  schedule_type: MaintenanceScheduleType;
  frequency: MaintenanceFrequency;
  frequency_value?: number;
  last_maintenance_date?: string;
  next_maintenance_date: string;
  description?: string;
  estimated_cost?: number;
  assigned_to?: string;
}

export interface UpdateMaintenanceScheduleInput {
  schedule_type: MaintenanceScheduleType;
  frequency: MaintenanceFrequency;
  frequency_value?: number;
  last_maintenance_date?: string;
  next_maintenance_date: string;
  description?: string;
  estimated_cost?: number;
  assigned_to?: string;
  is_active: boolean;
}

export interface CreateWorkOrderInput {
  asset_id: string;
  schedule_id?: string;
  wo_type: WorkOrderType;
  priority?: WorkOrderPriority;
  description: string;
  planned_date: string;
  assigned_to?: string;
}

export interface UpdateWorkOrderInput {
  description: string;
  planned_date: string;
  assigned_to?: string;
}

export interface UpdateWorkOrderStatusInput {
  status: WorkOrderStatus;
  notes?: string;
  actual_cost?: number;
  downtime_hours?: number;
}

export interface WorkOrderSparePartInput {
  spare_part_id: string;
  quantity_used: number;
  unit_cost?: number;
}

export interface CreateSparePartInput {
  part_number: string;
  part_name: string;
  description?: string;
  category_id?: string;
  unit_of_measure?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  current_stock?: number;
  unit_cost?: number;
  supplier_id?: string;
  location?: string;
}

export interface UpdateSparePartInput {
  part_name: string;
  description?: string;
  category_id?: string;
  unit_of_measure?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  unit_cost?: number;
  supplier_id?: string;
  location?: string;
  is_active: boolean;
}

export interface UpdateSparePartStockInput {
  current_stock: number;
  reason: string;
}

export interface CreateAssetSparePartLinkInput {
  asset_id: string;
  spare_part_id: string;
  quantity_per_asset?: number;
  notes?: string;
}

// List Params
export interface ListMaintenanceSchedulesParams {
  page?: number;
  per_page?: number;
  asset_id?: string;
  schedule_type?: MaintenanceScheduleType;
  is_active?: boolean;
  upcoming?: boolean;
  overdue?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export interface ListWorkOrdersParams {
  page?: number;
  per_page?: number;
  asset_id?: string;
  wo_type?: WorkOrderType;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  assigned_to?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface ListSparePartsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  is_active?: boolean;
  low_stock?: boolean;
  asset_id?: string;
  sort_by?: string;
  sort_dir?: string;
}
