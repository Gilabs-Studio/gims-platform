import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { SupplierInvoiceDownPaymentList } from "@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-down-payment-list";

export default function SupplierInvoiceDownPaymentsPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <SupplierInvoiceDownPaymentList />
      </Suspense>
    </PageMotion>
  );
}




