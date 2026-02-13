import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const SalaryPage = dynamic(
  () => import("./salary-page").then((m) => ({ default: m.SalaryPage })),
  { loading: () => null },
);

export function FinanceSalaryContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <SalaryPage />
      </Suspense>
    </PageMotion>
  );
}
