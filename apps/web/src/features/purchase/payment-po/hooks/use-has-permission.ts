"use client";

import { useMemo } from "react";
import { useUserPermissions } from "../../../master-data/user-management/hooks/use-user-permissions";
import type { MenuWithActions } from "../../../master-data/user-management/types";

/**
 * Recursively searches through menus and their children to find an action by code
 * Only searches in menus that match the payment PO URL pattern
 */
function findActionByCode(
  menus: MenuWithActions[],
  code: string
): { code: string; access: boolean } | null {
  for (const menu of menus) {
    // Check if this menu or its children are related to payment PO
    // Menu code from seeder: PAYMENT_PO
    const isPaymentPOMenu =
      menu.code === "PAYMENT_PO" ||
      menu.url?.includes("/purchase/payment") ||
      menu.name?.toLowerCase().includes("payment po") ||
      (menu.children?.some((child) =>
        child.code === "PAYMENT_PO" ||
        child.url?.includes("/purchase/payment") ||
        child.name?.toLowerCase().includes("payment po")
      ) ?? false);

    if (isPaymentPOMenu) {
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
 * Hook to check if the current user has a specific permission for PAYMENT_PO menu
 * @param permissionCode - The permission code to check (e.g., "VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "DETAIL")
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: permissionsData } = useUserPermissions();

  const hasPermission = useMemo(() => {
    if (!permissionsData?.data?.menus) {
      return false;
    }

    // Search for the action in PAYMENT_PO-related menus
    const action = findActionByCode(permissionsData.data.menus, permissionCode);
    return action?.access ?? false;
  }, [permissionsData, permissionCode]);

  return hasPermission;
}
