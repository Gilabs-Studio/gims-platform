import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterToolbarProps = {
  readonly search?: string;
  readonly dateRange?: DateRange | undefined;
  readonly searchPlaceholder?: string;
  readonly dateRangeLabel?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly onDateRangeChange?: (value: DateRange | undefined) => void;
  readonly children?: ReactNode;
};

export function FilterToolbar({
  search,
  dateRange,
  searchPlaceholder,
  dateRangeLabel,
  onSearchChange,
  onDateRangeChange,
  children,
}: FilterToolbarProps) {
  const hasSearch = typeof search === "string" && !!searchPlaceholder && !!onSearchChange;
  const hasDateRange = !!dateRangeLabel && !!onDateRangeChange;

  return (
    <div className="flex flex-col sm:flex-row items-end gap-4">
      {hasSearch ? (
        <div className="flex-1 max-w-sm space-y-2">
          <Label className="mb-2 block">{searchPlaceholder}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
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
