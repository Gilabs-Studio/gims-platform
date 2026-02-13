import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const PaymentsList = dynamic(() => import("./payments-list").then((m) => ({ default: m.PaymentsList })), {
  loading: () => null,
});

export function FinancePaymentsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PaymentsList />
      </Suspense>
    </PageMotion>
  );
}
