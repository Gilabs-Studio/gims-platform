"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getLocaleFromPathname } from "@/lib/i18n/get-locale";

const ROLE_VALIDATION_CACHE_PREFIX = "role_validation_cache";
const ROLE_VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;

interface RoleValidationCache {
  is_valid: boolean;
  checked_at: number;
  role_code?: string;
}

function getRoleValidationCache(userId?: string, roleCode?: string): { is_valid: boolean } | null {
  if (!userId || typeof globalThis.window === "undefined") {
    return null;
  }

  const cacheKey = `${ROLE_VALIDATION_CACHE_PREFIX}:${userId}`;
  const raw = localStorage.getItem(cacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RoleValidationCache;
    const isExpired = Date.now() - parsed.checked_at > ROLE_VALIDATION_CACHE_TTL_MS;
    const roleChanged = Boolean(roleCode && parsed.role_code && parsed.role_code !== roleCode);

    // Only trust short-lived positive cache to avoid stale block redirects.
    if (parsed.is_valid !== true || isExpired || roleChanged) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return { is_valid: true };
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function setRoleValidationCache(userId?: string, roleCode?: string): void {
  if (!userId || typeof globalThis.window === "undefined") {
    return;
  }

  const cacheKey = `${ROLE_VALIDATION_CACHE_PREFIX}:${userId}`;
  const payload: RoleValidationCache = {
    is_valid: true,
    checked_at: Date.now(),
    role_code: roleCode,
  };

  localStorage.setItem(cacheKey, JSON.stringify(payload));
}

function clearRoleValidationCache(userId?: string): void {
  if (!userId || typeof globalThis.window === "undefined") {
    return;
  }

  const cacheKey = `${ROLE_VALIDATION_CACHE_PREFIX}:${userId}`;
  localStorage.removeItem(cacheKey);
}

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
  const lastValidatedRef = useRef<boolean | null>(null); // null = not yet validated, true = was valid, false = was invalid
  const cachedValidation = useMemo(
    () => getRoleValidationCache(user?.id, user?.role?.code),
    [user?.id, user?.role?.code]
  );

  const { data: validationData } = useQuery({
    queryKey: ["validate-role", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { is_valid: false };
      }

      // Validate by checking permissions endpoint
      // If it returns 404 or 401, role is invalid
      try {
        const { userService } = await import("@/features/master-data/user-management/services/user-service");
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
    enabled: !!user?.id && !!user?.role && !cachedValidation,
    initialData: cachedValidation ?? undefined,
    staleTime: ROLE_VALIDATION_CACHE_TTL_MS,
    gcTime: ROLE_VALIDATION_CACHE_TTL_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: !cachedValidation,
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
    // Don't redirect on initial load or if still loading.
    // Only redirect if we have a definitive invalid result AND we previously had a valid result.
    if (
      validationData &&
      !validationData.is_valid &&
      lastValidatedRef.current === true &&
      user?.role
    ) {
      lastValidatedRef.current = false;
      clearRoleValidationCache(user?.id);

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

      const locale = getLocaleFromPathname(pathname);
      const blockPath = `/${locale}/block`;

      if (typeof window !== "undefined") {
        window.location.href = blockPath;
      } else {
        router.replace(blockPath);
      }
      return;
    }

    if (validationData?.is_valid) {
      lastValidatedRef.current = true;
      setRoleValidationCache(user?.id, user?.role?.code);
    }
  }, [validationData, pathname, router, t, user?.id, user?.role]);

  // Return isValid based on validationData
  // If validationData is undefined (still loading), return true to prevent false positives
  // Only return false if we have explicit invalid result
  const isValid = validationData === undefined ? true : (validationData.is_valid ?? true);

  return {
    isValid,
    isLoading: !validationData,
  };
}

