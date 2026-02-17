import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const NonTradePayablesList = dynamic(
  () => import("./non-trade-payables-list").then((m) => ({ default: m.NonTradePayablesList })),
  { loading: () => null },
);

export function FinanceNonTradePayablesContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <NonTradePayablesList />
      </Suspense>
    </PageMotion>
  );
}
