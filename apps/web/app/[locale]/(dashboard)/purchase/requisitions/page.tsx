import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const PurchaseRequisitionList = dynamic(
  () =>
    import("@/features/purchase/purchase-requisitions/components/purchase-requisition-list").then(
      (mod) => ({ default: mod.PurchaseRequisitionList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function PurchaseRequisitionsPage() {
  return (
    <PermissionGuard requiredPermission="purchase_requisition.read">
      <PageMotion>
        <Suspense fallback={null}>
          <PurchaseRequisitionList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}

