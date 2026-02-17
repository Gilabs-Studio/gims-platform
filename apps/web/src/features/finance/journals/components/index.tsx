import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const JournalsList = dynamic(() => import("./journals-list").then((m) => ({ default: m.JournalsList })), {
  loading: () => null,
});

export function FinanceJournalsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <JournalsList />
      </Suspense>
    </PageMotion>
  );
}
