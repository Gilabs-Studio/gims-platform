import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const DivisionList = dynamic(
  () =>
    import("@/features/master-data/organization/components/division-list").then(
      (mod) => ({ default: mod.DivisionList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function DivisionsPage() {
  return (
    <PermissionGuard requiredPermission="division.read">
      <PageMotion>
        <Suspense fallback={null}>
          <DivisionList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
