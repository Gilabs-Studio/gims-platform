"use client";

import { useMemo } from "react";
import { useUserPermissions } from "../../../master-data/user-management/hooks/use-user-permissions";
import type { MenuWithActions } from "@/features/master-data/user-management/types";

/**
 * Recursively searches through menus and their children to find an action by code
 * Only searches in menus that match the purchase requisitions URL pattern
 */
function findActionByCode(
  menus: MenuWithActions[],
  code: string
): { code: string; access: boolean } | null {
  for (const menu of menus) {
    // Check if this menu or its children are related to purchase requisitions
    const isPurchaseRequisitionMenu =
      menu.url?.includes("/purchase/requisitions") ||
      menu.name?.toLowerCase().includes("purchase requisitions") ||
      (menu.children?.some((child) =>
        child.url?.includes("/purchase/requisitions") ||
        child.name?.toLowerCase().includes("purchase requisitions")
      ) ?? false);

    if (isPurchaseRequisitionMenu) {
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
 * Hook to check if the current user has a specific permission for PURCHASE_REQUISITIONS menu
 * @param permissionCode - The permission code to check (e.g., "VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "REJECT", "CONVERT")
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: permissionsData } = useUserPermissions();

  const hasPermission = useMemo(() => {
    if (!permissionsData?.data?.menus) {
      return false;
    }

    // Search for the action in PURCHASE_REQUISITIONS-related menus
    const action = findActionByCode(permissionsData.data.menus, permissionCode);
    return action?.access ?? false;
  }, [permissionsData, permissionCode]);

  return hasPermission;
}

