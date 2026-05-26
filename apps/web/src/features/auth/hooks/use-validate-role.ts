"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const ROLE_VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Hook untuk real-time validation role user
 * - Cek apakah role user masih valid setiap interval
 * - Auto logout jika role terhapus atau tidak valid
 * - Redirect ke block page jika permission di-revoke
 */
export function useValidateRole() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations("auth");
  const lastValidatedRef = useRef<boolean | null>(null); // null = not yet validated, true = was valid, false = was invalid

  const { data: permissionsData, error } = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      const { userService } = await import("@/features/master-data/user-management/services/user-service");
      return userService.getPermissions(user.id);
    },
    enabled: !!user?.id && !!user?.role,
    staleTime: ROLE_VALIDATION_CACHE_TTL_MS,
    gcTime: ROLE_VALIDATION_CACHE_TTL_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
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
    retryDelay: 2000,
  });

  const isAuthError = error ? (() => {
    const axiosError = error as { 
      response?: { 
        status?: number; 
        data?: { error?: { code?: string; message?: string } } 
      };
      message?: string;
      code?: string;
    };
    return (
      axiosError.response?.status === 404 ||
      axiosError.response?.status === 401 ||
      axiosError.response?.data?.error?.code === "USER_NOT_FOUND" ||
      axiosError.response?.data?.error?.code === "ROLE_NOT_FOUND"
    );
  })() : false;

  useEffect(() => {
    // Only redirect if we have a definitive invalid result AND we previously had a valid result.
    if (
      isAuthError &&
      lastValidatedRef.current === true &&
      user?.role
    ) {
      lastValidatedRef.current = false;

      toast.error(
        t("roleInvalid.title", { defaultValue: "Access Revoked" }),
        {
          description: t("roleInvalid.description", {
            defaultValue:
              "Your role has been removed or permissions have been revoked. You will be redirected.",
          }),
          duration: 5000,
        }
      );

      router.replace("/block");
      return;
    }

    if (permissionsData) {
      lastValidatedRef.current = true;
    }
  }, [permissionsData, isAuthError, router, t, user?.role]);

  // Return isValid: false only if we have an explicit auth error
  const isValid = !isAuthError;

  return {
    isValid,
    isLoading: !permissionsData && !error,
  };
}

