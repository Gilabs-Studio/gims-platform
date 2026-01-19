import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProductBrandList = dynamic(
  () =>
    import("./product-brand-list").then(
      (mod) => ({ default: mod.ProductBrandList }),
    ),
  {
    loading: () => null,
  },
);

export function ProductBrandContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductBrandList />
      </Suspense>
    </PageMotion>
  );
}
