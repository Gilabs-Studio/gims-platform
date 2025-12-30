import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

// Lazy load the PermissionList component for code splitting
const PermissionList = lazy(() =>
  import("@/features/master-data/user-management/user/components/permission-list").then((mod) => ({
    default: mod.PermissionList,
  }))
);

export const metadata: Metadata = {
  title: "Permission Management | GIMS",
  description: "View and manage system permissions",
};

function PermissionListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function PermissionManagementPage() {
  return (
    <Suspense fallback={<PermissionListSkeleton />}>
      <PermissionList />
    </Suspense>
  );
}
