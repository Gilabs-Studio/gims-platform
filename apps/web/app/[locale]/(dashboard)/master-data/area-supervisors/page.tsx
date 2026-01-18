import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const AreaSupervisorList = dynamic(
  () =>
    import("@/features/master-data/organization/components/area-supervisor").then(
      (mod) => ({ default: mod.AreaSupervisorList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function AreaSupervisorsPage() {
  return (
    <PermissionGuard requiredPermission="area_supervisor.read">
      <PageMotion>
        <Suspense fallback={null}>
          <AreaSupervisorList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
