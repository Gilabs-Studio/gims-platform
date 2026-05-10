import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { systemAdminService } from "../services/system-admin-service";
import type { TenantListParams } from "../types";

export function useTenants(params?: TenantListParams) {
  return useQuery({
    queryKey: ["system-admin", "tenants", params],
    queryFn: async () => {
      const res = await systemAdminService.getTenants(params);
      return res;
    },
  });
}

export function useTenantDetail(id: string | null) {
  return useQuery({
    queryKey: ["system-admin", "tenants", id],
    queryFn: async () => {
      const res = await systemAdminService.getTenantDetail(id!);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSystemAdminDashboard() {
  return useQuery({
    queryKey: ["system-admin", "dashboard"],
    queryFn: async () => {
      const res = await systemAdminService.getDashboard();
      return res.data;
    },
  });
}

export function useRecoverTenantDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantID: string) => systemAdminService.recoverTenantDeletion(tenantID),
    onSuccess: async () => {
      toast.success("Tenant deletion has been recovered.");
      await queryClient.invalidateQueries({ queryKey: ["system-admin", "tenants"] });
    },
    onError: () => {
      toast.error("Failed to recover tenant deletion.");
    },
  });
}
