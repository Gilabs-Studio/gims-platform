 "use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/i18n/routing";
import { useEffect } from "react";
import { authService } from "@/features/auth/services/auth-service";
import { userService } from "@/features/master-data/user-management/user/services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { AxiosError } from "axios";
import { getLocaleFromPathname } from "@/lib/i18n/get-locale";

export function useUserPermissions() {
  // Ensure hooks are called in consistent order - router first, then store
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const handleLogout = useLogout();
  
  const query = useQuery({
    queryKey: ["user-menus", user?.id],
    queryFn: () => {
      if (!isAuthenticated || !user?.id) throw new Error("User not authenticated");
      return userService.getPermissions(user.id);
    },
    enabled: !!isAuthenticated && !!user?.role,
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401, 403) or specific error codes
      const axiosError = error as AxiosError<{
        error?: {
          code?: string;
        };
      }>;
      if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403 ||
        axiosError.response?.data?.error?.code === "USER_NOT_FOUND" ||
        axiosError.response?.data?.error?.code === "ROLE_NOT_FOUND"
      ) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: 1000, // Wait 1 second before retry
  });

  // Handle errors - role deleted, user not found, or permissions revoked
  useEffect(() => {
    // Only redirect if user has roles (prevents false positives on initial load)
    if (query.error && user?.role) {
      const error = query.error as AxiosError<{
        success?: false;
        error?: {
          code: string;
          message: string;
        };
      }>;
      
      // Only redirect to block page for specific authentication/authorization errors
      // Don't redirect for network errors or temporary failures
      const isAuthError = 
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        (error.response?.status === 404 && 
         (error.response?.data?.error?.code === "USER_NOT_FOUND" ||
          error.response?.data?.error?.code === "ROLE_NOT_FOUND"));
      
      if (isAuthError) {
        // Get current locale from pathname
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        const locale = getLocaleFromPathname(pathname);
        
        // Role deleted or user not found - redirect to block page
        const blockPath = `/${locale}/block`;
        
        if (typeof window !== "undefined") {
          window.location.href = blockPath;
        } else {
          router.replace(blockPath);
        }
      }
      // For other errors (network, 500, etc.), don't redirect - let component handle it
    }
  }, [query.error, query.isLoading, query.isFetching, query.data, router, user?.role]);

  return query;
}

