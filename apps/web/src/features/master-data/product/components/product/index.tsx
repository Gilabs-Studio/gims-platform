import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load catalog component (new layout with category tree)
export const ProductCatalog = dynamic(
  () =>
    import("./product-catalog").then(
      (mod) => ({ default: mod.ProductCatalog }),
    ),
  {
    loading: () => null,
  },
);

// New catalog container with category tree sidebar
export function ProductCatalogContainer() {
  return (
    <PageMotion className="h-[calc(100vh-8rem)]">
      <Suspense fallback={null}>
        <ProductCatalog />
      </Suspense>
    </PageMotion>
  );
}
