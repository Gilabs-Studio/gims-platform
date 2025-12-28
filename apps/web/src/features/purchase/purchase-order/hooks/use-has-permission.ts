"use client";

import { useMemo } from "react";
import { useUserPermissions } from "../../../master-data/user-management/hooks/use-user-permissions";
import type { Menu } from "@/features/auth/types";

/**
 * Recursively searches through menus and their children to find an action by code
 * Only searches in menus that match the purchase order URL pattern
 */
function findActionByCode(
  menus: Menu[],
  code: string
): { code: string; access: boolean } | null {
  for (const menu of menus) {
    // Check if this menu or its children are related to purchase orders
    const isPurchaseOrderMenu =
      menu.url?.includes("/purchase/order") ||
      menu.name?.toLowerCase().includes("purchase order") ||
      (menu.children?.some((child) =>
        child.url?.includes("/purchase/order") ||
        child.name?.toLowerCase().includes("purchase order")
      ) ?? false);

    if (isPurchaseOrderMenu) {
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
  }

  return null;
}

/**
 * Hook to check if the current user has a specific permission for PURCHASE_ORDER menu
 * @param permissionCode - The permission code to check (e.g., "VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "DETAIL", "EXPORT", "PRINT")
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: permissionsData } = useUserPermissions();

  const hasPermission = useMemo(() => {
    if (!permissionsData?.data?.menus) {
      return false;
    }

    // Search for the action in PURCHASE_ORDER-related menus
    const action = findActionByCode(permissionsData.data.menus, permissionCode);
    return action?.access ?? false;
  }, [permissionsData, permissionCode]);

  return hasPermission;
}

