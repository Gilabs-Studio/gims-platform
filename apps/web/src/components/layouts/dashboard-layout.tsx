"use client";

import React, { memo, useMemo, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Search, Settings, Menu as MenuIcon, ChevronRight } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useNavigation } from "@/hooks/use-navigation";
import { useValidateRole } from "@/features/auth/hooks/use-validate-role";
import { useTodayAttendance } from "@/features/hrd/attendance-records/hooks/use-attendance-records";
import type { MenuWithActions } from "@/features/master-data/user-management/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton as ThemeToggle } from "@/components/ui/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getMenuIcon } from "@/lib/menu-icons";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { UserMenuAttendance } from "@/features/hrd/attendance-records/components/user-menu-attendance";
import { CommandPalette } from "@/features/command-palette";
import { AIChatWidget } from "@/features/ai-chat/components/ai-chat-widget";
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
      (action) => {
        // Check generic action type first (new API)
        if (action.action === "VIEW") return action.access;
        // Fallback to code check (old API or specific codes)
        return (action.code === "VIEW" || action.code.startsWith("VIEW_")) && action.access;
      }
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
  showAttendanceIndicator = false,
}: {
  userName: string;
  avatarUrl?: string;
  fallbackAvatarUrl: string;
  onMobileMenuClick: () => void;
  showAttendanceIndicator?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
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
            placeholder={t("searchPlaceholder")}
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full cursor-pointer rounded-md border bg-background/60 px-3 py-1 pr-4 pl-10 text-sm shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
            }}
            readOnly
          />
          <div className="bg-muted text-muted-foreground absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            <span className="text-[11px]">/</span>
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
                <div className="relative">
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
                  <AnimatePresence>
                    {showAttendanceIndicator && (
                      <motion.div
                        className="absolute -inset-1 rounded-full border-2 border-amber-500/60"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: [0.4, 0.8, 0.4],
                          scale: [1, 1.15, 1],
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <div className="text-foreground text-sm font-medium">
                  {userName}
                </div>
              </div>
              <Separator className="my-1" />
              <UserMenuAttendance />
              <Separator className="my-1" />
              <div className="flex flex-col gap-1">
                <Link
                  href="/profile"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
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
            <div className="relative">
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
              <AnimatePresence>
                {showAttendanceIndicator && (
                  <motion.div
                    className="absolute -inset-1 rounded-full border-2 border-amber-500/60"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: [0.4, 0.8, 0.4],
                      scale: [1, 1.15, 1],
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
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
  const { menus } = useNavigation();
  
  // Real-time role validation - auto logout if role deleted or invalid
  useValidateRole();
  
  const { isDrawerOpen, closeDrawer } = useNotificationStore();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const userName = user?.name ?? "User";
  const primaryAvatarUrl =
    user?.avatar_url && user.avatar_url.trim() !== ""
      ? user.avatar_url
      : undefined;
  const { data: todayData } = useTodayAttendance();
  const today = todayData?.data;

  const showAttendanceIndicator = useMemo(() => {
    if (!today || !today.is_working_day || today.has_checked_in) return false;

    const schedule = today.work_schedule;
    if (!schedule?.start_time) return false;

    try {
      // Comparison logic: Only pulsing if it's already past start_time
      const serverTime = new Date(today.current_server_time);
      const [startH, startM] = schedule.start_time.split(":").map(Number);

      const startTimeDate = new Date(serverTime);
      startTimeDate.setHours(startH, startM, 0, 0);

      // If current time is after or equal to start time, and not checked in yet
      return serverTime >= startTimeDate;
    } catch (e) {
      // Fallback: if time parsing fails, show if working day and not checked in
      return today.is_working_day && !today.has_checked_in;
    }
  }, [today]);

  const fallbackAvatarUrl = "/avatar-placeholder.svg";

  // State for dual sidebar - initialize with null/true for SSR consistency
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Hydrate state from localStorage after mount
  useEffect(() => {
    React.startTransition(() => {
      setIsMounted(true);
      // State restoration is handled in the auto-detect effect
      // to ensure consistency with current pathname
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
    // menus from outer scope

    // Start with empty items, all menus come from navigation config
    const items: IconSidebarItem[] = [];

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
  }, [menus]);

  // Build detail items for selected parent
  const detailItems: DetailSidebarItem[] = useMemo(() => {
    if (!activeParentId) return [];

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
  }, [activeParentId, menus]);

  // Get active parent title
  const activeParentTitle = useMemo(() => {
    if (!activeParentId) return "Menu";
    const parent = parentItems.find((p) => p.id === activeParentId);
    return parent?.name || "Menu";
  }, [activeParentId, parentItems]);

  // Track manual parent selection to prevent auto-detect override
  const manualSelectionRef = React.useRef(false);
  const previousPathnameRef = React.useRef<string | null>(null);
  const isInitialMountRef = React.useRef(true);

  // Auto-detect active parent based on current path
  // This runs both on mount and when pathname changes
  useEffect(() => {
    if (!menus || !isMounted) return;

    const currentPathname = pathname;
    const previousPathname = previousPathnameRef.current;
    const isInitialMount = isInitialMountRef.current;
    
    // On initial mount, restore state and verify it matches current pathname
    if (isInitialMount) {
      isInitialMountRef.current = false;
      const storedParent = localStorage.getItem(ACTIVE_PARENT_STORAGE_KEY);
      const storedSidebarState = localStorage.getItem(DETAIL_SIDEBAR_STORAGE_KEY);
      
      // Always detect parent based on current pathname
      const detectedParent = findParentMenuByPath(menus, currentPathname);
      
      if (detectedParent) {
        const parentMenu = menus.find((m) => String(m.id) === detectedParent);
        const hasChildren = Boolean(parentMenu?.children && parentMenu.children.length > 0);
        
        React.startTransition(() => {
          setActiveParentId(detectedParent);
          
          // Restore detail sidebar state if parent has children
          if (hasChildren) {
            // Use stored state if available, otherwise default to true for parent with children
            if (storedSidebarState !== null) {
              setIsDetailSidebarOpen(storedSidebarState !== "false");
            } else {
              setIsDetailSidebarOpen(true);
            }
          } else {
            // Parent without children - always close detail sidebar
            setIsDetailSidebarOpen(false);
          }
        });
      } else {
        // No parent detected - close detail sidebar
        React.startTransition(() => {
          setActiveParentId(null);
          setIsDetailSidebarOpen(false);
        });
      }
      
      previousPathnameRef.current = currentPathname;
      return;
    }
    
    // Only auto-detect when pathname actually changes (user navigated to different page)
    // Not when user manually selects parent while staying on same page
    const pathnameChanged = previousPathname !== currentPathname;
    
    if (pathnameChanged && !manualSelectionRef.current) {
      const detectedParent = findParentMenuByPath(menus, currentPathname);
      
      // Update active parent based on detection result
      if (detectedParent !== activeParentId) {
        const parentMenu = menus.find((m) => String(m.id) === detectedParent);
        const hasChildren = Boolean(parentMenu?.children && parentMenu.children.length > 0);
        
        React.startTransition(() => {
          setActiveParentId(detectedParent);
          
          // Keep current detail sidebar state if parent has children
          // Only close if parent has no children
          if (!hasChildren) {
            setIsDetailSidebarOpen(false);
          } else if (!isDetailSidebarOpen) {
            // If parent has children but sidebar is closed, keep it closed
            // This respects user's manual toggle
          } else {
            // Parent has children and sidebar is open, keep it open
            setIsDetailSidebarOpen(true);
          }
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
  }, [pathname, menus, isMounted]);

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
  const isFullScreenMapPage = pathname?.includes("/master-data/company") || pathname?.includes("/master-data/suppliers") || pathname?.includes("/master-data/warehouses") || pathname?.includes("/master-data/customers") || pathname?.includes("/master-data/areas") || pathname?.includes("/master-data/geographic");

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
            {!isAIChatbotPage && !isFullScreenMapPage && (
              <Header
                userName={userName}
                avatarUrl={primaryAvatarUrl}
                fallbackAvatarUrl={fallbackAvatarUrl}
                onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
                showAttendanceIndicator={showAttendanceIndicator}
              />
            )}

            <div
              className={`flex flex-1 flex-col ${
                isAIChatbotPage || isFullScreenMapPage ? "gap-0 p-0 h-[calc(100vh-1px)]" : "gap-4 p-4 md:p-6"
              }`}
            >

              {!isAIChatbotPage && !isFullScreenMapPage && <Breadcrumb />}
              {children}
            </div>
          </div>
        </main>

        {/* Notification Drawer */}
        <NotificationDrawer open={isDrawerOpen} onOpenChange={closeDrawer} />

        {/* Command Palette */}
        <CommandPalette />

        {/* AI Chat Widget */}
        <AIChatWidget />
      </div>
    </TooltipProvider>
  );
});
