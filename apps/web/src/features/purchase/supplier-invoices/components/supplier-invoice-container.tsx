"use client";

import { PageMotion } from "@/components/motion";
import { SupplierInvoicesList } from "./supplier-invoices-list";

export function SupplierInvoiceContainer() {
  return (
    <PageMotion>
      <SupplierInvoicesList />
    </PageMotion>
  );
}
