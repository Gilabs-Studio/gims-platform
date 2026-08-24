"use client";

import { useTranslations } from "next-intl";
import { Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PayrollHeaderProps {
  onRunPayroll: () => void;
  onOpenSettings: () => void;
}

export function PayrollHeader({ onRunPayroll, onOpenSettings }: PayrollHeaderProps) {
  const t = useTranslations("payroll");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onRunPayroll}
          className="cursor-pointer gap-2"
        >
          <Play className="h-4 w-4 fill-current" />
          {t("actions.payrollRun")}
        </Button>

        <Button
          variant="outline"
          onClick={onOpenSettings}
          className="cursor-pointer gap-2"
        >
          <Settings className="h-4 w-4" />
          {t("actions.payrollSettings")}
        </Button>
      </div>
    </div>
  );
}
