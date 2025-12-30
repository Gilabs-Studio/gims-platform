"use client";

import { useMemo } from "react";
import { useUserPermissions } from "../../user/hooks/use-user-permissions";
import type { Menu } from "@/features/auth/types";

/**
 * Find the Menu menu in the permissions tree by looking for the MENU menu code
 */
function findMenuMenuActions(
  menus: Menu[]
): Map<string, boolean> {
  const actions = new Map<string, boolean>();
  
  for (const menu of menus) {
    // Look for MENU code specifically or url containing /menu
    const isMenuMenu = 
      menu.url?.endsWith("/user-management/menu") ||
      menu.url?.includes("/data-master/user-management/menu") ||
      (menu.children?.some((child) => 
        child.url?.includes("/menu")
      ) ?? false);

    if (isMenuMenu && menu.actions) {
      // Store all action codes and their access status
      menu.actions.forEach((action) => {
        actions.set(action.code, action.access);
      });
    }

    // Also check children recursively
    if (menu.children && menu.children.length > 0) {
      const childActions = findMenuMenuActions(menu.children);
      childActions.forEach((access, code) => {
        if (!actions.has(code)) {
          actions.set(code, access);
        }
      });
    }
  }
  
  return actions;
}

export type MenuPermissionAction = "VIEW" | "CREATE" | "EDIT" | "DELETE" | "DETAIL";

export function useHasPermission() {
  const query = useUserPermissions();

  const menus = useMemo(() => {
    return query.data?.data?.menus ?? [];
  }, [query.data]);

  const isLoading = query.isLoading;

  const menuActions = useMemo(() => {
    return findMenuMenuActions(menus);
  }, [menus]);

  const canView = useMemo(() => {
    // If no actions found, default to true (allow user to see the page, API will handle permissions)
    const result = menuActions.get("VIEW") ?? true;
    console.log("[useHasPermission] canView:", result, "menuActions:", Array.from(menuActions.entries()));
    return result;
  }, [menuActions]);

  const canCreate = useMemo(() => {
    return menuActions.get("CREATE") ?? false;
  }, [menuActions]);

  const canEdit = useMemo(() => {
    return menuActions.get("EDIT") ?? false;
  }, [menuActions]);

  const canDelete = useMemo(() => {
    return menuActions.get("DELETE") ?? false;
  }, [menuActions]);

  const canDetail = useMemo(() => {
    return menuActions.get("DETAIL") ?? false;
  }, [menuActions]);

  console.log("[useHasPermission] isLoading:", isLoading, "permissions:", {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canDetail,
  });

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canDetail,
    isLoading,
  };
}
