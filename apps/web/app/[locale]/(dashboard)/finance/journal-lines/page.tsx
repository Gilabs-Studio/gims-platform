import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

const JournalLinesContainer = dynamic(
  () =>
    import("@/features/finance/journal-lines/components").then((mod) => ({
      default: mod.JournalLinesContainer,
    })),
  { loading: () => null }
);

type GenerateMetadataProps = {
  params: { locale: string } | Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: GenerateMetadataProps): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: "journalLines" });
  return {
    title: `${t("title")} | GIMS`,
    description: t("description"),
  };
}

function JournalLinesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function JournalLinesPage() {
  return (
    <PermissionGuard requiredPermission="journal_line.read">
      <Suspense fallback={<JournalLinesSkeleton />}>
        <JournalLinesContainer />
      </Suspense>
    </PermissionGuard>
  );
}
