import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ProvinceList = dynamic(
  () => import("@/features/master-data/geographic/components/province-list").then((mod) => ({ default: mod.ProvinceList })),
  { loading: () => null }
);

function ProvinceListSkeleton() {
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

export default function ProvincesPage() {
  return (
    <Suspense fallback={<ProvinceListSkeleton />}>
      <ProvinceList />
    </Suspense>
  );
}
