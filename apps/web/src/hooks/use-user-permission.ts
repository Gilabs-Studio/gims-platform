"use client";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useUserPermission(permission: string): boolean {
  const { user } = useAuthStore();

  // No permission code means the widget has no restriction
  if (!permission) return true;
  if (!user) return false;

  const permissions = user.permissions ?? {};
  return permission in permissions;
}

export function useUserPermissions(permissions: string[]): boolean {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  const userPerms = user.permissions ?? {};
  return permissions.some((permission) => permission in userPerms);
}
