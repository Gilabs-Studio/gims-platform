import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const BankTransferList = dynamic(
  () => import("./transfer-list").then((m) => ({ default: m.BankTransferList })),
  { loading: () => null },
);

export function FinanceBankTransferContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <BankTransferList />
      </Suspense>
    </PageMotion>
  );
}
