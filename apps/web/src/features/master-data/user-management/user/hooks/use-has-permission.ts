"use client";

import { useMemo } from "react";
import { useUserPermissions } from "./use-user-permissions";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { MenuWithActions, Action } from "../types";

/**
 * Recursively searches through menus and their children to find an action by code
 */
function findActionByCode(
  menus: MenuWithActions[],
  code: string
): { code: string; access: boolean } | null {
  for (const menu of menus) {
    // Check actions in current menu
    if (menu.actions) {
      const action = menu.actions.find((a) => a.code === code);
      if (action) {
        return { code: action.code, access: action.access };
      }
    }

    // Recursively check children
    if (menu.children && menu.children.length > 0) {
      const found = findActionByCode(menu.children, code);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Hook to check if the current user has a specific permission
 * @param permissionCode - The permission code to check (e.g., "ROLES", "PERMISSIONS", "VIEW_USERS")
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permissionCode: string): boolean {
  const { user } = useAuthStore();
  const { data: permissionsData } = useUserPermissions();

  const hasPermission = useMemo(() => {
    // 1. Check flat permissions from Auth Store (Primary)
    if (user?.permissions?.includes(permissionCode)) {
      return true;
    }

    // 2. Check nested menus (Legacy/Fallback)
    if (!permissionsData?.data?.menus) {
      return false;
    }

    const action = findActionByCode(permissionsData.data.menus, permissionCode);
    return action?.access ?? false;
  }, [user, permissionsData, permissionCode]);

  return hasPermission;
}
