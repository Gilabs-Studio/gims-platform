import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ClosingList = dynamic(() => import("./closing-list").then((m) => ({ default: m.ClosingList })), {
  loading: () => null,
});

export function FinanceClosingContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ClosingList />
      </Suspense>
    </PageMotion>
  );
}
