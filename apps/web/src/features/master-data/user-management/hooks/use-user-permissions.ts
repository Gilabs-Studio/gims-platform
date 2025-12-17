 "use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { useEffect } from "react";
import { userService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { AxiosError } from "axios";

export function useUserPermissions() {
  // Ensure hooks are called in consistent order - router first, then store
  const router = useRouter();
  const { user } = useAuthStore();
  const handleLogout = useLogout();
  
  const query = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error("User not authenticated");
      return userService.getPermissions(user.id);
    },
    enabled: !!user?.id,
    retry: false, // Don't retry on 404 - user doesn't exist
  });

  // Handle errors - role deleted, user not found, or permissions revoked
  useEffect(() => {
    if (query.error) {
      const error = query.error as AxiosError<{
        success: false;
        error: {
          code: string;
          message: string;
        };
      }>;
      
      // Get current locale from pathname
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const locale = pathParts[0] || "en";
      
      // If user not found (404) or USER_NOT_FOUND error, clear auth state
      if (
        error.response?.status === 404 ||
        error.response?.data?.error?.code === "USER_NOT_FOUND" ||
        error.response?.data?.error?.code === "ROLE_NOT_FOUND"
      ) {
        // Role deleted or user not found - redirect to block page
        const blockPath = `/${locale}/block`;
        if (typeof window !== "undefined") {
          window.location.href = blockPath;
        } else {
          router.replace(blockPath);
        }
      }
    }
  }, [query.error, handleLogout, router]);

  return query;
}

