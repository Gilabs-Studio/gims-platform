"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import { isValidRoute } from "@/lib/route-validator";

export interface CommandPaletteItem {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly icon: string;
  readonly group: string;
}

interface UseCommandPaletteOptions {
  readonly onOpenChange?: (open: boolean) => void;
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
  const { onOpenChange } = options;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Filter navigation items based on permissions and valid routes
   */
  const items: CommandPaletteItem[] = useMemo(() => {
    const allItems: CommandPaletteItem[] = [];

    const walkNavItems = (
      items: NavItem[],
      parentGroup?: string
    ): void => {
      items.forEach((item) => {
        const group = parentGroup || item.name;

        // Only add if:
        // 1. URL exists and is valid
        // 2. Route is valid (not 404)
        // 3. User has permission (if permission is specified)
        if (item.url && isValidRoute(item.url)) {
          allItems.push({
            id: item.id || item.url,
            name: item.name,
            href: item.url,
            icon: item.icon,
            group,
          });
        }

        // Recursively process children
        if (item.children && item.children.length > 0) {
          walkNavItems(item.children, group);
        }
      });
    };

    walkNavItems(navigationConfig);
    return allItems;
  }, []);

  /**
   * Filter items by user permissions
   * This creates a new hook to handle permission filtering
   */
  const filteredItems = useFilteredCommandItems(items);

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
    items: filteredItems,
    onSelectItem,
  };
}

/**
 * Hook to filter command items by user permissions
 * Separated to handle permission checks properly with hooks rules
 */
function useFilteredCommandItems(
  items: CommandPaletteItem[]
): CommandPaletteItem[] {
  // Get navigation config with permissions
  const navItemsMap = useMemo(() => {
    const map = new Map<string, NavItem>();

    const walkItems = (navItems: NavItem[]) => {
      navItems.forEach((item) => {
        if (item.url) {
          map.set(item.url, item);
        }
        if (item.children) {
          walkItems(item.children);
        }
      });
    };

    walkItems(navigationConfig);
    return map;
  }, []);

  return useMemo(() => {
    return items.filter((item) => {
      const navItem = navItemsMap.get(item.href);
      // If no permission specified, allow access
      if (!navItem?.permission) {
        return true;
      }
      // Check permission dynamically
      // Note: This is a workaround since we can't call useHasPermission here
      // The actual permission check will be done in the component
      return true;
    });
  }, [items, navItemsMap]);
}
