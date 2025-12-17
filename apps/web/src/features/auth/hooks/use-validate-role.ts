"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { useLogout } from "./use-logout";
import { roleService } from "@/features/master-data/user-management/services/user-service";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * Hook untuk real-time validation role user
 * - Cek apakah role user masih valid setiap interval
 * - Auto logout jika role terhapus atau tidak valid
 * - Redirect ke block page jika permission di-revoke
 */
export function useValidateRole() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const handleLogout = useLogout();
  const t = useTranslations("auth");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedRef = useRef<boolean>(true);

  const { data: validationData, refetch } = useQuery({
    queryKey: ["validate-role", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { is_valid: false };
      }

      // Validate by checking user permissions endpoint
      // If it returns 404 or error, role is invalid
      try {
        const { userService } = await import("@/features/master-data/user-management/services/user-service");
        await userService.getPermissions(user.id);
        return { is_valid: true };
      } catch (error: unknown) {
        // Check if error is 404 or USER_NOT_FOUND
        const axiosError = error as { response?: { status?: number; data?: { error?: { code?: string } } } };
        if (
          axiosError.response?.status === 404 ||
          axiosError.response?.data?.error?.code === "USER_NOT_FOUND" ||
          axiosError.response?.data?.error?.code === "ROLE_NOT_FOUND"
        ) {
          return { is_valid: false };
        }
        // For other errors, assume valid (network issues, etc.)
        return { is_valid: true };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only validate if user is authenticated
    if (!user?.id || !user?.role) {
      return;
    }

    // Set up interval to check role validity
    intervalRef.current = setInterval(() => {
      refetch();
    }, 30000); // Check every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id, user?.role, refetch]);

  useEffect(() => {
    // Handle role validation result
    if (validationData && !validationData.is_valid && lastValidatedRef.current) {
      lastValidatedRef.current = false;

      // Show toast notification
      toast.error(
        t("roleInvalid.title", { defaultValue: "Access Revoked" }),
        {
          description: t("roleInvalid.description", {
            defaultValue: "Your role has been removed or permissions have been revoked. You will be redirected.",
          }),
          duration: 5000,
        }
      );

      // Get current locale from pathname
      const pathParts = pathname.split("/").filter(Boolean);
      const locale = pathParts[0] || "en";

      // Redirect to block page
      const blockPath = `/${locale}/block`;
      
      // Use window.location for absolute redirect
      if (typeof window !== "undefined") {
        window.location.href = blockPath;
      } else {
        router.replace(blockPath);
      }
    } else if (validationData?.is_valid) {
      lastValidatedRef.current = true;
    }
  }, [validationData, pathname, router, t]);

  return {
    isValid: validationData?.is_valid ?? true,
    isLoading: !validationData,
  };
}

