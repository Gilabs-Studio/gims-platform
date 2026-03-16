import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const CurrencyList = dynamic(() => import("./currency-list").then((mod) => ({ default: mod.CurrencyList })), {
  loading: () => null,
});

export function CurrencyContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <CurrencyList />
      </Suspense>
    </PageMotion>
  );
}