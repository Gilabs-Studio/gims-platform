export type VisitPlannerScope = "OWN" | "DIVISION" | "AREA" | "ALL";
export type VisitRouteType = "lead" | "deal" | "customer" | "mixed";
export type VisitEvent = "check_in" | "check_out" | "submit_visit";

export interface ApiPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number;
  prev_page?: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: ApiPaginationMeta;
  };
  timestamp?: string;
  request_id?: string;
}

export interface VisitPlannerEmployeeOption {
  id: string;
  employee_code: string;
  name: string;
  avatar_url: string;
}

export interface VisitPlannerCandidate {
  id: string;
  type: "lead" | "deal" | "customer";
  label: string;
  assigned_to?: string | null;
  lat?: number | null;
  lng?: number | null;
  has_location: boolean;
  warning?: string;
}

export interface VisitRouteTypeOption {
  value: VisitRouteType;
  label: string;
}

export interface VisitOutcomeOption {
  value: string;
  label: string;
}

export interface ActivityTypeOption {
  value: string;
  label: string;
}

export interface VisitPlannerFormDataResponse {
  employees: VisitPlannerEmployeeOption[];
  leads: VisitPlannerCandidate[];
  deals: VisitPlannerCandidate[];
  customers: VisitPlannerCandidate[];
  products: VisitPlannerProductOption[];
  warnings: string[];
  route_types: VisitRouteTypeOption[];
  outcomes: VisitOutcomeOption[];
  activity_types: ActivityTypeOption[];
}

export interface VisitPlannerProductOption {
  id: string;
  code: string;
  name: string;
  selling_price: number;
}

export interface VisitPlannerFormDataParams {
  employee_id?: string;
  search?: string;
  route_date?: string;
  route_type?: VisitRouteType;
}

export interface VisitCheckpoint {
  id: string;
  visit_id: string;
  sequence: number;
  type: "lead" | "deal" | "customer";
  ref_id?: string | null;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  warning?: string;
  can_select: boolean;
  missing_location_reason?: string;
  lead_id?: string;
  deal_id?: string;
  customer_id?: string;
}

export interface ActiveVisitRoute {
  id: string;
  plan_code: string;
  plan_title: string;
  employee_id: string;
  employee_name: string;
  employee_avatar_url: string;
  checkpoint_total: number;
  completed_total: number;
  in_progress_total: number;
  current_eta_s: number;
  route_type: VisitRouteType;
  optimization: {
    polyline: string;
    summary?: {
      total_distance_m: number;
      total_duration_s: number;
    };
  };
  checkpoints: VisitCheckpoint[];
}

export interface ActiveVisitRoutesParams {
  page?: number;
  per_page?: number;
  employee_id?: string;
  division_id?: string;
  route_date?: string;
  route_type?: VisitRouteType;
}

export interface NavigationCheckpointInput {
  id?: string;
  type: "lead" | "deal" | "customer";
  ref_id?: string;
  lat?: number;
  lng?: number;
}

export interface OptimizeNavigationRequest {
  employee_id?: string;
  checkpoints: NavigationCheckpointInput[];
  options?: {
    mode?: "driving" | "walking";
    optimizeFor?: "time" | "distance";
  };
}

export interface OptimizedNavigationCheckpoint {
  checkpoint_id: string;
  type: "lead" | "deal" | "customer";
  ref_id?: string | null;
  lat: number;
  lng: number;
  sequence: number;
  leg_distance_m: number;
  leg_duration_s: number;
  warning?: string;
}

export interface OptimizeNavigationResponse {
  ordered_checkpoints: OptimizedNavigationCheckpoint[];
  polyline: string;
  summary: {
    total_distance_m: number;
    total_duration_s: number;
  };
  warnings: string[];
}

export interface VisitLogRequest {
  employee_id?: string;
  visit_id?: string;
  route_id?: string;
  checkpoint_id?: string;
  lead_id?: string;
  deal_id?: string;
  customer_id?: string;
  action: VisitEvent;
  timestamp?: string;
  location?: {
    lat: number;
    lng: number;
  };
  photos?: string[];
  notes?: string;
  outcome?: string;
  activity_type?: string;
  distance_m?: number;
  product_interests?: VisitProductInterestInput[];
}

export interface VisitProductInterestInput {
  product_id: string;
  interest_level?: number;
  notes?: string;
  quantity?: number;
  price?: number;
}

export interface CreateVisitPlannerPlanRequest {
  title?: string;
  route_date: string;
  employee_id?: string;
  checkpoints: NavigationCheckpointInput[];
}

export interface CreateVisitPlannerPlanResponse {
  route_id: string;
  plan_code: string;
  plan_title: string;
  employee_id: string;
  checkpoint_total: number;
  visit_ids: string[];
}

export interface TravelPlanVisitResponse {
  id: string;
  code: string;
  travel_plan_id?: string | null;
  visit_date: string;
  employee_id: string;
  employee_name: string;
  employee_avatar_url: string;
  customer_id?: string | null;
  customer_name: string;
  status: string;
  purpose: string;
  outcome: string;
  created_at: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_location?: string | null;
  check_out_location?: string | null;
  product_interest_count: number;
  photos?: string | null;
  notes: string;
  result: string;
}

export interface VisitLogResponse {
  action: string;
  visit: TravelPlanVisitResponse;
}

export interface LocationUpdateRequest {
  employee_id?: string;
  route_id?: string;
  checkpoint_id?: string;
  lat: number;
  lng: number;
  heading?: number;
}

export interface LocationUpdateResponse {
  employee_id: string;
  route_id?: string | null;
  checkpoint_id?: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  timestamp: string;
  employee_name?: string;
  activity_type?: string;
  status?: string;
}

export interface LocationUpdateEvent extends LocationUpdateResponse {
  type?: "location_update";
}

export interface RouteStatusEvent {
  type?: "route_status";
  employee_id: string;
  route_id?: string | null;
  checkpoint_id?: string | null;
  status: string;
  timestamp: string;
}

export interface LocationSocketMessage<T> {
  type: "location_update" | "route_status";
  data: T;
}

export interface RawActiveVisitRouteCheckpoint {
  visit_id: string;
  checkpoint_id: string;
  type: "lead" | "deal" | "customer";
  ref_id?: string | null;
  label: string;
  lat?: number | null;
  lng?: number | null;
  status: string;
  warning?: string;
}

export interface RawActiveVisitRouteResponse {
  route_id: string;
  plan_code: string;
  plan_title: string;
  employee_id: string;
  employee_name: string;
  employee_avatar_url: string;
  checkpoint_total: number;
  completed_total: number;
  in_progress_total: number;
  current_eta_s: number;
  polyline: string;
  checkpoints: RawActiveVisitRouteCheckpoint[];
}

export interface RawVisitPlannerFormDataResponse {
  employees: VisitPlannerEmployeeOption[];
  leads: VisitPlannerCandidate[];
  deals: VisitPlannerCandidate[];
  customers: VisitPlannerCandidate[];
  products: VisitPlannerProductOption[];
  warnings: string[];
}
