 "use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { useEffect, useMemo } from "react";
import { userService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { AxiosError } from "axios";
import { useLocale } from "next-intl";
import type { MenuWithActions } from "../types";

/**
 * Hook to get user permissions and menus
 * 
 * This hook fetches the menu structure from the API and marks each menu action
 * as accessible or not based on the user's permissions from the login response.
 * 
 * The user.permissions array from login contains permission codes like:
 * ["user.read", "user.create", "role.read", ...]
 * 
 * The menu structure from API contains menus with actions that need to be marked
 * with access: true/false based on whether the permission code exists in user.permissions
 */
export function useUserPermissions() {
  const router = useRouter();
  const { user } = useAuthStore();
  const handleLogout = useLogout();
  const locale = useLocale();
  
  // Get menu structure with user's permission access marked
  const query = useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: () => {
      if (user?.id) return userService.getPermissions(user.id);
      throw new Error("User not authenticated");
    },
    
    enabled: !!user?.id,
    retry: false,
  });

  // Build menu tree with access flags based on user.permissions from login
  const menuData = useMemo(() => {
    if (!query.data?.data) return null;
    
    const userPermissions = user?.permissions || [];
    const menus = query.data.data.menus;
    
    // Mark menus with access based on user permissions from login
    const markMenuAccess = (menu: MenuWithActions): MenuWithActions => {
      const markedActions = menu.actions?.map(action => {
        const hasAccess = userPermissions.includes(action.code);
        
        return {
          ...action,
          access: hasAccess,
        };
      }) || [];
      
      const markedChildren = menu.children?.map(markMenuAccess) || [];
      
      return {
        ...menu,
        actions: markedActions,
        children: markedChildren,
      };
    };
    
    return {
      ...query.data.data,
      menus: menus.map(markMenuAccess),
    };
  }, [query.data, user?.permissions]);

  useEffect(() => {
    if (query.error) {
      const error = query.error as AxiosError<{
        success: false;
        error: {
          code: string;
          message: string;
        };
      }>;
      
      if (
        error.response?.status === 404 ||
        error.response?.data?.error?.code === "USER_NOT_FOUND" ||
        error.response?.data?.error?.code === "ROLE_NOT_FOUND"
      ) {
        const blockPath = `/${locale}/block`;
        if (typeof globalThis.window !== "undefined") {
          globalThis.location.href = blockPath;
        } else {
          router.replace(blockPath);
        }
      }
    }
  }, [query.error, handleLogout, router, locale]);

  // Return query with processed menu data that includes access flags from login permissions
  return {
    ...query,
    data: menuData ? { data: menuData } : undefined,
  };
}
