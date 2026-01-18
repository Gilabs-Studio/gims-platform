import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const CountryList = dynamic(
  () => import("@/features/master-data/geographic/components/country-list").then((mod) => ({ default: mod.CountryList })),
  { loading: () => null }
);

function CountryListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
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

export default function CountriesPage() {
  return (
    <PermissionGuard requiredPermission="country.read">
      <Suspense fallback={<CountryListSkeleton />}>
        <CountryList />
      </Suspense>
    </PermissionGuard>
  );
}
