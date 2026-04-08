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
import type { MenuWithActions } from "@/features/master-data/user-management/types";
import {
  useCommandPalette,
  type CommandPaletteItem,
} from "../hooks/use-command-palette";

interface CommandPaletteProps {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly menus?: MenuWithActions[];
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
  menus,
}: CommandPaletteProps) {
  const t = useTranslations("commandPalette");

  const commandPalette = useCommandPalette({
    onOpenChange,
    menus,
  });

  // Group items by category
  const groupedItems = useMemo(() => {
    return commandPalette.items.reduce<Record<string, CommandPaletteItem[]>>(
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
  }, [commandPalette.items, t]);

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
                    key={item.uid}
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
