import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const AssetLocationList = dynamic(
  () => import("./asset-location-list").then((m) => ({ default: m.AssetLocationList })),
  { loading: () => null },
);

export function FinanceAssetLocationsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <AssetLocationList />
      </Suspense>
    </PageMotion>
  );
}
