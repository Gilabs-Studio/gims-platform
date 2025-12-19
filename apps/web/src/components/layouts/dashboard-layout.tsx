"use client";

import React, { memo, useMemo, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Search, Settings, Menu as MenuIcon, ChevronRight } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useUserPermissions } from "@/features/master-data/user-management/hooks/use-user-permissions";
import { useValidateRole } from "@/features/auth/hooks/use-validate-role";
import type { MenuWithActions } from "@/features/master-data/user-management/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { ThemeToggleButton as ThemeToggle } from "@/components/ui/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getMenuIcon } from "@/lib/menu-icons";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useDashboardCommandPalette } from "@/hooks/use-dashboard-command-palette";
import { NotificationDrawer } from "@/features/notifications/components/notification-drawer";
import { useNotificationStore } from "@/features/notifications/stores/use-notification-store";

import { IconSidebar, type IconSidebarItem } from "./icon-sidebar";
import { DetailSidebar, type DetailSidebarItem } from "./detail-sidebar";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { cn } from "@/lib/utils";

const DETAIL_SIDEBAR_STORAGE_KEY = "detail_sidebar_state";
const ACTIVE_PARENT_STORAGE_KEY = "active_parent_id";

/**
 * Check if user has VIEW permission for a menu item
 */
function checkViewPermission(menu: MenuWithActions): boolean {
  if (menu.actions && menu.actions.length > 0) {
    const viewAction = menu.actions.find(
      (action) => (action.code === "VIEW" || action.code.startsWith("VIEW_")) && action.access
    );
    if (viewAction) return true;
  }
  if (menu.children && menu.children.length > 0) {
    return menu.children.some((child) => checkViewPermission(child));
  }
  return false;
}

/**
 * Check if a path matches a menu item's URL
 */
