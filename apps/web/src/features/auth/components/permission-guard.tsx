"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
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
  const { data: permissionsData, isLoading } = useUserPermissions();
  const hasPermission = useHasPermission(requiredPermission);
  
  // Real-time role validation
  const { isValid: isRoleValid, isLoading: isValidatingRole } = useValidateRole();

  useEffect(() => {
    // Don't redirect while loading permissions or validating role
    if (isLoading || isValidatingRole) {
      return;
    }

    // If role is invalid, redirect to block page
    // Only redirect if we have explicit invalid result (not during initial load)
    if (isRoleValid === false) {
      router.replace(fallbackUrl);
      return;
    }

    // If permissions loaded but user doesn't have permission, redirect
    if (permissionsData && !hasPermission) {
      router.replace(fallbackUrl);
    }
  }, [
    hasPermission,
    isLoading,
    isValidatingRole,
    permissionsData,
    isRoleValid,
    router,
    fallbackUrl,
  ]);

  // Show nothing while checking permissions or validating role
  if (isLoading || isValidatingRole) {
    return (
      <div className="flex h-full min-h-60 w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If role invalid or no permission, don't render children (redirect will happen)
  // Only check if we have explicit results (not during initial load)
  if (isRoleValid === false || (permissionsData && !hasPermission)) {
    return null;
  }

  return <>{children}</>;
}
