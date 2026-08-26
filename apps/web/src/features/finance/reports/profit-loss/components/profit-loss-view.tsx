"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Filter, SlidersHorizontal } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ProfitLossKpiCards } from "./profit-loss-kpi-cards";
import { ProfitLossTrendChart } from "./profit-loss-trend-chart";
import { RevenueVsExpenseChart } from "./revenue-vs-expense-chart";
import { ProfitLossStatementTable } from "./profit-loss-statement-table";
import type { ProfitLossQueryParams } from "../types";

function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ProfitLossView() {
  const t = useTranslations("financeReports");

  const now = useMemo(() => new Date(), []);
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [companyID, setCompanyID] = useState<string>("");
  const [fiscalYearID, setFiscalYearID] = useState<string>("");

  const queryParams: ProfitLossQueryParams = useMemo(
    () => ({
      from_date: pickerRange?.from ? toApiDate(pickerRange.from) : toApiDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to_date: pickerRange?.to ? toApiDate(pickerRange.to) : toApiDate(now),
      company_id: companyID.trim() || undefined,
      fiscal_year_id: fiscalYearID.trim() || undefined,
    }),
    [pickerRange, now, companyID, fiscalYearID],
  );

  const handleExport = () => {
    const url = `/api/v1/finance/reports/profit-loss/export?from_date=${queryParams.from_date}&to_date=${queryParams.to_date}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Row with Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t("pl_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pl_description")}
          </p>
        </div>

        {/* Right Actions: Date Range Picker, Filter Popover, Export */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Date Range Picker */}
          <DateRangePicker dateRange={pickerRange} onDateChange={setPickerRange} />

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs font-semibold h-9">
                <Filter className="w-3.5 h-3.5" />
                <span>{t("filters")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span>{t("filter_reports")}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("company_id_label")}</label>
                  <Input
                    value={companyID}
                    onChange={(e) => setCompanyID(e.target.value)}
                    placeholder={t("company_id_placeholder")}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("fiscal_year_id_label")}</label>
                  <Input
                    value={fiscalYearID}
                    onChange={(e) => setFiscalYearID(e.target.value)}
                    placeholder={t("fiscal_year_placeholder")}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {(companyID || fiscalYearID) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCompanyID("");
                    setFiscalYearID("");
                  }}
                  className="w-full text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {t("reset_filter")}
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={handleExport} className="cursor-pointer gap-1.5 text-xs font-semibold h-9">
            <Download className="w-3.5 h-3.5" />
            <span>{t("export")}</span>
          </Button>
        </div>
      </div>

      {/* Widget 1: Top 4 KPI Cards */}
      <ProfitLossKpiCards params={queryParams} />

      {/* Widget 2 & 3: Middle Grid (Profit Trend Chart & Revenue vs Expense Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <ProfitLossTrendChart params={queryParams} />
        </div>
        <div className="lg:col-span-1">
          <RevenueVsExpenseChart params={queryParams} />
        </div>
      </div>

      {/* Widget 4: Bottom Multi-period Statement Table */}
      <ProfitLossStatementTable params={queryParams} />
    </div>
  );
}
