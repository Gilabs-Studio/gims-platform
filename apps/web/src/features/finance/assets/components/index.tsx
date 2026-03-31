import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const AssetsList = dynamic(
  () => import("./assets-list").then((m) => ({ default: m.AssetsList })),
  {
    loading: () => null,
  },
);

export function FinanceAssetsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <AssetsList />
      </Suspense>
    </PageMotion>
  );
}

// Asset Tab Components
export { AssetAcquisitionTab } from "./asset-tabs/asset-acquisition-tab";
export { AssetDepreciationConfigTab } from "./asset-tabs/asset-depreciation-config-tab";
export { AssetComponentsTab } from "./asset-tabs/asset-components-tab";
