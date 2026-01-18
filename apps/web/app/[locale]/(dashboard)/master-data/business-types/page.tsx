import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const BusinessTypeList = dynamic(
  () =>
    import("@/features/master-data/organization/components/business-type").then(
      (mod) => ({ default: mod.BusinessTypeList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function BusinessTypesPage() {
  return (
    <PermissionGuard requiredPermission="business_type.read">
      <PageMotion>
        <Suspense fallback={null}>
          <BusinessTypeList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
