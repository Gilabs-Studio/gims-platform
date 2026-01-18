import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { DashboardPageClient } from "./dashboard-page-client";

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function DashboardPage() {
  return (
    <PermissionGuard requiredPermission="dashboard.view">
      <PageMotion>
        <Suspense fallback={null}>
          <DashboardPageClient />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}