function isPathMatch(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`);
}

/**
 * Recursively check if any child menu matches the current path
 */
function hasMatchingChildPath(children: MenuWithActions[], pathname: string): boolean {
  return children.some((child) => {
    if (child.url && isPathMatch(pathname, child.url)) return true;
    if (child.children) return hasMatchingChildPath(child.children, pathname);
    return false;
  });
}

/**
 * Find parent menu ID by matching current pathname against child URLs
 */
function findParentMenuByPath(menus: MenuWithActions[], pathname: string): string | null {
  for (const menu of menus) {
    if (!menu.children || menu.children.length === 0) continue;
    
    const hasMatch = menu.children.some((child) => {
      if (child.url && isPathMatch(pathname, child.url)) return true;
      if (child.children) return hasMatchingChildPath(child.children, pathname);
      return false;
    });
    
    if (hasMatch) return String(menu.id);
  }
  return null;
}

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

const Header = memo(function Header({
  userName,
  avatarUrl,
  fallbackAvatarUrl,
  onMobileMenuClick,
}: {
  userName: string;
  avatarUrl?: string;
  fallbackAvatarUrl: string;
  onMobileMenuClick: () => void;
}) {
  const locale = useLocale();
  const logout = useLogout();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [currentSrc, setCurrentSrc] = React.useState<string | undefined>(
    avatarUrl && avatarUrl.trim() !== "" ? avatarUrl : fallbackAvatarUrl
  );
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    if (avatarUrl && avatarUrl.trim() !== "") {
      setCurrentSrc(avatarUrl);
    } else {
      setCurrentSrc(fallbackAvatarUrl);
    }
  }, [avatarUrl, fallbackAvatarUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 bg-background px-4 md:rounded-tl-3xl border-b">
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      )}

      <div className="flex-1">
        {/* Desktop search input */}
        <div className="relative hidden max-w-sm flex-1 lg:block">
          <Search
            className="text-foreground/60 pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search..."
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full cursor-pointer rounded-md border bg-background/60 px-3 py-1 pr-4 pl-10 text-sm shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="bg-muted text-muted-foreground absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Mobile search button */}
        <div className="block lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            type="button"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Open search</span>
          </Button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 overflow-visible">
        <NotificationBadge />
        <ThemeToggle />

        <Link
          href={pathname || "/dashboard"}
          locale={locale === "en" ? "id" : "en"}
          scroll={false}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 text-xs font-semibold shadow-sm hover:bg-accent/60"
            type="button"
          >
            {locale === "en" ? "ID" : "EN"}
          </Button>
        </Link>

        <div className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-1/2 data-[orientation=vertical]:w-px mx-2 h-4 w-px" />

        {mounted ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-8 w-8 items-center justify-center rounded-full p-0 hover:bg-muted transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={currentSrc}
                    alt={userName}
                    onError={() => {
                      if (currentSrc !== fallbackAvatarUrl) {
                        setCurrentSrc(fallbackAvatarUrl);
                      }
                    }}
                  />
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <div className="text-foreground text-sm font-medium">
                  {userName}
                </div>
              </div>
              <Separator className="my-1" />
              <div className="flex flex-col gap-1">
                <Link
                  href="/profile"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  Logout
                </button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="ghost"
            className="flex h-8 w-8 items-center justify-center rounded-full p-0 hover:bg-muted transition-colors"
            disabled
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={currentSrc}
                alt={userName}
                onError={() => {
                  if (currentSrc !== fallbackAvatarUrl) {
                    setCurrentSrc(fallbackAvatarUrl);
                  }
                }}
              />
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  );
});

const MobileSidebar = memo(function MobileSidebar({
  isOpen,
  onClose,
  parentItems,
  activeParentId,
  onSelectParent,
  detailItems,
  detailTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  parentItems: IconSidebarItem[];
  activeParentId: string | null;
  onSelectParent: (id: string) => void;
  detailItems: DetailSidebarItem[];
  detailTitle: string;
}) {
  const pathname = usePathname();

  // Check if active parent has children
  const activeParent = parentItems.find((p) => p.id === activeParentId);
  const showDetailColumn = activeParent?.hasChildren && detailItems.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation menu</SheetDescription>
        </SheetHeader>
        <div className="flex h-full">
          {/* Icon Column */}
          <div className={cn(
            "flex flex-col bg-sidebar-dark text-sidebar-dark-foreground transition-all duration-300",
            showDetailColumn ? "w-16" : "w-full"
          )}>
            <div className="flex h-16 items-center justify-center">
              <Image
                src="/logo.png"
                alt="Logo"
                width={36}
                height={36}
                className="object-contain rounded-lg"
              />
            </div>
            <nav className={cn(
              "flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3 px-2",
              !showDetailColumn && "items-stretch px-4"
            )}>
              {parentItems.map((item) => {
                const isActive = item.id === activeParentId;
                const isCurrentPath = item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));
                
                // For items without children, render as Link
                if (!item.hasChildren && item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        onSelectParent(item.id);
                        onClose();
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl transition-all duration-200",
                        showDetailColumn 
                          ? "h-10 w-10 justify-center" 
                          : "h-11 px-4",
                        (isActive || isCurrentPath)
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "text-sidebar-dark-foreground hover:bg-white/10"
                      )}
                    >
                      <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                      {!showDetailColumn && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </Link>
                  );
                }
                
                // For items with children, render as Button
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size={showDetailColumn ? "icon" : "default"}
                    className={cn(
                      "rounded-xl transition-all duration-200 text-sidebar-dark-foreground",
                      showDetailColumn 
                        ? "h-10 w-10" 
                        : "h-11 w-full justify-start gap-3 px-4",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:text-primary-foreground"
                        : "hover:bg-white/10"
                    )}
                    onClick={() => onSelectParent(item.id)}
                  >
                    <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                    {!showDetailColumn && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Detail Column - Only show if active parent has children */}
          {showDetailColumn && (
            <div className="flex flex-1 flex-col bg-sidebar">
              <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                <h2 className="text-sm font-semibold">{detailTitle}</h2>
              </div>
              <nav className="flex-1 overflow-y-auto p-2">
                {detailItems.map((item) => (
                  <MobileMenuItem key={item.id} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </nav>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});

const MobileMenuItem = memo(function MobileMenuItem({
  item,
  pathname,
  onClose,
  level = 0,
}: {
  item: DetailSidebarItem;
  pathname: string;
  onClose: () => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
          <span className="flex-1 truncate font-medium">{item.name}</span>
        </button>
        {isExpanded && item.children?.map((child) => (
          <MobileMenuItem
            key={child.id}
            item={child}
            pathname={pathname}
            onClose={onClose}
            level={level + 1}
          />
        ))}
      </div>
    );
  }

  return (
    <Link
      href={item.href || "#"}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent ${
        isActive ? "bg-primary/10 text-primary font-medium" : ""
      }`}
      style={{ paddingLeft: `${level * 12 + 12}px` }}
      onClick={onClose}
    >
      {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  );
});

