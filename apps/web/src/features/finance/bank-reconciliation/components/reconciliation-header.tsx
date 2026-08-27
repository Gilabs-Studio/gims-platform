"use client";

import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ReconciliationHeaderProps {
  totalCount?: number;
  dateRange: DateRange | undefined;
  onDateChange: (dateRange: DateRange | undefined) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenUploadModal: () => void;
  onOpenExportModal: () => void;
}

export function ReconciliationHeader({
  totalCount = 0,
  dateRange,
  onDateChange,
  statusFilter,
  onStatusFilterChange,
  onOpenUploadModal,
  onOpenExportModal,
}: ReconciliationHeaderProps) {
  const t = useTranslations("financeBankReconciliation");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {t("title")}{" "}
          {totalCount > 0 && (
            <span className="text-muted-foreground font-normal text-sm">({totalCount})</span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("description")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <DateRangePicker dateRange={dateRange} onDateChange={onDateChange} />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer text-xs h-9 font-medium"
            >
              <span>{t("addFilters")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("fields.status")}</label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none cursor-pointer"
              >
                <option value="all">All States</option>
                <option value="in_progress">In Progress</option>
                <option value="reconciled">Reconciled</option>
                <option value="locked">Locked</option>
              </select>
            </div>
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusFilterChange("all")}
                className="w-full text-xs cursor-pointer text-muted-foreground"
              >
                Reset Filter
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExportModal}
          className="cursor-pointer text-xs h-9 font-medium"
        >
          <span>{t("exportSummary")}</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenUploadModal}
          className="cursor-pointer bg-primary text-primary-foreground text-xs h-9 font-medium"
        >
          <span>{t("uploadStatement")}</span>
        </Button>
      </div>
    </div>
  );
}
