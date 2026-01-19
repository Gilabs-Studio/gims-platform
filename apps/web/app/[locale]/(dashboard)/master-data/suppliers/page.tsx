import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const SupplierList = dynamic(
  () =>
    import("@/features/master-data/supplier/components/supplier/supplier-list").then(
      (mod) => ({ default: mod.SupplierList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function SuppliersPage() {
  return (
    <PermissionGuard requiredPermission="supplier.read">
      <PageMotion>
        <Suspense fallback={null}>
          <SupplierList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
