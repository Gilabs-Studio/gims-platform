"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { OvertimeList } from "./overtime-list";

export function OvertimePageClient() {
  return (
    <PageMotion>
      <OvertimeList />
    </PageMotion>
  );
}
