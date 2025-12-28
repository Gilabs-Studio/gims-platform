import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const SupplierInvoiceDownPaymentList = dynamic(
  () =>
    import("@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-down-payment-list").then(
      (mod) => ({ default: mod.SupplierInvoiceDownPaymentList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function SupplierInvoiceDownPaymentsPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <SupplierInvoiceDownPaymentList />
      </Suspense>
    </PageMotion>
  );
}




