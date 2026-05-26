"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { hasPermissionCode, resolvePermissionScope } from "@/lib/permission-utils";

export function useHasPermission(permissionCode: string): boolean {
  const { user } = useAuthStore();

  const hasPermission = useMemo(() => {
    if (!user) {
      return false;
    }

    if (user.role?.is_owner === true || user.role?.data_scope === "ALL") {
      return true;
    }

    const permissions = user.permissions ?? {};
    return hasPermissionCode(permissions, permissionCode);
  }, [user, permissionCode]);

  return hasPermission;
}

/**
 * Hook to get the scope for a specific permission.
 * Returns the scope string (OWN|DIVISION|AREA|ALL) or null if no permission.
 */
export function usePermissionScope(permissionCode: string): string | null {
  const { user } = useAuthStore();

  return useMemo(() => {
    if (!user) return null;

    if (user.role?.is_owner === true || user.role?.data_scope === "ALL") {
      return "ALL";
    }

    const permissions = user.permissions ?? {};
    return resolvePermissionScope(permissions, permissionCode);
  }, [user, permissionCode]);
}
