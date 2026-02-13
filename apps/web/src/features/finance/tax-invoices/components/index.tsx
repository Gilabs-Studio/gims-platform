import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const TaxInvoicesList = dynamic(
  () => import("./tax-invoices-list").then((m) => ({ default: m.TaxInvoicesList })),
  { loading: () => null },
);

export function FinanceTaxInvoicesContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <TaxInvoicesList />
      </Suspense>
    </PageMotion>
  );
}
