"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getLocaleFromPathname } from "@/lib/i18n/get-locale";

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
  const t = useTranslations("auth");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedRef = useRef<boolean | null>(null); // null = not yet validated, true = was valid, false = was invalid

  const { data: validationData, refetch, error: validationError, isLoading: isValidating } = useQuery({
    queryKey: ["validate-role", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { is_valid: false };
      }

      // Validate by checking permissions endpoint
      // If it returns 404 or 401, role is invalid
      try {
        const { userService } = await import("@/features/master-data/user-management/user/services/user-service");
        await userService.getPermissions(user.id);
        return { is_valid: true };
      } catch (error: unknown) {
        // Check if error is 404 or 401
        const axiosError = error as { 
          response?: { 
            status?: number; 
            data?: { error?: { code?: string; message?: string } } 
          };
          message?: string;
          code?: string;
        };

        // Only treat as invalid if we have a clear auth error response
        if (
          axiosError.response?.status === 404 ||
          axiosError.response?.status === 401 ||
          axiosError.response?.data?.error?.code === "USER_NOT_FOUND" ||
          axiosError.response?.data?.error?.code === "ROLE_NOT_FOUND"
        ) {
          return { is_valid: false };
        }
        
        // For errors without response (network errors, CORS, etc.) or other errors, assume valid
        // This prevents false positives from temporary API issues
        return { is_valid: true };
      }
    },
    enabled: !!user?.id && !!user?.role,
    refetchInterval: 30000, // Check every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      const axiosError = error as { response?: { status?: number; data?: { error?: { code?: string } } } };
      if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403 ||
        axiosError.response?.status === 404 ||
        axiosError.response?.data?.error?.code === "USER_NOT_FOUND" ||
        axiosError.response?.data?.error?.code === "ROLE_NOT_FOUND"
      ) {
        return false;
      }
      // Retry once for network errors
      return failureCount < 1;
    },
    retryDelay: 2000, // Wait 2 seconds before retry
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
    // Don't redirect on initial load or if still loading
    // Only redirect if we have a definitive invalid result AND we previously had a valid result
    // CRITICAL: lastValidatedRef must be explicitly true (not null) to prevent false positives
    if (
      validationData && 
      !validationData.is_valid && 
      lastValidatedRef.current === true && // Must be explicitly true, not null
      user?.role // Only redirect if user actually has role (prevents false positives)
    ) {
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
      const locale = getLocaleFromPathname(pathname);

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
  }, [validationData, pathname, router, t, user?.role, isValidating, validationError]);

  // Return isValid based on validationData
  // If validationData is undefined (still loading), return true to prevent false positives
  // Only return false if we have explicit invalid result
  const isValid = validationData === undefined ? true : (validationData.is_valid ?? true);

  return {
    isValid,
    isLoading: !validationData,
  };
}

