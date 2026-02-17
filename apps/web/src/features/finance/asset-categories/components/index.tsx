import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const AssetCategoryList = dynamic(
  () => import("./asset-category-list").then((m) => ({ default: m.AssetCategoryList })),
  { loading: () => null },
);

export function FinanceAssetCategoriesContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <AssetCategoryList />
      </Suspense>
    </PageMotion>
  );
}
