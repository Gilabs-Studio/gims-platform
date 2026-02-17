import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const BankAccountsList = dynamic(
  () => import("./bank-accounts-list").then((m) => ({ default: m.BankAccountsList })),
  { loading: () => null },
);

export function FinanceBankAccountsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <BankAccountsList />
      </Suspense>
    </PageMotion>
  );
}
