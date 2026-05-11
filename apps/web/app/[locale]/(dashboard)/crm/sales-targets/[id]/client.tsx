"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesTargetProgress } from "@/features/crm/sales-targets/components/sales-target-progress";
import { isSalesTargetId, useSalesTarget } from "@/features/crm/sales-targets/hooks/use-sales-targets";
import type { MonthlySalesTarget } from "@/features/crm/sales-targets/types";
import { formatCurrency } from "@/lib/utils";

interface SalesTargetDetailPageClientProps {
  targetId: string;
}

export function SalesTargetDetailPageClient({ targetId }: SalesTargetDetailPageClientProps) {
  const params = useParams<{ locale?: string }>();
  const t = useTranslations("salesTargets");
  const localePrefix = params.locale ? `/${params.locale}` : "";
  const isValidId = isSalesTargetId(targetId);

  const { data: targetResponse, isLoading, isError, error } = useSalesTarget(targetId, {
    enabled: isValidId,
  });

  if (!isValidId) {
    return <div className="text-center py-8 text-muted-foreground">{t("notFound")}</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-[420px] rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}: {(error as Error)?.message}
      </div>
    );
  }

  const target = targetResponse?.data;

  if (!target) {
    return <div className="text-center py-8 text-muted-foreground">{t("notFound")}</div>;
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-purple-500";
    if (percent >= 80) return "bg-success";
    if (percent >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`${localePrefix}/crm/sales-targets`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Target Details</h1>
          <p className="text-sm text-muted-foreground mt-1">{target.employee?.name}</p>
        </div>
      </div>

      <SalesTargetProgress target={target} />

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">{t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[100px]">{t("month")}</TableHead>
                  <TableHead className="text-right">{t("targetAmount")}</TableHead>
                  <TableHead className="text-right">{t("actualAmount")}</TableHead>
                  <TableHead className="w-[200px] text-center">{t("progress")}</TableHead>
                  <TableHead className="text-right">{t("achievement")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {target.monthly_targets && target.monthly_targets.length > 0 ? (
                  target.monthly_targets.map((month: MonthlySalesTarget) => (
                    <TableRow key={month.id}>
                      <TableCell className="font-medium text-muted-foreground">{monthNames[month.month - 1]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.target_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(month.actual_amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(month.achievement_percent)}`}
                              style={{ width: `${Math.min(100, Math.max(0, month.achievement_percent))}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{month.achievement_percent.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{month.achievement_percent.toFixed(1)}%</span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No monthly targets configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {target.notes && (
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{target.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}