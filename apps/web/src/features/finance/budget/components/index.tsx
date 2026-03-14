import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const BudgetsList = dynamic(() => import("./budgets-list").then((m) => ({ default: m.BudgetsList })), {
  loading: () => null,
});

export const BudgetProgressCard = dynamic(
  () => import("./budget-progress-card").then((m) => ({ default: m.BudgetProgressCard })),
  { loading: () => null },
);

export const BudgetOverview = dynamic(
  () => import("./budget-overview").then((m) => ({ default: m.BudgetOverview })),
  { loading: () => null },
);

export const BudgetDetailModal = dynamic(
  () => import("./budget-detail-modal").then((m) => ({ default: m.BudgetDetailModal })),
  { loading: () => null },
);

export function FinanceBudgetContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <BudgetsList />
      </Suspense>
    </PageMotion>
  );
}
