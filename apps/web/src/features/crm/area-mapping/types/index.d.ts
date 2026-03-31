import type { ApiResponse, PaginatedResponse } from "@/types/api";

// Area Mapping types

/** Item type for area mapping */
type AreaMappingItemType = "lead" | "pipeline";

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

/** Pipeline deal data on the map */
export interface AreaMappingPipelineData {
  id: string;
  code: string;
  title: string;
  type: "pipeline";
  latitude: number;
  longitude: number;
  province: string;
  city: string;
  pipeline_stage_id: string;
  pipeline_stage_name: string;
  status: string;
  value: number;
  probability: number;
  expected_close_date?: string;
  assigned_to?: string;
  assigned_name?: string;
  lead_id?: string;
  lead_name?: string;
  intensity_score: number;
}

/** Area mapping item (union type of lead or pipeline) */
export interface AreaMappingItem {
  type: AreaMappingItemType;
  lead?: AreaMappingLeadData;
  pipeline?: AreaMappingPipelineData;
}

/** Area mapping summary stats */
export interface AreaMappingSummary {
  total_leads: number;
  total_pipelines: number;
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
  lead_count: number;
  pipeline_deal_count: number;
  total_pipeline_value: number;
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
