"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollLastRunCardProps {
  lastRun?: PayrollRunRecord;
  onViewDetail: (run: PayrollRunRecord) => void;
}

export function PayrollLastRunCard({ lastRun, onViewDetail }: PayrollLastRunCardProps) {
  const t = useTranslations("payroll");

  if (!lastRun) return null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-bold text-foreground">
          {t("lastRun.title")}
        </CardTitle>
        <Badge variant="success">
          {t("status.completed")}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col justify-between space-y-4">
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">{t("lastRun.period")}</span>
            <span className="font-semibold text-foreground">{lastRun.period}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">{t("lastRun.processedDate")}</span>
            <span className="font-medium text-foreground">{lastRun.processedDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">{t("lastRun.processedBy")}</span>
            <span className="font-medium text-foreground">{lastRun.processedBy}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">{t("lastRun.totalEmployees")}</span>
            <span className="font-semibold text-foreground">{lastRun.totalEmployees}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground font-medium">{t("lastRun.totalPayroll")}</span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(lastRun.totalPayroll)}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => onViewDetail(lastRun)}
          className="w-full cursor-pointer justify-center gap-2 text-xs font-medium"
        >
          {t("actions.viewDetail")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
