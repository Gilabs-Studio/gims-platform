import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const SupplierInvoiceDPList = dynamic(
  () =>
    import("./supplier-invoice-dp-list").then((mod) => ({
      default: mod.SupplierInvoiceDPList,
    })),
  { loading: () => null },
);

export function SupplierInvoiceDPContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <SupplierInvoiceDPList />
      </Suspense>
    </PageMotion>
  );
}
