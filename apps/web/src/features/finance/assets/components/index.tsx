import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const AssetsList = dynamic(() => import("./assets-list").then((m) => ({ default: m.AssetsList })), {
  loading: () => null,
});

export function FinanceAssetsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <AssetsList />
      </Suspense>
    </PageMotion>
  );
}
