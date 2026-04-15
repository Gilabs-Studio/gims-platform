import { apiClient } from "@/lib/api-client";
import type {
  LoyaltyProgram,
  LoyaltyMember,
  LoyaltyMemberLookup,
  PointLedgerEntry,
  CreateLoyaltyProgramRequest,
  UpdateLoyaltyProgramRequest,
  EnrollMemberRequest,
  RedeemPointsRequest,
  RedeemPointsResponse,
  AdjustPointsRequest,
  LoyaltyProgramListParams,
  LoyaltyMemberListParams,
  LedgerListParams,
  ApiResponse,
  ApiListResponse,
  PublicSelfRegisterRequest,
  PublicSelfRegisterResponse,
} from "../types";

const BASE = "/loyalty";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";

export const loyaltyService = {
  // ── Programs (protected) ──────────────────────────────────────────────────
  listPrograms: async (params?: LoyaltyProgramListParams): Promise<ApiListResponse<LoyaltyProgram>> => {
    const r = await apiClient.get(`${BASE}/programs`, { params });
    return r.data;
  },

  getProgram: async (id: string): Promise<ApiResponse<LoyaltyProgram>> => {
    const r = await apiClient.get(`${BASE}/programs/${id}`);
    return r.data;
  },

  createProgram: async (data: CreateLoyaltyProgramRequest): Promise<ApiResponse<LoyaltyProgram>> => {
    const r = await apiClient.post(`${BASE}/programs`, data);
    return r.data;
  },

  updateProgram: async (id: string, data: UpdateLoyaltyProgramRequest): Promise<ApiResponse<LoyaltyProgram>> => {
    const r = await apiClient.put(`${BASE}/programs/${id}`, data);
    return r.data;
  },

  deleteProgram: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/programs/${id}`);
  },

  toggleProgram: async (id: string): Promise<ApiResponse<LoyaltyProgram>> => {
    const r = await apiClient.patch(`${BASE}/programs/${id}/toggle`);
    return r.data;
  },

  // ── Members (protected) ───────────────────────────────────────────────────
  listMembers: async (params?: LoyaltyMemberListParams): Promise<ApiListResponse<LoyaltyMember>> => {
    const r = await apiClient.get(`${BASE}/members`, { params });
    return r.data;
  },

  getMember: async (id: string): Promise<ApiResponse<LoyaltyMember>> => {
    const r = await apiClient.get(`${BASE}/members/${id}`);
    return r.data;
  },

  getMemberByCustomer: async (customerId: string): Promise<ApiResponse<LoyaltyMember>> => {
    const r = await apiClient.get(`${BASE}/members/by-customer/${customerId}`);
    return r.data;
  },

  lookupMember: async (name: string, outletId: string): Promise<ApiResponse<LoyaltyMemberLookup>> => {
    const r = await apiClient.get(`${BASE}/members/lookup`, { params: { name, outlet_id: outletId } });
    return r.data;
  },

  enrollMember: async (data: EnrollMemberRequest): Promise<ApiResponse<LoyaltyMember>> => {
    const r = await apiClient.post(`${BASE}/members/enroll`, data);
    return r.data;
  },

  changeMemberProgram: async (memberId: string, programId: string): Promise<ApiResponse<LoyaltyMember>> => {
    const r = await apiClient.put(`${BASE}/members/${memberId}/program`, { program_id: programId });
    return r.data;
  },

  // ── Points (protected) ────────────────────────────────────────────────────
  redeemPoints: async (data: RedeemPointsRequest): Promise<ApiResponse<RedeemPointsResponse>> => {
    const r = await apiClient.post(`${BASE}/redeem`, data);
    return r.data;
  },

  adjustPoints: async (data: AdjustPointsRequest): Promise<void> => {
    await apiClient.post(`${BASE}/adjust`, data);
  },

  listLedger: async (memberId: string, params?: LedgerListParams): Promise<ApiListResponse<PointLedgerEntry>> => {
    const r = await apiClient.get(`${BASE}/ledger/${memberId}`, { params });
    return r.data;
  },

  // ── Public (no auth — plain fetch to avoid sending cookies) ──────────────
  publicRegister: async (data: PublicSelfRegisterRequest): Promise<PublicSelfRegisterResponse> => {
    const res = await fetch(`${API_ORIGIN}/api/v1/public/loyalty/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message ?? "Registration failed");
    return json.data as PublicSelfRegisterResponse;
  },
};
