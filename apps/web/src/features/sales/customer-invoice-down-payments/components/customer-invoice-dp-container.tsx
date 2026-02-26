"use client";

import { PageMotion } from "@/components/motion";
import { CustomerInvoiceDPList } from "./customer-invoice-dp-list";

export function CustomerInvoiceDPContainer() {
  return (
    <PageMotion>
      <CustomerInvoiceDPList />
    </PageMotion>
  );
}
