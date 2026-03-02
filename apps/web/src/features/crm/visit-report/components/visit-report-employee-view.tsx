"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useVisitReportsByEmployee } from "../hooks/use-visit-reports";
import { VisitReportEmployeeCard } from "./visit-report-employee-card";

/** Team-level view: paginated list of expandable employee cards for ALL/DIVISION/AREA scopes. */
export function VisitReportEmployeeView() {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError, refetch } = useVisitReportsByEmployee({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const employees = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("employeeView.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="text-center py-8 text-destructive text-sm">
          <p>{t("employeeView.loadError")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 underline cursor-pointer hover:opacity-80"
          >
            {tCommon("retry")}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && employees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users className="h-10 w-10 opacity-40" />
          <p className="text-sm">{t("employeeView.empty")}</p>
        </div>
      )}

      {/* Employee cards */}
      {!isLoading && employees.length > 0 && (
        <div className="space-y-3">
          {employees.map((employee) => (
            <VisitReportEmployeeCard key={employee.employee_id} summary={employee} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

