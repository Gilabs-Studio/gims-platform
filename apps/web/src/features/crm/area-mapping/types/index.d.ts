import type { ApiResponse, PaginatedResponse } from "@/types/api";

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
