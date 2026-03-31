"use client";

import React, { useState, memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Activity, Menu as MenuIcon, Search, Settings } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ThemeToggleButton as ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { HeaderAttendanceButton } from "@/features/hrd/attendance-records/components/header-attendance-button";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActivityFeedDialog } from "@/features/crm/activity/components/activity-feed-dialog";
import type { AttendanceDrawerTab } from "@/features/hrd/attendance-records/components/attendance-right-drawer";

interface DashboardHeaderProps {
  userName: string;
  avatarUrl?: string;
  fallbackAvatarUrl: string;
  onMobileMenuClick: () => void;
  showAttendanceIndicator?: boolean;
  onOpenAttendanceDrawer: (tab: AttendanceDrawerTab, openCreateLeave?: boolean) => void;
}

export const DashboardHeader = memo(function DashboardHeader({
  userName,
  avatarUrl,
  fallbackAvatarUrl,
  onMobileMenuClick,
  showAttendanceIndicator = false,
  onOpenAttendanceDrawer,
}: DashboardHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const logout = useLogout();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const normalizedAvatarUrl = avatarUrl && avatarUrl.trim() !== "" ? avatarUrl : undefined;
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);
  const currentSrc = avatarLoadFailed ? fallbackAvatarUrl : normalizedAvatarUrl ?? fallbackAvatarUrl;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 md:rounded-tl-3xl">
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
        <div className="relative hidden max-w-sm flex-1 lg:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            className="border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full cursor-pointer rounded-md border bg-background/60 px-3 py-1 pl-10 pr-4 text-sm shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={(event) => {
              event.preventDefault();
              event.currentTarget.blur();
            }}
            readOnly
          />
          <div className="bg-muted text-muted-foreground absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
            <span className="text-[11px]">/</span>
          </div>
        </div>

        <div className="block lg:hidden">
          <Button variant="ghost" size="icon" className="size-9" type="button">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Open search</span>
          </Button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 overflow-visible">
        <HeaderAttendanceButton onOpenDrawer={onOpenAttendanceDrawer} />
        <NotificationBadge />
        <ThemeToggle />

        <Link href={pathname || "/dashboard"} locale={locale === "en" ? "id" : "en"} scroll={false}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 text-xs font-semibold shadow-sm hover:bg-accent/60"
            type="button"
          >
            {locale === "en" ? "ID" : "EN"}
          </Button>
        </Link>

        <div className="mx-2 h-4 w-px shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-1/2 data-[orientation=vertical]:w-px" />

        <Popover key={normalizedAvatarUrl ?? fallbackAvatarUrl}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 items-center justify-center rounded-full p-0 transition-colors hover:bg-muted"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    key={currentSrc}
                    src={currentSrc}
                    alt={userName}
                    onError={() => {
                      setAvatarLoadFailed(true);
                    }}
                  />
                </Avatar>
                <AnimatePresence>
                  {showAttendanceIndicator && (
                    <motion.div
                      className="absolute -inset-1 rounded-full border-2 border-amber-500/60"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <div className="text-sm font-medium text-foreground">{userName}</div>
            </div>
            <Separator className="my-1" />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => setActivityFeedOpen(true)}
              >
                <Activity className="h-4 w-4" />
                {t("myActivities")}
              </button>
              <Link
                href="/profile"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                Logout
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <ActivityFeedDialog open={activityFeedOpen} onOpenChange={setActivityFeedOpen} />
    </header>
  );
});