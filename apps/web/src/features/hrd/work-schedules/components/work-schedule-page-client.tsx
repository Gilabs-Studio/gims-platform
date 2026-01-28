"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { WorkScheduleList } from "./work-schedule-list";

export function WorkSchedulePageClient() {
  return (
    <PageMotion>
      <WorkScheduleList />
    </PageMotion>
  );
}
