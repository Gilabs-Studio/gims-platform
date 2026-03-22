import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { AssetMaintenancePage } from "@/features/finance/asset-maintenance/components";

type GenerateMetadataProps = {
  params: { locale: string } | Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: "assetMaintenance" });
  return {
    title: `${t("title")} | GIMS`,
    description: t("description"),
  };
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export default function AssetMaintenanceRoute() {
  return (
    <PermissionGuard requiredPermission="asset_maintenance.read">
      <Suspense fallback={<PageSkeleton />}>
        <AssetMaintenancePage />
      </Suspense>
    </PermissionGuard>
  );
}
