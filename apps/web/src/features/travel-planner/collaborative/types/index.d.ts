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

export type TravelMode = "logistic" | "cargo" | "vessel" | "milestone";

export type TravelPlanType = "up_country_cost" | "visit_report";

export type TravelPlanStatus = "draft" | "active" | "completed" | "cancelled";

export type TravelStopCategory = "pickup" | "dropoff" | "refuel" | "checkpoint" | "rest" | "custom";

export type TravelStopSource = "manual" | "google_places" | "open_street_map";

export type TravelExpenseType =
  | "transport"
  | "accommodation"
  | "meal"
  | "fuel"
  | "toll"
  | "parking"
  | "other";

export interface TravelPlanStop {
  id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  category: TravelStopCategory | string;
  order_index: number;
  is_locked: boolean;
  source: TravelStopSource | string;
  photo_url: string;
  note: string;
}

export interface TravelPlanDayNote {
  id: string;
  icon_tag: string;
  note_text: string;
  note_time: string;
  order_index: number;
}

export interface TravelPlanDay {
  id: string;
  day_index: number;
  day_date: string;
  summary: string;
  stops: TravelPlanStop[];
  notes: TravelPlanDayNote[];
}

export interface TravelPlan {
  id: string;
  code: string;
  title: string;
  plan_type: TravelPlanType | string;
  mode: TravelMode | string;
  start_date: string;
  end_date: string;
  status: TravelPlanStatus | string;
  budget_amount: number;
  notes: string;
  days: TravelPlanDay[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelExpense {
  id: string;
  travel_plan_id: string;
  expense_type: TravelExpenseType | string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelExpenseListResult {
  items: TravelExpense[];
  total_amount: number;
}

export interface CreateTravelExpenseInput {
  expense_type: TravelExpenseType | string;
  description?: string;
  amount: number;
  expense_date: string;
  receipt_url?: string;
}

export interface TravelPlanVisit {
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
}

export interface LinkTravelPlanVisitsInput {
  visit_ids: string[];
}

export interface LinkTravelPlanVisitsResult {
  linked_count: number;
}

export interface CreateTravelPlanVisitInput {
  visit_date: string;
  employee_id: string;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
  village_id?: string | null;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  purpose?: string;
  notes?: string;
}

export interface UnlinkTravelPlanVisitResult {
  visit_id: string;
  travel_plan_id: string;
}

export interface TravelPlanListParams {
  page?: number;
  per_page?: number;
  search?: string;
  plan_type?: string;
  mode?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface TravelPlanStopInput {
  place_name: string;
  latitude: number;
  longitude: number;
  category: TravelStopCategory | string;
  order_index: number;
  is_locked: boolean;
  source: TravelStopSource | string;
  photo_url?: string;
  note?: string;
}

export interface TravelPlanDayNoteInput {
  icon_tag?: string;
  note_text: string;
  note_time?: string;
  order_index: number;
}

export interface TravelPlanDayInput {
  day_index: number;
  day_date: string;
  summary?: string;
  stops: TravelPlanStopInput[];
  notes?: TravelPlanDayNoteInput[];
}

export interface TravelPlanInput {
  title: string;
  mode: TravelMode | string;
  start_date: string;
  end_date: string;
  status?: TravelPlanStatus | string;
  budget_amount?: number;
  notes?: string;
  days: TravelPlanDayInput[];
}

export interface PlaceSearchResult {
  provider: string;
  place_name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  photo_url: string;
  rating?: number | null;
}

export interface RouteOptimizationDaySummary {
  day_id: string;
  day_index: number;
  total_distance_km: number;
  google_maps_url: string;
  optimized_stop_ids: string[];
}

export interface RouteOptimizationResult {
  plan_id: string;
  optimized_at: string;
  days: RouteOptimizationDaySummary[];
}

export interface DayGoogleMapsLink {
  day_id: string;
  day_index: number;
  url: string;
}

export interface EnumOption {
  value: string;
  label: string;
}

export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
  avatar_url: string;
}

export interface TravelPlannerFormData {
  modes: EnumOption[];
  categories: EnumOption[];
  sources: EnumOption[];
  employees: EmployeeFormOption[];
  expense_types: EnumOption[];
}
