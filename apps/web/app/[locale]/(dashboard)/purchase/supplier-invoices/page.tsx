import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { SupplierInvoiceList } from "@/features/purchase/supplier-invoices/components/supplier-invoice-list";

export default function SupplierInvoicesPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <SupplierInvoiceList />
      </Suspense>
    </PageMotion>
  );
}




