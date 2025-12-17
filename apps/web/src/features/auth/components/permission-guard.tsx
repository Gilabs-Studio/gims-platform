"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useUserPermissions } from "@/features/master-data/user-management/hooks/use-user-permissions";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useValidateRole } from "../hooks/use-validate-role";

interface PermissionGuardProps {
  readonly children: React.ReactNode;
  readonly requiredPermission: string;
  readonly fallbackUrl?: string;
}

/**
 * PermissionGuard component that checks if user has required permission
 * - Real-time role validation
 * - Permission checking
 * - Auto redirect to block page if permission revoked
 */
export function PermissionGuard({
  children,
  requiredPermission,
  fallbackUrl = "/block",
}: PermissionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: permissionsData, isLoading } = useUserPermissions();
  const hasPermission = useHasPermission(requiredPermission);
  
  // Real-time role validation
  const { isValid: isRoleValid } = useValidateRole();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) {
      return;
    }

    // If role is invalid, redirect to block page
    if (!isRoleValid) {
      const pathParts = pathname.split("/").filter(Boolean);
      const locale = pathParts[0] || "en";
      const blockPath = `/${locale}${fallbackUrl}`;

      if (typeof window !== "undefined") {
        window.location.href = blockPath;
      } else {
        router.replace(blockPath);
      }
      return;
    }

    // If permissions loaded but user doesn't have permission, redirect
    if (permissionsData && !hasPermission) {
      // Get current locale from pathname (pathname format: /en/... or /id/...)
      const pathParts = pathname.split("/").filter(Boolean);
      const locale = pathParts[0] || "en";

      // Ensure fallbackUrl is absolute (starts with /)
      const absoluteBlockUrl = fallbackUrl.startsWith("/")
        ? fallbackUrl
        : `/${fallbackUrl}`;

      // Construct absolute path with locale
      const blockPath = `/${locale}${absoluteBlockUrl}`;

      // Use window.location for absolute redirect to avoid routing issues
      if (typeof window !== "undefined") {
        window.location.href = blockPath;
      } else {
        router.replace(blockPath);
      }
    }
  }, [
    hasPermission,
    isLoading,
    permissionsData,
    isRoleValid,
    router,
    pathname,
    fallbackUrl,
  ]);

  // Show nothing while checking permissions
  if (isLoading) {
    return null;
  }

  // If role invalid or no permission, don't render children (redirect will happen)
  if (!isRoleValid || !hasPermission) {
    return null;
  }

  return <>{children}</>;
}
