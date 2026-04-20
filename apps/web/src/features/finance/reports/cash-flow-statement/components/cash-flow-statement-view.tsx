"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowDownUp, Landmark, Wallet } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FilterToolbar } from "@/features/finance/journals/components/filter-toolbar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import { useCashFlowStatement } from "../hooks/use-cash-flow-statement";
import type { CashFlowSection } from "../types";

function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CashFlowStatementView() {
  const t = useTranslations("financeReports");
  const tCommon = useTranslations("common");

  const now = new Date();
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), 0, 1),
    to: now,
  });
  const [companyID, setCompanyID] = useState<string>("");

  const queryParams = useMemo(
    () => ({
      from_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), 0, 1)),
      to_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
      company_id: companyID.trim() || undefined,
    }),
    [pickerRange, now, companyID],
  );

  const { data, isLoading, isError } = useCashFlowStatement(queryParams);
  const report = data?.data;

  const sections = useMemo(
    () => [
      { key: "operating", title: t("operating_activities"), section: report?.operating },
      { key: "investing", title: t("investing_activities"), section: report?.investing },
      { key: "financing", title: t("financing_activities"), section: report?.financing },
    ],
    [report?.operating, report?.investing, report?.financing, t],
  );

  const metrics = [
    {
      label: t("net_change_cash"),
      value: formatCurrency(report?.net_change ?? 0),
      icon: ArrowDownUp,
      valueClass: (report?.net_change ?? 0) >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: t("beginning_cash"),
      value: formatCurrency(report?.beginning_cash ?? 0),
      icon: Wallet,
      valueClass: "",
    },
    {
      label: t("ending_cash"),
      value: formatCurrency(report?.ending_cash ?? 0),
      icon: Landmark,
      valueClass: "",
    },
    {
      label: t("reconciliation_gap"),
      value: formatCurrency(report?.reconciliation_gap ?? 0),
      icon: AlertTriangle,
      valueClass:
        Math.abs(report?.reconciliation_gap ?? 0) <= 0.01 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("cf_title")}</h1>
        <p className="text-muted-foreground">{t("cf_description")}</p>
      </div>

      <FilterToolbar>
        <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />
        <Input
          value={companyID}
          onChange={(event) => setCompanyID(event.target.value)}
          placeholder={t("company_id_placeholder")}
          className="w-full sm:w-[280px]"
        />
      </FilterToolbar>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, valueClass }) => (
              <Card key={label} className="flex flex-col justify-between shadow-sm p-5 space-y-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Alert variant={report.is_reconciled ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {report.is_reconciled ? t("reconciled") : t("not_reconciled")}
            </AlertTitle>
            <AlertDescription>
              {t("method")}: {report.method === "indirect" ? t("method_indirect") : report.method ?? "-"}
            </AlertDescription>
          </Alert>

          {sections.map(({ key, title, section }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{title}</span>
                  <span className="font-mono text-sm">{formatCurrency(section?.amount ?? 0)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("account_code")}</TableHead>
                      <TableHead>{t("account_name")}</TableHead>
                      <TableHead className="text-right">{t("amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(section?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          {tCommon("noData")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      section?.items.map((item) => (
                        <TableRow key={`${key}-${item.account_id ?? item.code}`}>
                          <TableCell className="font-mono text-xs">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(item.amount ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell colSpan={2}>{title}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(section?.amount ?? 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">{t("no_data")}</div>
      )}
    </div>
  );
}
