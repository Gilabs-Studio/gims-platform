"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import type { MenuWithActions, Action } from "@/features/master-data/user-management/user/types";

function isItemVisible(item: NavItem, permissions: string[]): boolean {
  if (item.permission) {
    // If specific permission required, check it
    return permissions.includes(item.permission);
  }
  if (item.children) {
    // If has children, must have at least one visible child
    return item.children.some((child) => isItemVisible(child, permissions));
  }
  // If no permission and no children (e.g. public items or headers), assume visible
  return true; 
}

function transformItem(item: NavItem, permissions: string[]): MenuWithActions | null {
  if (!isItemVisible(item, permissions)) return null;

  const children = item.children
    ? item.children
        .map((child) => transformItem(child, permissions))
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
    const permissions = user?.permissions ?? [];
    return navigationConfig
      .map((item) => transformItem(item, permissions))
      .filter((item): item is MenuWithActions => item !== null);
  }, [user?.permissions]);

  return { menus };
}
