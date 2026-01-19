import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProductList = dynamic(
  () =>
    import("./product-list").then(
      (mod) => ({ default: mod.ProductList }),
    ),
  {
    loading: () => null,
  },
);

export function ProductContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductList />
      </Suspense>
    </PageMotion>
  );
}
