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

export default function SupplierInvoicesPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <SupplierInvoiceList />
      </Suspense>
    </PageMotion>
  );
}




