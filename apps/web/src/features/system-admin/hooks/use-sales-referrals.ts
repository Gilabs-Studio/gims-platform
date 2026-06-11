import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { systemAdminService } from "../services/system-admin-service";
import type {
  CreateSalesReferralAccountRequest,
  CreateSalesReferralCodeRequest,
  CommissionConfigRequest,
  CommissionListParams,
  CreatePayoutRequest,
  PayoutListParams,
  SalesReferralListParams,
  SalesReferralStatsParams,
  UpdateSalesReferralAccountRequest,
  UpdateSalesReferralCodeRequest,
} from "../types";

export function useSalesReferralStats(params?: SalesReferralStatsParams) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "stats", params],
    queryFn: async () => {
      const res = await systemAdminService.getReferralStats(params);
      return res.data;
    },
  });
}

export function useSalesReferralAccounts(params?: SalesReferralListParams) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "accounts", params],
    queryFn: () => systemAdminService.listReferralAccounts(params),
  });
}

export function useSalesReferralCodes(params?: SalesReferralListParams) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "codes", params],
    queryFn: () => systemAdminService.listReferralCodes(params),
  });
}

export function useActiveCoupons() {
  return useQuery({
    queryKey: ["system-admin", "coupons", "active"],
    queryFn: async () => {
      const res = await systemAdminService.getCoupons({ active_only: true, page: 1, per_page: 100 });
      return res.data;
    },
  });
}

export function useReferralCommissionConfig() {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "commission-config"],
    queryFn: async () => {
      const res = await systemAdminService.getCommissionConfig();
      return res.data;
    },
  });
}

export function useReferralCommissions(params?: CommissionListParams) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "commissions", params],
    queryFn: () => systemAdminService.listReferralCommissions(params),
  });
}

export function useReferralCommissionDetail(id?: string | null) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "commissions", id],
    queryFn: () => systemAdminService.getReferralCommission(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useReferralPayouts(params?: PayoutListParams) {
  return useQuery({
    queryKey: ["system-admin", "sales-referrals", "payouts", params],
    queryFn: () => systemAdminService.listReferralPayouts(params),
  });
}

export function useSalesReferralMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["system-admin", "sales-referrals"] });
  };

  return {
    createAccount: useMutation({
      mutationFn: (payload: CreateSalesReferralAccountRequest) => systemAdminService.createReferralAccount(payload),
      onSuccess: async () => {
        toast.success("Referral account saved.");
        await invalidate();
      },
      onError: () => toast.error("Failed to save referral account."),
    }),
    updateAccount: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateSalesReferralAccountRequest }) =>
        systemAdminService.updateReferralAccount(id, payload),
      onSuccess: async () => {
        toast.success("Referral account updated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to update referral account."),
    }),
    deleteAccount: useMutation({
      mutationFn: (id: string) => systemAdminService.deleteReferralAccount(id),
      onSuccess: async () => {
        toast.success("Referral account deactivated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to deactivate referral account."),
    }),
    createCode: useMutation({
      mutationFn: (payload: CreateSalesReferralCodeRequest) => systemAdminService.createReferralCode(payload),
      onSuccess: async () => {
        toast.success("Referral code saved.");
        await invalidate();
      },
      onError: () => toast.error("Failed to save referral code."),
    }),
    updateCode: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateSalesReferralCodeRequest }) =>
        systemAdminService.updateReferralCode(id, payload),
      onSuccess: async () => {
        toast.success("Referral code updated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to update referral code."),
    }),
    setCodeStatus: useMutation({
      mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => systemAdminService.setReferralCodeStatus(id, isActive),
      onSuccess: async () => {
        toast.success("Referral code status updated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to update referral code status."),
    }),
    deleteCode: useMutation({
      mutationFn: (id: string) => systemAdminService.deleteReferralCode(id),
      onSuccess: async () => {
        toast.success("Referral code deactivated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to deactivate referral code."),
    }),
    updateCommissionConfig: useMutation({
      mutationFn: (payload: CommissionConfigRequest) => systemAdminService.updateCommissionConfig(payload),
      onSuccess: async () => {
        toast.success("Commission config updated.");
        await invalidate();
      },
      onError: () => toast.error("Failed to update commission config."),
    }),
    approveCommission: useMutation({
      mutationFn: (id: string) => systemAdminService.approveReferralCommission(id),
      onSuccess: async () => {
        toast.success("Commission approved.");
        await invalidate();
      },
      onError: () => toast.error("Failed to approve commission."),
    }),
    voidCommission: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => systemAdminService.voidReferralCommission(id, { reason }),
      onSuccess: async () => {
        toast.success("Commission voided.");
        await invalidate();
      },
      onError: () => toast.error("Failed to void commission."),
    }),
    createPayout: useMutation({
      mutationFn: (payload: CreatePayoutRequest) => systemAdminService.createReferralPayout(payload),
      onSuccess: async () => {
        toast.success("Payout recorded.");
        await invalidate();
      },
      onError: () => toast.error("Failed to record payout."),
    }),
  };
}
