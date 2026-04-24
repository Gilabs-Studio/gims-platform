"use client";

import { useQuery } from "@tanstack/react-query";
import { permissionService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useMenuCategories() {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["menu-categories", tenantScope],
    queryFn: () => permissionService.getMenuCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
