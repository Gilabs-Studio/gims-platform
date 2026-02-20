"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getMenuIcon } from "@/lib/menu-icons";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { navigationConfig } from "@/lib/navigation-config";
import {
  useCommandPalette,
  type CommandPaletteItem,
} from "../hooks/use-command-palette";

interface CommandPaletteProps {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * Reusable Command Palette Component
 * Features:
 * - Multilingual support (EN/ID)
 * - Permission-based filtering
 * - Keyboard shortcuts (Ctrl/Cmd + K)
 * - Grouped menu display
 * - Only shows valid/accessible routes
 */
export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const t = useTranslations("commandPalette");
  
  const commandPalette = useCommandPalette({
    onOpenChange,
  });

  // Filter items by permissions
  const filteredItems = usePermissionFilteredItems(commandPalette.items);

  // Group items by category
  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, CommandPaletteItem[]>>(
      (groups, item) => {
        const group = item.group || t("groups.menus");
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(item);
        return groups;
      },
      {}
    );
  }, [filteredItems, t]);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : commandPalette.isOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      if (newOpen) {
        commandPalette.open();
      } else {
        commandPalette.close();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 shadow-2xl sm:max-w-xl"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <Command>
          <CommandInput placeholder={t("placeholder")} />
          <CommandList>
            <CommandEmpty>{t("noResults")}</CommandEmpty>
            {Object.entries(groupedItems).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={`${group}-${item.id}-${item.href}`}
                    value={item.name}
                    onSelect={() => commandPalette.onSelectItem(item.href)}
                  >
                    {getMenuIcon(item.icon)}
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.href}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to filter command items based on user permissions
 * This handles the permission check for each menu item
 */
function usePermissionFilteredItems(
  items: CommandPaletteItem[]
): CommandPaletteItem[] {
  const { user } = useAuthStore();

  // Build a map of navigation items with their permissions
  const navItemsMap = useMemo(() => {
    const map = new Map<string, { permission?: string }>();

    const walkItems = (navItems: typeof navigationConfig) => {
      navItems.forEach((item) => {
        if (item.url) {
          map.set(item.url, { permission: item.permission });
        }
        if (item.children) {
          walkItems(item.children);
        }
      });
    };

    walkItems(navigationConfig);
    return map;
  }, []);

  // Check if user has permission
  const hasPermission = useMemo(() => {
    return (permissionCode?: string): boolean => {
      // If no user, no permission
      if (!user) {
        return false;
      }

      // If no permission required, allow access
      if (!permissionCode) {
        return true;
      }

      // Admin bypass - admin and superadmin have all permissions
      if (user.role?.code === "admin" || user.role?.code === "superadmin") {
        return true;
      }

      // Check the permissions map (code -> scope)
      const permissions = user.permissions ?? {};
      return permissionCode in permissions;
    };
  }, [user]);

  // Filter items based on permissions
  return useMemo(() => {
    return items.filter((item) => {
      const navItem = navItemsMap.get(item.href);
      return hasPermission(navItem?.permission);
    });
  }, [items, navItemsMap, hasPermission]);
}
