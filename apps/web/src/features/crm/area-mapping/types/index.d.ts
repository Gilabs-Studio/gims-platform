import type { ApiResponse, PaginatedResponse } from "@/types/api";

// Area Mapping types

/** Item type for area mapping */
type AreaMappingItemType = "customer" | "lead";

/** Customer data on the map */
export interface AreaMappingCustomerData {
  id: string;
  code: string;
  name: string;
  type: "customer";
  latitude: number;
  longitude: number;
  province: string;
  city: string;
  activity_count: number;
  deal_count: number;
  total_deal_value: number;
  last_activity_at?: string;
  intensity_score: number;
}

/** Lead data on the map */
export interface AreaMappingLeadData {
  id: string;
  code: string;
  name: string;
  type: "lead";
  latitude: number;
  longitude: number;
  province: string;
  city: string;
  lead_status: string;
  lead_score: number;
  estimated_value: number;
  assigned_to?: string;
  assigned_name?: string;
  activity_count: number;
  task_count: number;
  last_activity_at?: string;
  intensity_score: number;
}

/** Area mapping item (union type of customer or lead) */
export interface AreaMappingItem {
  type: AreaMappingItemType;
  customer?: AreaMappingCustomerData;
  lead?: AreaMappingLeadData;
}

/** Area mapping summary stats */
export interface AreaMappingSummary {
  total_customers: number;
  total_leads: number;
  total_activities: number;
  total_pipeline_value: number;
  max_intensity_score: number;
  min_intensity_score: number;
}

/** Area mapping filter meta */
export interface AreaMappingFilterMeta {
  month?: number;
  year?: number;
}

/** Cluster summary by province for GeoJSON intensity rendering */
export interface AreaMappingCluster {
  city: string;
  total_points: number;
  customer_count: number;
  lead_count: number;
  avg_intensity: number;
  max_intensity: number;
  center_lat: number;
  center_lng: number;
}

/** Full area mapping response */
export interface AreaMappingResponse {
  items: AreaMappingItem[];
  clusters: AreaMappingCluster[];
  summary: AreaMappingSummary;
  filters: AreaMappingFilterMeta;
}

export interface AreaMappingRequest {
  month?: number;
  year?: number;
}

export type AreaMappingApiResponse = ApiResponse<AreaMappingResponse>;

// Area Capture types matching backend DTO
export interface AreaCapture {
  id: string;
  area_id: string;
  area_name: string;
  captured_by: string;
  captured_by_name: string;
  capture_type: "check_in" | "check_out" | "manual";
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
  notes: string;
  captured_at: string;
  created_at: string;
}

export interface CreateAreaCaptureData {
  area_id: string;
  capture_type: "check_in" | "check_out" | "manual";
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  notes?: string;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  total_captures: number;
}

export interface AreaCoverage {
  area_id: string;
  area_name: string;
  total_captures: number;
  unique_employees: number;
  last_capture_at: string | null;
}

export interface CoverageResponse {
  areas: AreaCoverage[];
}

export interface ListCapturesParams {
  page?: number;
  per_page?: number;
  area_id?: string;
  start_date?: string;
  end_date?: string;
}

export type AreaCaptureListResponse = PaginatedResponse<AreaCapture>;
export type AreaCaptureResponse = ApiResponse<AreaCapture>;
export type HeatmapApiResponse = ApiResponse<HeatmapResponse>;
export type CoverageApiResponse = ApiResponse<CoverageResponse>;
