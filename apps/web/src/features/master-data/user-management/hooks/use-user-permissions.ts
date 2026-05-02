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
  const { user, setUser } = useAuthStore();
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
    // Prefer server-provided permissions when available (reflects latest role/menu assignments)
    const serverPermissionsList = (query.data.data as any)?.permissions ?? undefined;
    const serverPermissions: Record<string, string> = {};
    if (Array.isArray(serverPermissionsList)) {
      for (const p of serverPermissionsList) {
        if (p && p.code) {
          serverPermissions[p.code] = p.scope ?? "ALL";
        }
      }
    }

    // Merge: server-provided permissions take precedence over stored auth permissions
    const userPermissions = {
      ...(user?.permissions ?? {}),
      ...serverPermissions,
    } as Record<string, string>;
    const menus = query.data.data.menus;
    
    // Mark menus with access based on merged permissions map (code -> scope)
    const markMenuAccess = (menu: MenuWithActions): MenuWithActions => {
      const markedActions = menu.actions?.map(action => {
        const hasAccess = !!(action.code && action.code in userPermissions);
        
        return {
          ...action,
          access: hasAccess,
        };
      }) ?? [];
      
      const markedChildren = menu.children?.map(markMenuAccess) ?? [];
      
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

  // Sync server-provided permissions into auth store so app stays consistent
  useEffect(() => {
    const serverPermissionsList = (query.data as any)?.data?.permissions ?? undefined;
    if (!serverPermissionsList || !user) return;

    const serverPermissions: Record<string, string> = {};
    if (Array.isArray(serverPermissionsList)) {
      for (const p of serverPermissionsList) {
        if (p && p.code) {
          serverPermissions[p.code] = p.scope ?? "ALL";
        }
      }
    }

    const merged = {
      ...(user.permissions ?? {}),
      ...serverPermissions,
    } as Record<string, string>;

    // shallow compare
    const oldKeys = Object.keys(user.permissions ?? {});
    const newKeys = Object.keys(merged);
    let equal = oldKeys.length === newKeys.length;
    if (equal) {
      for (const k of newKeys) {
        if ((user.permissions ?? {})[k] !== merged[k]) {
          equal = false;
          break;
        }
      }
    }

    if (!equal) {
      setUser({
        ...user,
        permissions: merged,
      });
    }
  }, [query.data, user, setUser]);

  // Return query with processed menu data that includes access flags from login permissions
  return {
    ...query,
    data: menuData ? { data: menuData } : undefined,
  };
}

