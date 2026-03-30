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

export type TravelPlanStatus = "draft" | "active" | "completed" | "cancelled";

export type TravelStopCategory = "pickup" | "dropoff" | "refuel" | "checkpoint" | "rest" | "custom";

export type TravelStopSource = "manual" | "google_places" | "open_street_map";

export type WeatherRisk = "low" | "medium" | "high";

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
  weather_risk: WeatherRisk | string;
  stops: TravelPlanStop[];
  notes: TravelPlanDayNote[];
}

export interface TravelPlan {
  id: string;
  code: string;
  title: string;
  mode: TravelMode | string;
  start_date: string;
  end_date: string;
  status: TravelPlanStatus | string;
  notes: string;
  days: TravelPlanDay[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelPlanListParams {
  page?: number;
  per_page?: number;
  search?: string;
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
  weather_risk?: WeatherRisk | string;
  stops: TravelPlanStopInput[];
  notes?: TravelPlanDayNoteInput[];
}

export interface TravelPlanInput {
  title: string;
  mode: TravelMode | string;
  start_date: string;
  end_date: string;
  status?: TravelPlanStatus | string;
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

export interface WeatherDaySummary {
  date: string;
  temperature_min: number;
  temperature_max: number;
  precipitation_percent: number;
  risk: WeatherRisk | string;
  source: string;
}

export interface WeatherSummaryResult {
  plan_id: string;
  days: WeatherDaySummary[];
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

export interface TravelPlannerFormData {
  modes: EnumOption[];
  categories: EnumOption[];
  sources: EnumOption[];
  weather_risk: EnumOption[];
}
