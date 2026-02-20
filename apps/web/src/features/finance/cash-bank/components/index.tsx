import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const CashBankJournalList = dynamic(
  () => import("./cash-bank-journal-list").then((m) => ({ default: m.CashBankJournalList })),
  { loading: () => null },
);

export function FinanceCashBankContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <CashBankJournalList />
      </Suspense>
    </PageMotion>
  );
}
