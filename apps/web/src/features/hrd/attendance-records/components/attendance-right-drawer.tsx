"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  const [activeTab, setActiveTab] = useState<AttendanceDrawerTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("historyTitle")}</SheetTitle>
          <SheetDescription>{t("historySubtitle")}</SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AttendanceDrawerTab)}
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
      </SheetContent>
    </Sheet>
  );
}
