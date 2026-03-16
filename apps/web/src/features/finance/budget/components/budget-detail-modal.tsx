"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, FileText, Building2, Calendar, CalendarRange } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Budget } from "../types";

interface BudgetDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly budget?: Budget | null;
  readonly isLoading?: boolean;
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function UtilizationBar({ planned, used }: { planned: number; used: number }) {
  const percent = planned > 0 ? Math.min(100, (used / planned) * 100) : 0;
  const colorClass =
    percent >= 90 ? "bg-destructive" : percent >= 70 ? "bg-warning" : percent >= 50 ? "bg-secondary" : "bg-success";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-mono">{formatCurrency(used)}</span>
        <span className="text-muted-foreground">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-bold font-mono tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function BudgetDetailModal({ open, onOpenChange, budget, isLoading }: BudgetDetailModalProps) {
  const t = useTranslations("financeBudget");

  const planned = budget?.total_amount ?? 0;
  const used = budget?.used_amount ?? 0;
  const remaining = Math.max(0, planned - used);
  const percent = planned > 0 ? Math.round((used / planned) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !budget ? null : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold">{budget.name ?? "-"}</h3>
                <Badge variant={budget.status === "approved" ? "success" : "secondary"} className="text-xs">
                  {budget.status === "approved" ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" />{t("status.approved")}</>
                  ) : (
                    <><FileText className="h-3 w-3 mr-1" />{t("status.draft")}</>
                  )}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {budget.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {budget.department}
                  </span>
                )}
                {budget.fiscal_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    FY {budget.fiscal_year}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarRange className="h-4 w-4" />
                  {safeDate(budget.start_date)} – {safeDate(budget.end_date)}
                </span>
              </div>

              {budget.description && (
                <p className="text-sm text-muted-foreground">{budget.description}</p>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label={t("fields.totalAmount")} value={formatCurrency(planned)} />
              <SummaryCard
                label={t("fields.usedAmount")}
                value={formatCurrency(used)}
                sub={`${percent}% ${t("detail.used")}`}
              />
              <SummaryCard label={t("fields.remainingAmount")} value={formatCurrency(remaining)} />
            </div>

            {/* Overall progress bar */}
            <UtilizationBar planned={planned} used={used} />

            {/* Line items table */}
            {(budget.items ?? []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t("detail.lineItems")}</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("fields.account")}</TableHead>
                        <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
                        <TableHead className="text-right">{t("fields.usedAmount")}</TableHead>
                        <TableHead className="text-right">{t("fields.remainingAmount")}</TableHead>
                        <TableHead>{t("fields.memo")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(budget.items ?? []).map((item) => {
                        const itemPlanned = item.amount ?? 0;
                        const itemUsed = item.used_amount ?? 0;
                        const itemRemaining = Math.max(0, itemPlanned - itemUsed);
                        const coaLabel = item.coa_code
                          ? `${item.coa_code} - ${item.coa_name ?? ""}`
                          : item.chart_of_account_id;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{coaLabel}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-sm">
                              {formatCurrency(itemPlanned)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-sm">
                              <div className="space-y-1">
                                <span>{formatCurrency(itemUsed)}</span>
                                {itemPlanned > 0 && (
                                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        itemUsed / itemPlanned >= 0.9
                                          ? "bg-destructive"
                                          : itemUsed / itemPlanned >= 0.7
                                          ? "bg-warning"
                                          : itemUsed / itemPlanned >= 0.5
                                          ? "bg-secondary"
                                          : "bg-success"
                                      }`}
                                      style={{ width: `${Math.min(100, (itemUsed / itemPlanned) * 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-sm">
                              {formatCurrency(itemRemaining)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.memo ?? "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
