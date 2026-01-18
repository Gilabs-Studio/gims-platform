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

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function GoodsReceiptPage() {
  return (
    <PermissionGuard requiredPermission="goods_receipt.read">
      <PageMotion>
        <Suspense fallback={null}>
          <GoodsReceiptList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}




