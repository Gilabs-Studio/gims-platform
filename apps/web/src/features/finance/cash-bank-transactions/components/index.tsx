import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const CashBankTransactionsList = dynamic(
  () => import("./cash-bank-transactions-list").then((m) => ({ default: m.CashBankTransactionsList })),
  { loading: () => null },
);

export function FinanceCashBankTransactionsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <CashBankTransactionsList />
      </Suspense>
    </PageMotion>
  );
}
