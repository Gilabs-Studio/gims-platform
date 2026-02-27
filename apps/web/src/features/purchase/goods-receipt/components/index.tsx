import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const GoodsReceiptsList = dynamic(
  () =>
    import("./goods-receipts-list").then((mod) => ({
      default: mod.GoodsReceiptsList,
    })),
  { loading: () => null },
);

export function GoodsReceiptsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <GoodsReceiptsList />
      </Suspense>
    </PageMotion>
  );
}
