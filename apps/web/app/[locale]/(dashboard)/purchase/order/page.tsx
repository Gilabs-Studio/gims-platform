import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { PurchaseOrderList } from "@/features/purchase/purchase-order/components/purchase-order-list";

export default function PurchaseOrderPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <PurchaseOrderList />
      </Suspense>
    </PageMotion>
  );
}

