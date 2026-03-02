import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const JournalLinesList = dynamic(
  () =>
    import("./journal-lines-list").then((m) => ({
      default: m.JournalLinesList,
    })),
  {
    loading: () => null,
  }
);

export function JournalLinesContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <JournalLinesList />
      </Suspense>
    </PageMotion>
  );
}
