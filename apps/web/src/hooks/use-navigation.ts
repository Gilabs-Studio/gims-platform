"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import type { MenuWithActions, Action } from "@/features/master-data/user-management/types";

function isItemVisible(item: NavItem, permissionCodes: string[]): boolean {
  if (item.permission) {
    return permissionCodes.includes(item.permission);
  }
  if (item.children) {
    return item.children.some((child) => isItemVisible(child, permissionCodes));
  }
  return true; 
}

function transformItem(item: NavItem, permissionCodes: string[]): MenuWithActions | null {
  if (!isItemVisible(item, permissionCodes)) return null;

  const children = item.children
    ? item.children
        .map((child) => transformItem(child, permissionCodes))
        .filter((c): c is MenuWithActions => c !== null)
    : undefined;

  // If item had children definition but result is empty, hide parent
  if (item.children && (!children || children.length === 0)) {
    return null;
  }

  // Synthesize a generic VIEW action to satisfy dashboard-layout check
  const viewAction: Action = {
    id: "view",
    code: "VIEW",
    name: "View",
    action: "VIEW",
    access: true,
  };

  return {
    id: item.url, // Use URL as ID for consistency
    name: item.name,
    icon: item.icon,
    url: item.url,
    children,
    actions: [viewAction],
  };
}

export function useNavigation() {
  const { user } = useAuthStore();
  
  const menus = useMemo(() => {
    // Extract permission codes from the permissions map (code -> scope)
    const permissionCodes = Object.keys(user?.permissions ?? {});
    return navigationConfig
      .map((item) => transformItem(item, permissionCodes))
      .filter((item): item is MenuWithActions => item !== null);
  }, [user?.permissions]);

  return { menus };
}
