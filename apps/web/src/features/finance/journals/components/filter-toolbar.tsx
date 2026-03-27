import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type FilterToolbarProps = {
  readonly search?: string;
  readonly dateRange?: DateRange;
  readonly dateRangeLabel?: string;
  readonly searchPlaceholder?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly onDateRangeChange?: (value: DateRange | undefined) => void;
  readonly children?: ReactNode;
};

export function FilterToolbar({
  search,
  dateRange,
  dateRangeLabel,
  searchPlaceholder,
  onSearchChange,
  onDateRangeChange,
  children,
}: FilterToolbarProps) {
  const hasSearch = typeof search === "string" && !!searchPlaceholder && !!onSearchChange;
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

      {hasDateRange ? (
        <div className="w-full sm:w-auto space-y-2">
          <Label>{dateRangeLabel}</Label>
          <DateRangePicker
            dateRange={dateRange}
            onDateChange={onDateRangeChange}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {children}
      </div>
    </div>
  );
}
