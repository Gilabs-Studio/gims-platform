import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const SupplierInvoiceList = dynamic(
  () =>
    import("@/features/purchase/supplier-invoices/components/supplier-invoice-list").then(
      (mod) => ({ default: mod.SupplierInvoiceList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function SupplierInvoicesPage() {
  return (
    <PermissionGuard requiredPermission="supplier_invoice.read">
      <PageMotion>
        <Suspense fallback={null}>
          <SupplierInvoiceList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}




