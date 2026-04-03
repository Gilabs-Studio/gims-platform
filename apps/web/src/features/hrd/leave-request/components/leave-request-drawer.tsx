"use client";

import { Drawer } from "@/components/ui/drawer";
import { SelfLeaveRequestTab } from "@/features/hrd/leave-request/components/self-leave-request-tab";
import { useTranslations } from "next-intl";

interface LeaveRequestDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly openCreateSignal?: number;
}

export function LeaveRequestDrawer({
  open,
  onOpenChange,
  openCreateSignal,
}: LeaveRequestDrawerProps) {
  const t = useTranslations("hrd.leaveRequest");

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={t("title")}
      description={t("description")}
      defaultWidth={672}
      minWidth={400}
      maxWidth={900}
      resizable
    >
      <div className="px-4 py-4 md:px-5 md:py-5">
        <SelfLeaveRequestTab openCreateSignal={openCreateSignal} />
      </div>
    </Drawer>
  );
}
