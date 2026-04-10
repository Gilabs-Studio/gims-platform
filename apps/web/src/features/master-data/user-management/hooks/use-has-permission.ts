"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { hasPermissionCode } from "@/lib/permission-utils";

function isPrivilegedRole(roleCode?: string): boolean {
  const normalized = roleCode?.trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
}

/**
 * Hook to check if the current user has a specific permission.
 * Uses the permissions map (code -> scope) from the user object in auth store.
 *
 * @param permissionCode - The permission code to check in format "module.action" (e.g., "user.read", "role.create")
 * @returns boolean indicating if user has the permission
 *
 * @example
 * const canCreateUser = useHasPermission("user.create");
 * const canReadRoles = useHasPermission("role.read");
 */
export function useHasPermission(permissionCode: string): boolean {
  const { user } = useAuthStore();

  const hasPermission = useMemo(() => {
    if (!user) {
      return false;
    }

    if (isPrivilegedRole(user.role?.code)) {
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

    if (isPrivilegedRole(user.role?.code)) {
      return "ALL";
    }


    const permissions = user.permissions ?? {};
    return permissions[permissionCode] ?? null;
  }, [user, permissionCode]);
}
