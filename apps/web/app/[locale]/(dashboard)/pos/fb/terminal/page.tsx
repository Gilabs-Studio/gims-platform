import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const POSTerminalPageClient = dynamic(
  () =>
    import("@/features/pos/terminal/components/pos-terminal-page-client").then((mod) => ({
      default: mod.POSTerminalPageClient,
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
  const t = await getTranslations({ locale, namespace: "posTerminal" });
  return {
    title: `${t("title")} | GIMS`,
    description: t("subtitle"),
  };
}

function PageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)] gap-0">
      <div className="flex-[2] p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-[1] border-l p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 w-full mt-auto" />
      </div>
    </div>
  );
}

export default function POSTerminalPage() {
  return (
    <PermissionGuard requiredPermission="pos.order.create">
      <Suspense fallback={<PageSkeleton />}>
        <POSTerminalPageClient />
      </Suspense>
    </PermissionGuard>
  );
}
