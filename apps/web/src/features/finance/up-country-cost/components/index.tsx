import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const UpCountryCostPage = dynamic(
  () => import("./up-country-cost-page").then((m) => ({ default: m.UpCountryCostPage })),
  { loading: () => null },
);

export function FinanceUpCountryCostContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <UpCountryCostPage />
      </Suspense>
    </PageMotion>
  );
}
