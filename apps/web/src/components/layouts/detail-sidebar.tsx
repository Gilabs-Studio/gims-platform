"use client";

import React, { memo, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface DetailSidebarItem {
  id: string;
  name: string;
  href?: string;
  icon?: React.ReactNode;
  children?: DetailSidebarItem[];
}

interface DetailSidebarProps {
  title: string;
  items: DetailSidebarItem[];
  isOpen: boolean;
  onToggle: () => void;
}

const TreeItem = memo(function TreeItem({
  item,
  level = 0,
  pathname,
}: {
  item: DetailSidebarItem;
  level?: number;
  pathname: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (hasChildren) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
            {item.icon && (
              <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate text-foreground/80">{item.name}</span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {item.children?.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              pathname={pathname}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70"
      )}
      style={{ paddingLeft: `${level * 12 + 12}px` }}
    >
      {item.icon && (
        <span className={cn(
          "shrink-0 [&>svg]:h-4 [&>svg]:w-4",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {item.icon}
        </span>
      )}
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  );
});

export const DetailSidebar = memo(function DetailSidebar({
  title,
  items,
  isOpen,
  onToggle,
}: DetailSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-16 top-0 z-30 h-screen w-56 bg-sidebar transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      data-slot="detail-sidebar"
    >
      <div className="flex h-full flex-col">
        {/* Header with collapse button */}
        <div className="flex h-16 items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-foreground/90">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu Items */}
        <ScrollArea className="flex-1 px-2 pb-4">
          <div className="space-y-0.5">
            {items.map((item) => (
              <TreeItem key={item.id} item={item} pathname={pathname} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
});
