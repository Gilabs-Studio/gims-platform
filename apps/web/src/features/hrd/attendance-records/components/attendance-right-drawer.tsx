"use client";

import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import { AttendanceCalendarTab } from "./attendance-calendar-tab";

export type AttendanceDrawerTab = "calendar" | "leave" | "overtime";

interface AttendanceRightDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function AttendanceRightDrawer({
  open,
  onOpenChange,
}: AttendanceRightDrawerProps) {
  const t = useTranslations("hrd.attendance");

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={t("historyTitle")}
      description={t("historySubtitle")}
      defaultWidth={672}
      minWidth={400}
      maxWidth={900}
      resizable
    >
      <div className="px-4 py-4 md:px-5 md:py-5">
        <AttendanceCalendarTab />
      </div>
    </Drawer>
  );
}
