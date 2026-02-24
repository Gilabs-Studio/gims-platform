import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const LeadList = dynamic(
  () => import("./lead-list").then((mod) => ({ default: mod.LeadList })),
  { loading: () => null }
);

export function LeadContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <LeadList />
      </Suspense>
    </PageMotion>
  );
}
