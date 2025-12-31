import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

// Lazy load the UserList component for code splitting
const UserList = lazy(() =>
  import("@/features/master-data/user-management/user/components/user-list").then((mod) => ({
    default: mod.UserList,
  }))
);

export const metadata: Metadata = {
  title: "User Management | GIMS",
  description: "Manage users, roles, and permissions in one place",
};

function UserListSkeleton() {
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

export default function UserManagementPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UserList />
    </Suspense>
  );
}
