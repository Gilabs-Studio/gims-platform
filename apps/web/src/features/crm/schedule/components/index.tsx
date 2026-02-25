import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ScheduleList = dynamic(
  () => import("./schedule-list").then((mod) => ({ default: mod.ScheduleList })),
  { loading: () => null }
);

export function ScheduleContainer() {
  return (
    <PageMotion>
      <ScheduleList />
    </PageMotion>
  );
}
