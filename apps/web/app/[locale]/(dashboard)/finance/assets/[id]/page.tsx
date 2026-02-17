import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const FinanceAssetDetailContainer = dynamic(
  () =>
    import("@/features/finance/assets/components").then((mod) => ({
      default: mod.FinanceAssetDetailContainer,
    })),
  { loading: () => null },
);

type GenerateMetadataProps = {
  params: { locale: string; id: string } | Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: "financeAssets" });

  return {
    title: `${t("detail.title")} | GIMS`,
    description: t("detail.description"),
  };
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <Skeleton className="h-5 w-52" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          <Skeleton className="h-5 w-52" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function FinanceAssetDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await Promise.resolve(params);

  return (
    <PermissionGuard requiredPermission="asset.read">
      <Suspense fallback={<PageSkeleton />}>
        <FinanceAssetDetailContainer id={id} />
      </Suspense>
    </PermissionGuard>
  );
}
