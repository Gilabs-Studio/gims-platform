"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { HolidayList } from "./holiday-list";

export default function HolidayPageClient() {
  return (
    <PageMotion>
      <HolidayList />
    </PageMotion>
  );
}
