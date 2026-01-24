import { Suspense } from "react";
import { DashboardPageClient } from "./dashboard-page-client";

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function DashboardPage() {
  return (
    <PermissionGuard requiredPermission="dashboard.view">
      <Suspense fallback={null}>
        <DashboardPageClient />
      </Suspense>
    </PermissionGuard>
  );
}

