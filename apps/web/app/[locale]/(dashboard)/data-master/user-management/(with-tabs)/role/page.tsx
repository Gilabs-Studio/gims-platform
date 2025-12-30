import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

// Lazy load the RoleList component for code splitting
const RoleList = lazy(() =>
  import("@/features/master-data/user-management/user/components/role-list").then((mod) => ({
    default: mod.RoleList,
  }))
);

export const metadata: Metadata = {
  title: "Role Management | GIMS",
  description: "Manage user roles and their permissions",
};

function RoleListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-32 ml-auto" />
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

export default function RoleManagementPage() {
  return (
    <Suspense fallback={<RoleListSkeleton />}>
      <RoleList />
    </Suspense>
  );
}
