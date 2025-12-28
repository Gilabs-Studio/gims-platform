import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { GoodsReceiptList } from "@/features/purchase/goods-receipt/components/goods-receipt-list";

export default function GoodsReceiptPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <GoodsReceiptList />
      </Suspense>
    </PageMotion>
  );
}




