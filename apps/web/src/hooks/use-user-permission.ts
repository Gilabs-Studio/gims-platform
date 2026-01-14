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

  return user.permissions.includes(permission);
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

  return permissions.some((permission) => user.permissions.includes(permission));
}
