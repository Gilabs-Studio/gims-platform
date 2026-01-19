import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const PackagingList = dynamic(
  () =>
    import("./packaging-list").then(
      (mod) => ({ default: mod.PackagingList }),
    ),
  {
    loading: () => null,
  },
);

export function PackagingContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PackagingList />
      </Suspense>
    </PageMotion>
  );
}
