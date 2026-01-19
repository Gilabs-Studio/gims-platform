import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const UnitOfMeasureList = dynamic(
  () =>
    import("./unit-of-measure-list").then(
      (mod) => ({ default: mod.UnitOfMeasureList }),
    ),
  {
    loading: () => null,
  },
);

export function UnitOfMeasureContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <UnitOfMeasureList />
      </Suspense>
    </PageMotion>
  );
}
