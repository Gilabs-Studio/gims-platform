import { useQuery } from "@tanstack/react-query";
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
