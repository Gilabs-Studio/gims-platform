import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";
import type { Metadata } from "next";

// Lazy load the SupplierList component for code splitting
const SupplierList = lazy(() =>
  import("@/features/master-data/partner/suppliers/components/supplier-list").then((mod) => ({
    default: mod.SupplierList,
  }))
);

export const metadata: Metadata = {
  title: "Suppliers | GIMS",
  description: "Manage and view all suppliers",
};

function SupplierListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function SupplierPage() {
  return (
    <PermissionGuard requiredPermission="supplier.read">
      <PageMotion>
        <Suspense fallback={<SupplierListSkeleton />}>
          <SupplierList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
