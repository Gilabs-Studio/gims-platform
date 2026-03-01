import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const SalesPaymentsList = dynamic(
  () =>
    import("./sales-payments-list").then((mod) => ({
      default: mod.SalesPaymentsList,
    })),
  { loading: () => null },
);

export function SalesPaymentsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <SalesPaymentsList />
      </Suspense>
    </PageMotion>
  );
}
