import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const BusinessUnitList = dynamic(
  () =>
    import("@/features/master-data/organization/components/business-unit").then(
      (mod) => ({ default: mod.BusinessUnitList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function BusinessUnitsPage() {
  return (
    <PermissionGuard requiredPermission="business_unit.read">
      <PageMotion>
        <Suspense fallback={null}>
          <BusinessUnitList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