export const DashboardLayout = memo(function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { user } = useAuthStore();
  const { data: permissionsData, error } = useUserPermissions();
  
  // Real-time role validation - auto logout if role deleted or invalid
  useValidateRole();
  
  const commandPalette = useDashboardCommandPalette({
    menus: permissionsData?.data?.menus as MenuWithActions[] | undefined,
  });
  const { isDrawerOpen, closeDrawer } = useNotificationStore();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const userName = user?.name ?? "User";
  const primaryAvatarUrl =
    user?.avatar_url && user.avatar_url.trim() !== ""
      ? user.avatar_url
      : undefined;
  const fallbackAvatarUrl = "/avatar-placeholder.svg";

  // State for dual sidebar - initialize with null/true for SSR consistency
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Hydrate state from localStorage after mount
  useEffect(() => {
    React.startTransition(() => {
      setIsMounted(true);
      const storedParent = localStorage.getItem(ACTIVE_PARENT_STORAGE_KEY);
      const storedSidebar = localStorage.getItem(DETAIL_SIDEBAR_STORAGE_KEY);
      
      if (storedParent) {
        setActiveParentId(storedParent);
      }
      if (storedSidebar !== null) {
        setIsDetailSidebarOpen(storedSidebar !== "false");
      }
    });
  }, []);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    if (globalThis.window !== undefined) {
      localStorage.setItem(DETAIL_SIDEBAR_STORAGE_KEY, String(isDetailSidebarOpen));
    }
  }, [isDetailSidebarOpen]);

  useEffect(() => {
    if (globalThis.window !== undefined && activeParentId) {
      localStorage.setItem(ACTIVE_PARENT_STORAGE_KEY, activeParentId);
    }
  }, [activeParentId]);

  // Build parent items for icon sidebar
  const parentItems: IconSidebarItem[] = useMemo(() => {
    const menus = permissionsData?.data?.menus as MenuWithActions[] | undefined;

    // Always start with Dashboard menu (static)
    const items: IconSidebarItem[] = [
      {
        id: "dashboard",
        name: "Dashboard",
        icon: getMenuIcon("layout-dashboard"),
        href: "/dashboard",
        hasChildren: false,
      },
    ];

    // Add menus from permissions if available
    if (menus && menus.length > 0) {
      menus.forEach((menu) => {
        if (!checkViewPermission(menu)) return;

        const hasChildren = Boolean(menu.children && menu.children.length > 0);

        items.push({
          id: String(menu.id), // Convert to string for consistency
          name: menu.name,
          icon: getMenuIcon(menu.icon),
          href: menu.url || undefined,
          hasChildren,
        });
      });
    }

    return items;
  }, [permissionsData]);

  // Build detail items for selected parent
  const detailItems: DetailSidebarItem[] = useMemo(() => {
    if (!activeParentId) return [];

    const menus = permissionsData?.data?.menus as MenuWithActions[] | undefined;
    if (!menus) return [];

    const parentMenu = menus.find((m) => String(m.id) === activeParentId);
    if (!parentMenu?.children) return [];

    const buildDetailItems = (menuItems: MenuWithActions[]): DetailSidebarItem[] => {
      return menuItems
        .filter((item) => checkViewPermission(item))
        .map((item) => ({
          id: String(item.id), // Convert to string for consistency
          name: item.name,
          href: item.url || undefined,
          icon: getMenuIcon(item.icon),
          children: item.children ? buildDetailItems(item.children) : undefined,
        }));
    };

    return buildDetailItems(parentMenu.children);
  }, [activeParentId, permissionsData]);

  // Get active parent title
  const activeParentTitle = useMemo(() => {
    if (!activeParentId) return "Menu";
    const parent = parentItems.find((p) => p.id === activeParentId);
    return parent?.name || "Menu";
  }, [activeParentId, parentItems]);

  // Auto-select first parent with children on mount
  useEffect(() => {
    if (!activeParentId && parentItems.length > 0) {
      const firstWithChildren = parentItems.find((p) => p.hasChildren);
      if (firstWithChildren) {
        React.startTransition(() => {
          setActiveParentId(firstWithChildren.id);
        });
      }
    }
  }, [activeParentId, parentItems]);

  // Track manual parent selection to prevent auto-detect override
  const manualSelectionRef = React.useRef(false);
  const previousPathnameRef = React.useRef<string | null>(null);

  // Auto-detect active parent based on current path
  // Only run when pathname actually changes (navigation), not when activeParentId changes manually
  useEffect(() => {
    if (!permissionsData?.data?.menus) return;

    const currentPathname = pathname;
    const previousPathname = previousPathnameRef.current;
    
    // Only auto-detect when pathname actually changes (user navigated to different page)
    // Not when user manually selects parent while staying on same page
    const pathnameChanged = previousPathname !== currentPathname;
    
    if (pathnameChanged && !manualSelectionRef.current) {
      const menus = permissionsData.data.menus as MenuWithActions[];
      const detectedParent = findParentMenuByPath(menus, currentPathname);
      
      if (detectedParent && detectedParent !== activeParentId) {
        React.startTransition(() => {
          setActiveParentId(detectedParent);
        });
      }
    }
    
    // Update previous pathname ref
    previousPathnameRef.current = currentPathname;
    
    // Reset manual selection flag after navigation completes
    if (manualSelectionRef.current && pathnameChanged) {
      // Delay reset to allow manual selection to take effect first
      const timer = setTimeout(() => {
        manualSelectionRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, permissionsData]);

  const handleSelectParent = useCallback((id: string) => {
    const item = parentItems.find((p) => p.id === id);
    if (item) {
      // Mark as manual selection to prevent auto-detect override
      manualSelectionRef.current = true;
      
      // Reset flag after a delay to allow auto-detect on next navigation
      setTimeout(() => {
        manualSelectionRef.current = false;
      }, 500);
      
      if (item.hasChildren) {
        setActiveParentId(id);
        setIsDetailSidebarOpen(true);
      } else if (item.href) {
        // Parent without children (like Dashboard) - hide detail sidebar
        setActiveParentId(id);
        setIsDetailSidebarOpen(false);
      }
    }
  }, [parentItems]);

  const handleToggleDetailSidebar = useCallback(() => {
    setIsDetailSidebarOpen((prev) => !prev);
  }, []);

  const isAIChatbotPage = pathname?.includes("/ai-chatbot");

  // Check if current parent has children (should show detail sidebar)
  const shouldShowDetailSidebar = useMemo(() => {
    if (!activeParentId || !isMounted) return false;
    const parent = parentItems.find((p) => p.id === activeParentId);
    return parent?.hasChildren === true;
  }, [activeParentId, parentItems, isMounted]);

  // Calculate main content margin based on sidebar states
  const contentMarginLeft = useMemo(() => {
    if (isMobile || !isMounted) return "0";
    if (isDetailSidebarOpen && shouldShowDetailSidebar) return "calc(4rem + 14rem)"; // 64px + 224px (w-56)
    return "4rem"; // 64px for icon sidebar only
  }, [isMobile, isDetailSidebarOpen, shouldShowDetailSidebar, isMounted]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-sidebar">
        {/* Desktop Sidebars */}
        {!isMobile && (
          <>
            <IconSidebar
              items={parentItems}
              activeParentId={activeParentId}
              onSelectParent={handleSelectParent}
            />
            {shouldShowDetailSidebar && (
              <DetailSidebar
                title={activeParentTitle}
                items={detailItems}
                isOpen={isDetailSidebarOpen}
                onToggle={handleToggleDetailSidebar}
              />
            )}
            {/* Toggle button when detail sidebar is collapsed but should be available */}
            {shouldShowDetailSidebar && !isDetailSidebarOpen && (
              <button
                type="button"
                onClick={handleToggleDetailSidebar}
                className="fixed left-16 top-1/2 z-30 flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-l-none rounded-r-md bg-sidebar/90 hover:bg-accent transition-colors"
                aria-label="Open detail sidebar"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          parentItems={parentItems}
          activeParentId={activeParentId}
          onSelectParent={handleSelectParent}
          detailItems={detailItems}
          detailTitle={activeParentTitle}
        />

        {/* Main Content Area */}
        <main
          className="relative min-h-screen transition-[margin] duration-300 ease-out"
          style={{ marginLeft: contentMarginLeft }}
        >
          <div className="min-h-full bg-background md:rounded-3xl md:shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)]">
            {!isAIChatbotPage && (
              <Header
                userName={userName}
                avatarUrl={primaryAvatarUrl}
                fallbackAvatarUrl={fallbackAvatarUrl}
                onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
              />
            )}

            <div
              className={`flex flex-1 flex-col ${
                isAIChatbotPage ? "gap-0 p-0 h-screen" : "gap-4 p-4 md:p-6"
              }`}
            >
              {!isAIChatbotPage && error && (
                <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Failed to load menu permissions. Showing minimal navigation.
                </div>
              )}
              {!isAIChatbotPage && <Breadcrumb />}
              {children}
            </div>
          </div>
        </main>

        {/* Notification Drawer */}
        <NotificationDrawer open={isDrawerOpen} onOpenChange={closeDrawer} />

        {/* Command Palette */}
        <Dialog open={commandPalette.isOpen} onOpenChange={commandPalette.toggle}>
          <DialogContent
            showCloseButton={false}
            className="p-0 shadow-2xl sm:max-w-xl"
          >
            <DialogTitle className="sr-only">Command palette</DialogTitle>
            <Command>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No menu found.</CommandEmpty>
                {Object.entries(
                  commandPalette.items.reduce<Record<string, typeof commandPalette.items>>(
                    (groups, item) => {
                      const group = item.group || "Menus";
                      if (!groups[group]) {
                        groups[group] = [];
                      }
                      groups[group].push(item);
                      return groups;
                    },
                    {}
                  )
                ).map(([group, items]) => (
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
      </div>
    </TooltipProvider>
  );
});
