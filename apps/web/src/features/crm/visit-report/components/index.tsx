import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const VisitReportList = dynamic(
  () => import("./visit-report-list").then((mod) => ({ default: mod.VisitReportList })),
  { loading: () => null }
);

export { VisitReportDetail } from "./visit-report-detail";

export function VisitReportContainer() {
  return (
    <PageMotion>
      <VisitReportList />
    </PageMotion>
  );
}
