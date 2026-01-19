import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const ProcurementTypeList = dynamic(
  () =>
    import("./procurement-type-list").then(
      (mod) => ({ default: mod.ProcurementTypeList }),
    ),
  {
    loading: () => null,
  },
);

export function ProcurementTypeContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ProcurementTypeList />
      </Suspense>
    </PageMotion>
  );
}
