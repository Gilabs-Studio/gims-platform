"use client";

import { useTranslations } from "next-intl";
import { Drawer } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceCalendarTab } from "./attendance-calendar-tab";
import { SelfLeaveRequestTab } from "@/features/hrd/leave-request/components/self-leave-request-tab";

export type AttendanceDrawerTab = "calendar" | "leave";

interface AttendanceRightDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly initialTab?: AttendanceDrawerTab;
  readonly openCreateLeaveSignal?: number;
}

export function AttendanceRightDrawer({
  open,
  onOpenChange,
  initialTab = "calendar",
  openCreateLeaveSignal,
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
      <Tabs
        key={`${open}-${initialTab}`}
        defaultValue={initialTab}
        className="mt-2"
      >
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="cursor-pointer">
            {t("calendarTab")}
          </TabsTrigger>
          <TabsTrigger value="leave" className="cursor-pointer">
            {t("leaveTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="pt-3">
          <AttendanceCalendarTab />
        </TabsContent>
        <TabsContent value="leave" className="pt-3">
          <SelfLeaveRequestTab openCreateSignal={openCreateLeaveSignal} />
        </TabsContent>
      </Tabs>
    </Drawer>
  );
}
