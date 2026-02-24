import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const FinanceUpCountryCostContainer = dynamic(
  () =>
    import("@/features/finance/up-country-cost/components").then((mod) => ({
      default: mod.UpCountryCostPage,
    })),
  { loading: () => null },
);

type GenerateMetadataProps = {
  params: { locale: string } | Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: GenerateMetadataProps): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: "financeUpCountryCost" });
  return {
    title: `${t("title")} | GIMS`,
    description: t("description"),
  };
}

function UpCountryCostSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-80" />
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FinanceUpCountryCostPage() {
  return (
    <PermissionGuard requiredPermission="up_country_cost.read">
      <Suspense fallback={<UpCountryCostSkeleton />}>
        <FinanceUpCountryCostContainer />
      </Suspense>
    </PermissionGuard>
  );
}
