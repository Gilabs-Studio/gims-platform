import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const CoaList = dynamic(() => import("./coa-list").then((m) => ({ default: m.CoaList })), {
  loading: () => null,
});

export function FinanceCoaContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <CoaList />
      </Suspense>
    </PageMotion>
  );
}
