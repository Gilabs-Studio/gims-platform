"use client";

import { useQuery } from "@tanstack/react-query";
import { permissionService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function usePermissions() {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["permissions", tenantScope],
    queryFn: () => permissionService.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePermission(id: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["permission", tenantScope, id],
    queryFn: () => permissionService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

