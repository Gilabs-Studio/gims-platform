"use client";

import { PageMotion } from "@/components/motion";
import { SupplierInvoiceDPList } from "./supplier-invoice-dp-list";

export function SupplierInvoiceDPContainer() {
  return (
    <PageMotion>
      <SupplierInvoiceDPList />
    </PageMotion>
  );
}
