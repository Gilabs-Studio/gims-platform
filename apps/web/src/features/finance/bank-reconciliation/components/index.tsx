import { Suspense } from "react";
import dynamic from "next/dynamic";

import { PageMotion } from "@/components/motion";

export const BankReconciliationWizard = dynamic(
  () => import("./reconciliation-wizard").then((mod) => ({ default: mod.BankReconciliationWizard })),
  { loading: () => null },
);

export function FinanceBankReconciliationContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <BankReconciliationWizard />
      </Suspense>
    </PageMotion>
  );
}
