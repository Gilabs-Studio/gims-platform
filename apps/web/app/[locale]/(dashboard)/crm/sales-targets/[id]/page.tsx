"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSalesTarget } from "@/features/crm/sales-targets/hooks/use-sales-targets";
import type { EmployeeSalesTarget, MonthlySalesTarget } from "@/features/crm/sales-targets/types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SalesTargetDetailPage() {
  const params = useParams();
  const t = useTranslations("salesTargets");
  const id = params.id as string;
  const localePrefix = typeof params.locale === "string" ? `/${params.locale}` : "";

  const { data: targetResponse, isLoading, isError, error } = useSalesTarget(id);
  const canView = useUserPermission("sales_target.read");
  const target: EmployeeSalesTarget | undefined = targetResponse?.data;

  if (!canView) {
    return (
      <div className="text-center py-8 text-destructive">
        Access denied
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
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

  if (!target) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("notFound")}
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`${localePrefix}/crm/sales-targets`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sales Target Details
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {target.employee?.name}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("employee")}
              </span>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{target.employee?.name}</div>
            <p className="text-xs text-muted-foreground mt-1">
              #{target.employee?.employee_code}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("year")}
              </span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{target.year}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("totalTarget")}
              </span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(target.total_target)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("achievement")}
              </span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">
              {target.achievement_percent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">{t("overallProgress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("totalActual")}</span>
              <span className="font-semibold">
                {formatCurrency(target.total_actual)} / {formatCurrency(target.total_target)}
              </span>
            </div>
            <Progress
              value={target.achievement_percent}
              className="h-2"
              indicatorClassName={getProgressColor(target.achievement_percent)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
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
                  <TableHead className="w-[200px] text-center">
                    {t("progress")}
                  </TableHead>
                  <TableHead className="text-right">{t("achievement")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {target.monthly_targets && target.monthly_targets.length > 0 ? (
                  target.monthly_targets.map((month: MonthlySalesTarget) => (
                    <TableRow key={month.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {monthNames[month.month - 1]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.target_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.actual_amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={month.achievement_percent}
                            className="h-1.5 flex-1"
                            indicatorClassName={getProgressColor(
                              month.achievement_percent
                            )}
                          />
                          <span className="text-xs font-medium w-8 text-right">
                            {month.achievement_percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">
                          {month.achievement_percent.toFixed(1)}%
                        </span>
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

      {/* Notes */}
      {target.notes && (
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {target.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
