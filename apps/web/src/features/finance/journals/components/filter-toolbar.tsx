import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterToolbarProps = {
  readonly search: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly searchPlaceholder: string;
  readonly startDateLabel: string;
  readonly endDateLabel: string;
  readonly onSearchChange: (value: string) => void;
  readonly onStartDateChange: (value: string) => void;
  readonly onEndDateChange: (value: string) => void;
};

export function FilterToolbar({
  search,
  startDate,
  endDate,
  searchPlaceholder,
  startDateLabel,
  endDateLabel,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-end gap-4">
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

      <div className="w-full sm:w-auto space-y-2">
        <Label>{startDateLabel}</Label>
        <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
      </div>

      <div className="w-full sm:w-auto space-y-2">
        <Label>{endDateLabel}</Label>
        <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
      </div>
      <div className="flex-1" />
    </div>
  );
}
