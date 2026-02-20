"use client";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useUserPermission(permission: string): boolean {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  // Admin bypass
  if (user.role?.code === "admin") {
    return true;
  }

  const permissions = user.permissions ?? {};
  return permission in permissions;
}

export function useUserPermissions(permissions: string[]): boolean {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  // Admin bypass
  if (user.role?.code === "admin") {
    return true;
  }

  const userPerms = user.permissions ?? {};
  return permissions.some((permission) => permission in userPerms);
}
