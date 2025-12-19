import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { PurchaseRequisitionList } from "@/features/purchase/purchase-requisitions/components/purchase-requisition-list";

export default function PurchaseRequisitionsPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <PurchaseRequisitionList />
      </Suspense>
    </PageMotion>
  );
}

