"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { AttendanceList } from "./attendance-list";

export default function AttendancePageClient() {
  return (
    <PageMotion>
      <AttendanceList />
    </PageMotion>
  );
}
