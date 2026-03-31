import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterToolbarProps = {
  readonly search?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly dateRange?: DateRange;
  readonly searchPlaceholder?: string;
  readonly startDateLabel?: string;
  readonly endDateLabel?: string;
  readonly dateRangeLabel?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly onStartDateChange?: (value: string) => void;
  readonly onEndDateChange?: (value: string) => void;
  readonly onDateRangeChange?: (value: DateRange | undefined) => void;
  readonly children?: ReactNode;
};

export function FilterToolbar({
  search,
  startDate,
  endDate,
  dateRange,
  searchPlaceholder,
  startDateLabel,
  endDateLabel,
  dateRangeLabel,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
  onDateRangeChange,
  children,
}: FilterToolbarProps) {
  const hasSearch = typeof search === "string" && !!searchPlaceholder && !!onSearchChange;
  const hasStartDate = typeof startDate === "string" && !!startDateLabel && !!onStartDateChange;
  const hasEndDate = typeof endDate === "string" && !!endDateLabel && !!onEndDateChange;
  const hasDateRange = !!dateRangeLabel && !!onDateRangeChange;

  return (
    <div className="flex flex-col sm:flex-row items-end gap-4">
      {hasSearch ? (
        <div className="relative flex-1 max-w-sm">
          <Label className="mb-2 block">{searchPlaceholder}</Label>
          <Search className="absolute left-3 top-[34px] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      ) : null}

      {hasStartDate ? (
        <div className="w-full sm:w-auto space-y-2">
          <Label>{startDateLabel}</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
      ) : null}

      {hasEndDate ? (
        <div className="w-full sm:w-auto space-y-2">
          <Label>{endDateLabel}</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      ) : null}

      {hasDateRange ? (
        <div className="w-full sm:w-auto space-y-2">
          <Label>{dateRangeLabel}</Label>
          <DateRangePicker dateRange={dateRange} onDateChange={onDateRangeChange} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {children}
      </div>
    </div>
  );
}
