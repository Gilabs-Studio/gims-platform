"use client";

import { useMemo } from "react";
import { useUserPermissions } from "../../../master-data/user-management/user/hooks/use-user-permissions";
import type { Menu } from "@/features/auth/types";

function findActionByCode(
  menus: Menu[],
  code: string
): { code: string; access: boolean } | null {
  for (const menu of menus) {
    const isStockValuationMenu =
      menu.url?.includes("/stock/valuation") ||
      menu.name?.toLowerCase().includes("stock valuation") ||
      (menu.children?.some((child) =>
        child.url?.includes("/stock/valuation") ||
        child.name?.toLowerCase().includes("stock valuation")
      ) ?? false);

    if (isStockValuationMenu) {
      if (menu.actions) {
        const action = menu.actions.find((a) => a.code === code);
        if (action) {
          return { code: action.code, access: action.access };
        }
      }

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

export function useHasPermission(permissionCode: string): boolean {
  const { data: permissionsData } = useUserPermissions();

  const hasPermission = useMemo(() => {
    if (!permissionsData?.data?.menus) {
      return false;
    }

    const action = findActionByCode(permissionsData.data.menus, permissionCode);
    return action?.access ?? false;
  }, [permissionsData, permissionCode]);

  return hasPermission;
}

