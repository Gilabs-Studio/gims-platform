import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const CourierAgencyList = dynamic(
  () => import("./courier-agency-list").then((mod) => ({ default: mod.CourierAgencyList })),
  { loading: () => null }
);

export function CourierAgencyContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <CourierAgencyList />
      </Suspense>
    </PageMotion>
  );
}
