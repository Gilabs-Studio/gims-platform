"use client";

import React, { memo, useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DETAIL_SIDEBAR_STORAGE_KEY = "detail_sidebar_state";

export const DashboardLayoutSkeleton = memo(function DashboardLayoutSkeleton() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [hasDetailSidebar, setHasDetailSidebar] = useState(false);

  useEffect(() => {
    React.startTransition(() => {
      setIsMounted(true);
      const isHomeDashboard = !pathname || /(^|\/)dashboard$/.test(pathname);
      const storedState = localStorage.getItem(DETAIL_SIDEBAR_STORAGE_KEY);
      const isOpen = storedState !== "false";
      setHasDetailSidebar(!isHomeDashboard && isOpen);
    });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-sidebar" data-slot="dashboard-layout-skeleton">
      {/* Icon Sidebar (Leftmost desktop navigation) */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col bg-sidebar-dark text-sidebar-dark-foreground md:flex"
        data-slot="icon-sidebar-skeleton"
        aria-hidden="true"
      >
        {/* App Logo Placeholder */}
        <div className="flex h-16 items-center justify-center">
          <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
        </div>

        {/* Primary Navigation Icons */}
        <div className="flex flex-1 flex-col items-center gap-1 overflow-hidden py-3 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-10 rounded-xl bg-white/10"
            />
          ))}
        </div>

        {/* Bottom Utility Controls */}
        <div className="flex flex-col items-center gap-2 pb-4 pt-2">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
          <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
        </div>
      </aside>

      {/* Detail Sidebar (Secondary tree navigation, shown for nested modules) */}
      {hasDetailSidebar && (
        <aside
          className="fixed left-16 top-0 z-30 hidden h-screen w-56 border-r border-sidebar-border bg-sidebar md:block"
          data-slot="detail-sidebar-skeleton"
          aria-hidden="true"
        >
          <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4 bg-sidebar/95">
              <Skeleton className="h-5 w-28 bg-white/10" />
              <Skeleton className="h-5 w-5 rounded-md bg-white/10" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md bg-white/10" />
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "relative min-h-screen md:ml-16",
          isMounted && "transition-[margin] duration-300 ease-out",
        )}
        style={
          isMounted && hasDetailSidebar
            ? { marginLeft: "calc(4rem + 14rem)" }
            : isMounted
              ? { marginLeft: "4rem" }
              : undefined
        }
      >
        <div className="relative min-h-full bg-background md:rounded-none md:shadow-none">
          {/* Dashboard Header */}
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 md:rounded-tl-3xl">
            {/* Mobile Hamburger Skeleton */}
            <Skeleton className="h-9 w-9 rounded-md md:hidden" />

            {/* Search Input Skeleton */}
            <div className="flex-1">
              <div className="relative hidden max-w-sm flex-1 lg:block">
                <Skeleton className="h-9 w-full max-w-sm rounded-md" />
              </div>
              <div className="block lg:hidden">
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>

            {/* Header Right Action Items */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Skeleton className="hidden h-8 w-24 rounded-md sm:block" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="mx-1 h-4 w-px bg-border" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>

          {/* Dashboard Page Canvas */}
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <span className="text-xs text-muted-foreground/40">/</span>
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Page Header & Grid Skeleton */}
            <div className="space-y-6 pt-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>

              {/* Stat / Metric Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>

              {/* Main Content (Table / Chart) Skeleton */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Skeleton className="h-72 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </div>
                <div className="lg:col-span-1">
                  <Skeleton className="h-[504px] rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});
