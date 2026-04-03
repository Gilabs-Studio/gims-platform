"use client";

import { Drawer } from "@/components/ui/drawer";
import { SelfOvertimeTab } from "@/features/hrd/overtime/components/self-overtime-tab";
import { useTranslations } from "next-intl";

interface OvertimeDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function OvertimeDrawer({ open, onOpenChange }: OvertimeDrawerProps) {
  const t = useTranslations("hrd.overtime");

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
        <SelfOvertimeTab />
      </div>
    </Drawer>
  );
}
