import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const CompanyList = dynamic(
  () =>
    import("@/features/master-data/organization/components/company-list").then(
      (mod) => ({ default: mod.CompanyList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function CompaniesPage() {
  return (
    <PermissionGuard requiredPermission="company.read">
      <PageMotion>
        <Suspense fallback={null}>
          <CompanyList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
