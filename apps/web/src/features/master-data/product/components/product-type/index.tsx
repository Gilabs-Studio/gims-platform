import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProductTypeList = dynamic(
  () =>
    import("./product-type-list").then(
      (mod) => ({ default: mod.ProductTypeList }),
    ),
  {
    loading: () => null,
  },
);

export function ProductTypeContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductTypeList />
      </Suspense>
    </PageMotion>
  );
}
