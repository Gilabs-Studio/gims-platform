import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProductCategoryList = dynamic(
  () =>
    import("./product-category-list").then(
      (mod) => ({ default: mod.ProductCategoryList }),
    ),
  {
    loading: () => null,
  },
);

export function ProductCategoryContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductCategoryList />
      </Suspense>
    </PageMotion>
  );
}
