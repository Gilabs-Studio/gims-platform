import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loyaltyService } from "../services/loyalty-service";
import type {
  CreateLoyaltyProgramRequest,
  UpdateLoyaltyProgramRequest,
  EnrollMemberRequest,
  RedeemPointsRequest,
  AdjustPointsRequest,
  LoyaltyProgramListParams,
  LoyaltyMemberListParams,
  LedgerListParams,
  PublicSelfRegisterRequest,
} from "../types";

const PROGRAMS_KEY = "loyaltyPrograms";
const MEMBERS_KEY = "loyaltyMembers";
const LEDGER_KEY = "loyaltyLedger";

// ── Programs ──────────────────────────────────────────────────────────────────

export function useLoyaltyPrograms(params?: LoyaltyProgramListParams) {
  return useQuery({
    queryKey: [PROGRAMS_KEY, params],
    queryFn: () => loyaltyService.listPrograms(params),
  });
}

export function useLoyaltyProgram(id: string) {
  return useQuery({
    queryKey: [PROGRAMS_KEY, id],
    queryFn: () => loyaltyService.getProgram(id),
    enabled: !!id,
  });
}

export function useCreateLoyaltyProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLoyaltyProgramRequest) => loyaltyService.createProgram(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PROGRAMS_KEY] });
    },
  });
}

export function useUpdateLoyaltyProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLoyaltyProgramRequest }) =>
      loyaltyService.updateProgram(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PROGRAMS_KEY] });
    },
  });
}

export function useDeleteLoyaltyProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loyaltyService.deleteProgram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PROGRAMS_KEY] });
    },
  });
}

export function useToggleLoyaltyProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loyaltyService.toggleProgram(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PROGRAMS_KEY] });
    },
  });
}

// ── Members ───────────────────────────────────────────────────────────────────

export function useLoyaltyMembers(params?: LoyaltyMemberListParams) {
  return useQuery({
    queryKey: [MEMBERS_KEY, params],
    queryFn: () => loyaltyService.listMembers(params),
  });
}

export function useLoyaltyMember(id: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, id],
    queryFn: () => loyaltyService.getMember(id),
    enabled: !!id,
  });
}

export function useLoyaltyMemberByCustomer(customerId: string, enabled = true) {
  return useQuery({
    queryKey: [MEMBERS_KEY, "by-customer", customerId],
    queryFn: () => loyaltyService.getMemberByCustomer(customerId),
    enabled: enabled && !!customerId,
    staleTime: 30_000,
  });
}

export function useLookupLoyaltyMember(name: string, outletId: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, "lookup", name, outletId],
    queryFn: () => loyaltyService.lookupMember(name, outletId),
    enabled: name.length >= 2 && !!outletId,
    staleTime: 30_000,
  });
}

export function useEnrollLoyaltyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnrollMemberRequest) => loyaltyService.enrollMember(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
    },
  });
}

export function useChangeMemberProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, programId }: { memberId: string; programId: string }) => 
      loyaltyService.changeMemberProgram(memberId, programId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
    },
  });
}

// ── Points ────────────────────────────────────────────────────────────────────

export function useRedeemPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RedeemPointsRequest) => loyaltyService.redeemPoints(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [LEDGER_KEY, variables.member_id] });
    },
  });
}

export function useAdjustPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdjustPointsRequest) => loyaltyService.adjustPoints(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [LEDGER_KEY] });
    },
  });
}

export function useLoyaltyLedger(memberId: string, params?: LedgerListParams) {
  return useQuery({
    queryKey: [LEDGER_KEY, memberId, params],
    queryFn: () => loyaltyService.listLedger(memberId, params),
    enabled: !!memberId,
  });
}

// ── Public (no auth) ──────────────────────────────────────────────────────────

export function usePublicLoyaltyRegister() {
  return useMutation({
    mutationFn: (data: PublicSelfRegisterRequest) => loyaltyService.publicRegister(data),
  });
}
