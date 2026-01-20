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

export function ProductContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProductList />
      </Suspense>
    </PageMotion>
  );
}

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
