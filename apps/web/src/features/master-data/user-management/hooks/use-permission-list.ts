"use client";

import { usePermissions } from "./use-permissions";
import type { Permission } from "../types";

export function usePermissionList() {
  const { data, isLoading } = usePermissions();

  const permissions = data?.data || [];

  // Group permissions by menu
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const key = perm.menu?.name || "Other";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return {
    groupedPermissions,
    isLoading
  };
}
