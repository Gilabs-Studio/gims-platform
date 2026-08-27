"use client";

import { useTranslations } from "next-intl";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReconciliationFilterBarProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onResetFilters?: () => void;
}

export function ReconciliationFilterBar({
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
}: ReconciliationFilterBarProps) {
  const t = useTranslations("financeBankReconciliation");

  if (statusFilter === "all") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-card/60 p-2.5 rounded-lg border border-border text-xs">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground font-medium">Active Filters:</span>

      <Badge variant="active" className="gap-1 font-semibold">
        <span>{t("fields.status")}: {statusFilter}</span>
        <button
          type="button"
          onClick={() => onStatusFilterChange("all")}
          className="cursor-pointer hover:text-foreground ml-1"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>

      {onResetFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="cursor-pointer text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
        >
          Reset All
        </Button>
      )}
    </div>
  );
}
