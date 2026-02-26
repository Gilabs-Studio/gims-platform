import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ActivityList = dynamic(
  () => import("./activity-list").then((mod) => ({ default: mod.ActivityList })),
  { loading: () => null }
);

export function ActivityContainer() {
  return (
    <PageMotion>
      <ActivityList />
    </PageMotion>
  );
}
