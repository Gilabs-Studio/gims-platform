import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const AreaList = dynamic(
  () =>
    import("@/features/master-data/organization/components/area").then(
      (mod) => ({ default: mod.AreaList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function AreasPage() {
  return (
    <PermissionGuard requiredPermission="area.read">
      <PageMotion>
        <Suspense fallback={null}>
          <AreaList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
