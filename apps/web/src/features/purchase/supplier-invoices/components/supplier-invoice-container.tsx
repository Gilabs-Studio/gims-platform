import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const SupplierInvoicesList = dynamic(
  () =>
    import("./supplier-invoices-list").then((mod) => ({
      default: mod.SupplierInvoicesList,
    })),
  { loading: () => null },
);

export function SupplierInvoiceContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <SupplierInvoicesList />
      </Suspense>
    </PageMotion>
  );
}
