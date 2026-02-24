import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ActivityTypeList = dynamic(() => import("./activity-type-list").then((mod) => ({ default: mod.ActivityTypeList })), { loading: () => null });

export function ActivityTypeContainer() {
  return (<PageMotion><Suspense fallback={null}><ActivityTypeList /></Suspense></PageMotion>);
}
