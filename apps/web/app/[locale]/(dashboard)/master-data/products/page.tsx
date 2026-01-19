import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const ProductList = dynamic(
  () =>
    import("@/features/master-data/product/components/product").then(
      (mod) => ({ default: mod.ProductList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function ProductsPage() {
  return (
    <PermissionGuard requiredPermission="product.read">
      <PageMotion>
        <Suspense fallback={null}>
          <ProductList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}
