"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { DashboardLayoutSkeleton } from "@/components/layouts/dashboard-layout-skeleton";
import { useAuthGuard } from "../hooks/use-auth-guard";

// Permission checking utilities
export type CurrentUserLike = {
  id: string;
  role?: {
    is_owner?: boolean;
    code?: string;
  } | null;
} | null | undefined;

export type TargetUserLike = {
  id: string;
  role?: {
    is_protected?: boolean;
    code?: string;
  } | null;
} | null | undefined;

function isProtectedTargetRole(role?: { is_protected?: boolean; code?: string } | null): boolean {
  if (!role) {
    return false;
  }

  if (role.is_protected === true) {
    return true;
  }

  const normalizedCode = role.code?.trim().toLowerCase() ?? "";
  return (
    normalizedCode === "tenant_owner" ||
    normalizedCode === "owner" ||
    normalizedCode.startsWith("tenant_owner_") ||
    normalizedCode.endsWith("_owner")
  );
}

export function canOwnerManageUser(
  currentUser: CurrentUserLike,
  targetUser: TargetUserLike
): boolean {
  if (!currentUser || !targetUser) {
    return false;
  }

  if (currentUser.id === targetUser.id) {
    return false;
  }

  return !isProtectedTargetRole(targetUser.role);
}

interface AuthGuardProps {
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthGuard();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return fallback ?? <DashboardLayoutSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
