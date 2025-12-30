"use client";

import { lazy, Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { useTranslations } from "next-intl";

const MenuList = lazy(() =>
  import(
    "@/features/master-data/user-management/menu/components/menu-list"
  ).then((mod) => ({ default: mod.MenuList }))
);

function MenuListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function MenuManagementPage() {
  const t = useTranslations("menuManagement");

  return (
    <PageMotion className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Suspense fallback={<MenuListSkeleton />}>
        <MenuList />
      </Suspense>
    </PageMotion>
  );
}
