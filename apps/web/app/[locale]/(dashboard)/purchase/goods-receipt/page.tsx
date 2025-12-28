import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const GoodsReceiptList = dynamic(
  () =>
    import("@/features/purchase/goods-receipt/components/goods-receipt-list").then(
      (mod) => ({ default: mod.GoodsReceiptList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function GoodsReceiptPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <GoodsReceiptList />
      </Suspense>
    </PageMotion>
  );
}




