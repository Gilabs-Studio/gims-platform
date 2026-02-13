import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const BudgetsList = dynamic(() => import("./budgets-list").then((m) => ({ default: m.BudgetsList })), {
  loading: () => null,
});

export function FinanceBudgetContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <BudgetsList />
      </Suspense>
    </PageMotion>
  );
}
