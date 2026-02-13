import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const AgingReportsView = dynamic(() => import("./aging-reports-view").then((m) => ({ default: m.AgingReportsView })), {
  loading: () => null,
});

export function FinanceAgingReportsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <AgingReportsView />
      </Suspense>
    </PageMotion>
  );
}
