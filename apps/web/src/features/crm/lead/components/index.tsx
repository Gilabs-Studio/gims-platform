import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const LeadList = dynamic(
  () => import("./lead-list").then((mod) => ({ default: mod.LeadList })),
  { loading: () => null }
);

export { LeadDetail } from "./lead-detail";

export function LeadContainer() {
  return (
    <PageMotion>
      <LeadList />
    </PageMotion>
  );
}
