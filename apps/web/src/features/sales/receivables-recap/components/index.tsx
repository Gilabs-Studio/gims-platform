import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ReceivablesRecapList = dynamic(
  () =>
    import("./receivables-recap-list").then((mod) => ({
      default: mod.ReceivablesRecapList,
    })),
  { loading: () => null },
);

export function ReceivablesRecapContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <ReceivablesRecapList />
      </Suspense>
    </PageMotion>
  );
}
