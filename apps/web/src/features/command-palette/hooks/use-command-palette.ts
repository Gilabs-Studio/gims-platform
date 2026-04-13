"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useRouter } from "@/i18n/routing";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import { isValidRoute } from "@/lib/route-validator";
import type { MenuWithActions } from "@/features/master-data/user-management/types";

export interface CommandPaletteItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly icon: string;
  readonly group: string;
  /**
   * Stable unique id used for React `key` rendering in lists.
   * Constructed from the item group + href and deduped at build-time.
   */
  readonly uid: string;
}

interface UseCommandPaletteOptions {
  readonly onOpenChange?: (open: boolean) => void;
  readonly menus?: MenuWithActions[];
}

interface UseCommandPaletteResult {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  readonly items: CommandPaletteItem[];
  readonly onSelectItem: (href: string) => void;
}

/**
 * Reusable hook for command palette functionality
 * Filters navigation items based on user permissions and valid routes
 * Supports keyboard shortcuts (Ctrl/Cmd + K)
 */
export function useCommandPalette(
  options: UseCommandPaletteOptions = {}
): UseCommandPaletteResult {
  const { onOpenChange, menus } = options;
  const router = useRouter();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const permissionCodes = useMemo(() => {
    return new Set(Object.keys(user?.permissions ?? {}));
  }, [user?.permissions]);

  const hasPermission = useCallback(
    (permissionCode?: string): boolean => {
      if (!user) {
        return false;
      }

      if (!permissionCode) {
        return true;
      }

      if (user.role?.code === "admin" || user.role?.code === "superadmin") {
        return true;
      }

      return permissionCodes.has(permissionCode);
    },
    [permissionCodes, user]
  );

  /**
   * Filter navigation items based on local permission data and valid routes
   */
  const items: CommandPaletteItem[] = useMemo(() => {
    const allItemsRaw: Array<{
      id: string;
      name: string;
      href: string;
      icon: string;
      group: string;
    }> = [];

    const walkNavigationItems = (
      items: NavItem[],
      parentGroup?: string
    ): void => {
      items.forEach((item) => {
        const group = parentGroup || item.name;

        if (item.url && isValidRoute(item.url) && hasPermission(item.permission)) {
          allItemsRaw.push({
            id: item.id || item.url,
            name: item.name,
            href: item.url,
            icon: item.icon,
            group,
          });
        }

        if (item.children && item.children.length > 0) {
          walkNavigationItems(item.children, group);
        }
      });
    };

    const walkMenuItems = (
      items: MenuWithActions[],
      parentGroup?: string
    ): void => {
      items.forEach((item) => {
        const group = parentGroup || item.name;

        if (item.url && isValidRoute(item.url)) {
          allItemsRaw.push({
            id: item.id,
            name: item.name,
            href: item.url,
            icon: item.icon,
            group,
          });
        }

        if (item.children && item.children.length > 0) {
          walkMenuItems(item.children, group);
        }
      });
    };

    if (menus && menus.length > 0) {
      walkMenuItems(menus);
    } else {
      walkNavigationItems(navigationConfig);
    }

    // Deduplicate by group + href to avoid duplicate React keys when
    // the same navigation entry appears multiple times.
    const seen = new Set<string>();
    const deduped: CommandPaletteItem[] = [];

    for (const raw of allItemsRaw) {
      const uid = `${raw.group}::${raw.href}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      deduped.push({
        ...raw,
        uid,
      });
    }

    return deduped;
  }, [hasPermission, menus]);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      onOpenChange?.(newState);
      return newState;
    });
  }, [onOpenChange]);

  const onSelectItem = useCallback(
    (href: string) => {
      // Validate route before navigation
      if (!href || !isValidRoute(href)) {
        console.warn(`[CommandPalette] Invalid route: ${href}`);
        return;
      }
      router.push(href);
      close();
    },
    [router, close]
  );

  /**
   * Keyboard shortcut handler (Ctrl/Cmd + K or /)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
        return;
      }
      
      // Forward slash (/) - only if not in input/textarea
      if (e.key === "/" && !isOpen) {
        const target = e.target as HTMLElement;
        const isInInput = 
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.isContentEditable;
        
        if (!isInInput) {
          e.preventDefault();
          open();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggle, open, isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    items,
    onSelectItem,
  };
}
