import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProductSegmentList = dynamic(
  () =>
    import("./product-segment-list").then(
      (mod) => ({ default: mod.ProductSegmentList }),
    ),
  {
    loading: () => null,
  },
);

export function ProductSegmentContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductSegmentList />
      </Suspense>
    </PageMotion>
  );
}
