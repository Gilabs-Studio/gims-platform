"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

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


    // Check the permissions map (code -> scope)
    const permissions = user.permissions ?? {};
    return permissionCode in permissions;
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


    const permissions = user.permissions ?? {};
    return permissions[permissionCode] ?? null;
  }, [user, permissionCode]);
}
