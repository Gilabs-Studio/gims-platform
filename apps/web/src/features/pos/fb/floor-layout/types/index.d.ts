// Layout object types for the floor layout designer canvas

export type LayoutObjectType =
  | "table"
  | "chair"
  | "wall"
  | "door"
  | "cashier"
  | "zone"
  | "decoration";

export type TableShape = "rectangle" | "circle" | "square";
export type TableChairLayout = "auto" | "top" | "right" | "bottom" | "left";
export interface TableChairDistribution {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ZoneType =
  | "dining"
  | "vip"
  | "outdoor"
  | "bar"
  | "kitchen"
  | "storage"
  | "entrance"
  | "restroom"
  | "waiting";

export interface LayoutObject {
  id: string;
  type: LayoutObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  locked?: boolean;
  parentId?: string;
  // Table-specific
  tableNumber?: number;
  tableShape?: TableShape;
  capacity?: number;
  chairLayout?: TableChairLayout;
  chairDistribution?: TableChairDistribution;
  // Zone-specific
  zoneType?: ZoneType;
  color?: string;
  opacity?: number;
  // Wall-specific
  thickness?: number;
  // Door-specific
  doorWidth?: number;
}

export type FloorPlanStatus = "draft" | "published";

export interface FloorPlan {
  id: string;
  outlet_id: string;
  company_id?: string;
  name: string;
  floor_number: number;
  status: FloorPlanStatus;
  grid_size: number;
  snap_to_grid: boolean;
  width: number;
  height: number;
  layout_data: string;
  version: number;
  published_at?: string;
  published_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  outlet_name?: string;
  company_name?: string;
}

export interface LayoutVersion {
  id: string;
  floor_plan_id: string;
  version: number;
  layout_data: string;
  published_at: string;
  published_by?: string;
}

export interface CreateFloorPlanData {
  outlet_id: string;
  company_id?: string;
  name: string;
  floor_number: number;
  grid_size?: number;
  snap_to_grid?: boolean;
  width?: number;
  height?: number;
  layout_data?: string;
}

export interface UpdateFloorPlanData {
  name?: string;
  floor_number?: number;
  grid_size?: number;
  snap_to_grid?: boolean;
  width?: number;
  height?: number;
  layout_data?: string;
}

export interface ListFloorPlanParams {
  page?: number;
  per_page?: number;
  search?: string;
  outlet_id?: string;
  company_id?: string;
  status?: FloorPlanStatus;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface FloorPlanListResponse {
  success: boolean;
  data: FloorPlan[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface FloorPlanSingleResponse {
  success: boolean;
  data: FloorPlan;
}

export interface LayoutVersionListResponse {
  success: boolean;
  data: LayoutVersion[];
}

export interface OutletOption {
  id: string;
  name: string;
}

export interface FloorPlanFormDataResponse {
  success: boolean;
  data: {
    outlets: OutletOption[];
  };
}
