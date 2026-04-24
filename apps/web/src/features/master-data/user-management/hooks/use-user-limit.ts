"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useUserLimit() {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["users", tenantScope, "limit"],
    queryFn: () => userService.getLimit(),
    staleTime: 30 * 1000,
  });
}
