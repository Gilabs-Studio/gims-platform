"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

/**
 * Hook to check if the current user has a specific permission
 * Uses the flat permissions array from the user object in auth store
 * This matches the API response format from login endpoint
 *
 * @param permissionCode - The permission code to check in format "module.action" (e.g., "user.read", "role.create")
 * @returns boolean indicating if user has the permission
 *
 * @example
 * // Check if user can create users
 * const canCreateUser = useHasPermission("user.create");
 *
 * // Check if user can read roles
 * const canReadRoles = useHasPermission("role.read");
 */
export function useHasPermission(permissionCode: string): boolean {
  const { user } = useAuthStore();

  const hasPermission = useMemo(() => {
    // If no user, no permission
    if (!user) {
      return false;
    }

    // Admin bypass - admin and superadmin have all permissions
    if (user.role?.code === "admin" || user.role?.code === "superadmin") {
      return true;
    }

    // Check the permissions array directly
    const permissions = user.permissions ?? [];
    return permissions.includes(permissionCode);
  }, [user, permissionCode]);

  return hasPermission;
}
