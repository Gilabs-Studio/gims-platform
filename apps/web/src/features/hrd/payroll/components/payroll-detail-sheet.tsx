"use client";

import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, Calendar, Users, DollarSign, UserCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollDetailSheetProps {
  run: PayrollRunRecord | null;
  onClose: () => void;
}

export function PayrollDetailSheet({ run, onClose }: PayrollDetailSheetProps) {
  const t = useTranslations("payroll");

  if (!run) return null;

  const isInProgress = run.status === "In Progress";

  return (
    <Sheet open={!!run} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md space-y-6 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">
              {t("payroll.title")} - {run.period}
            </SheetTitle>
            {isInProgress ? (
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-400 text-xs font-medium"
              >
                {t("status.inProgress")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-400 text-xs font-medium"
              >
                {t("status.completed")}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Rincian lengkap eksekusi dan kalkulasi payroll periode {run.period}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Calendar className="h-3.5 w-3.5" />
                {t("lastRun.processedDate")}
              </div>
              <p className="font-semibold text-foreground">{run.processedDate}</p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <UserCheck className="h-3.5 w-3.5" />
                {t("lastRun.processedBy")}
              </div>
              <p className="font-semibold text-foreground">{run.processedBy}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                {t("lastRun.totalEmployees")}
              </div>
              <span className="text-sm font-bold text-foreground">{run.totalEmployees} Karyawan</span>
            </div>

            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                {t("lastRun.totalPayroll")}
              </div>
              <span className="text-base font-bold text-foreground">
                {formatCurrency(run.totalPayroll)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground">Aksi Ekspor</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="cursor-pointer gap-2 text-xs justify-center"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                {t("actions.exportCsv")}
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer gap-2 text-xs justify-center"
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                {t("actions.exportBank")}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
