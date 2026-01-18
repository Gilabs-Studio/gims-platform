import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const VillageList = dynamic(
  () => import("@/features/master-data/geographic/components/village-list").then((mod) => ({ default: mod.VillageList })),
  { loading: () => null }
);

function VillageListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
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

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function VillagesPage() {
  return (
    <PermissionGuard requiredPermission="village.read">
      <Suspense fallback={<VillageListSkeleton />}>
        <VillageList />
      </Suspense>
    </PermissionGuard>
  );
}
