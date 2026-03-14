"use client";


import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  User,
  Search,
  CheckCircle2,
  Pencil,
  Trash2,
  ToggleRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useFinanceSalaryGroups } from "../hooks/use-finance-salary";
import { SalaryHistoryChart } from "./salary-history-chart";
import type { SalaryEmployeeGroup, SalaryStructure } from "../types";

interface SalaryTableWithChartProps {
  readonly onCreate: (employeeId?: string) => void;
  readonly onEdit: (salary: SalaryStructure) => void;
  readonly onDelete: (salary: SalaryStructure) => void;
  readonly onApprove: (salary: SalaryStructure) => void;
  readonly onToggleStatus: (salary: SalaryStructure) => void;
  readonly search: string;
  readonly onSearchChange: (search: string) => void;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active"
      ? "default"
      : status === "draft"
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant} className="text-xs uppercase">
      {status}
    </Badge>
  );
}

function EmployeeCell({ group }: { group: SalaryEmployeeGroup }) {
  const emp = group.employee;
  const activeSalary =
    group.salaries.find((s) => s.status === "active") ?? group.salaries[0];

  return (
    <div className="flex items-center space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={emp?.avatar_url} alt={emp?.name ?? ""} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div>
        <div className="font-medium text-sm">
          {emp?.name ?? "Unknown Employee"}
        </div>
        <div className="text-xs text-muted-foreground">
          {emp?.employee_code ?? activeSalary?.employee_id?.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}

export function SalaryTableWithChart({
  onCreate,
  onEdit,
  onDelete,
  onApprove,
  onToggleStatus,
  search,
  onSearchChange,
  page,
  onPageChange,
}: SalaryTableWithChartProps) {
  const t = useTranslations("financeSalary");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("salary.create");
  const canUpdate = useUserPermission("salary.update");
  const canDelete = useUserPermission("salary.delete");
  const canApprove = useUserPermission("salary.approve");

  const [expandedEmployeeId, setExpandedEmployeeId] = React.useState<
    string | null
  >(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, refetch } = useFinanceSalaryGroups({
    search: debouncedSearch || undefined,
    page,
    per_page: 20,
  });

  const groups = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const toggleExpand = React.useCallback((employeeId: string) => {
    setExpandedEmployeeId((prev) =>
      prev === employeeId ? null : employeeId
    );
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive text-sm">{tCommon("error")}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="mt-2 cursor-pointer"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onPageChange(1); // Reset to first page on search
          }}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t("fields.employee")}</TableHead>
              <TableHead>{t("fields.effectiveDate")}</TableHead>
              <TableHead className="text-right">
                {t("fields.basicSalary")}
              </TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.historyCount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => {
                const activeSalary =
                  group.salaries.find((s) => s.status === "active") ??
                  group.salaries[0];
                const draftSalary = group.salaries.find(
                  (s) => s.status === "draft"
                );
                const isExpanded = expandedEmployeeId === group.employee_id;
                const hasDraft = !!draftSalary;

                return (
                  <React.Fragment key={group.employee_id}>
                    {/* Main row */}
                    <TableRow className="hover:bg-muted/50 transition-colors">
                      {/* Expand toggle */}
                      <TableCell className="w-8 p-2">
                        {group.salary_count > 1 || hasDraft ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer"
                            onClick={() => toggleExpand(group.employee_id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>

                      {/* Employee */}
                      <TableCell>
                        <EmployeeCell group={group} />
                      </TableCell>

                      {/* Effective date */}
                      <TableCell className="text-sm text-muted-foreground">
                        {activeSalary?.effective_date
                          ? format(
                              new Date(activeSalary.effective_date),
                              "MMM dd, yyyy"
                            )
                          : "-"}
                      </TableCell>

                      {/* Basic salary */}
                      <TableCell className="text-right font-medium text-sm">
                        {activeSalary
                          ? formatCurrency(activeSalary.basic_salary)
                          : "-"}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {hasDraft ? (
                          <StatusBadge status="draft" />
                        ) : activeSalary ? (
                          <StatusBadge status={activeSalary.status} />
                        ) : (
                          "-"
                        )}
                      </TableCell>

                      {/* History count */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {group.salary_count}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {activeSalary && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => onToggleStatus(activeSalary)}
                              >
                                <ToggleRight className="h-4 w-4 mr-2" />
                                {activeSalary.status === "active"
                                  ? t("actions.deactivate")
                                  : t("actions.activate")}
                              </DropdownMenuItem>
                            )}
                            {canCreate && !hasDraft && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => onCreate(group.employee_id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {t("actions.addSalary")}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && hasDraft && draftSalary && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => onEdit(draftSalary)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {tCommon("edit")}
                              </DropdownMenuItem>
                            )}
                            {canApprove && hasDraft && draftSalary && (
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                onClick={() => onApprove(draftSalary)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.approve")}
                              </DropdownMenuItem>
                            )}
                            {canDelete && hasDraft && draftSalary && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => onDelete(draftSalary)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row: salary history chart */}
                    {isExpanded && (
                      <TableRow key={`chart-${group.employee_id}`}>
                        <TableCell
                          colSpan={7}
                          className="p-0 bg-muted/20 border-b"
                        >
                          <div className="px-6 py-5">
                            <SalaryHistoryChart
                              salaryHistory={group.salaries}
                              employeeName={
                                group.employee?.name ?? "Unknown Employee"
                              }
                              className="w-full"
                              onApproveDraft={(id) => {
                                const s = group.salaries.find(
                                  (x) => x.id === id && x.status === "draft"
                                );
                                if (s) onApprove(s);
                              }}
                              onEditDraft={(id) => {
                                const s = group.salaries.find(
                                  (x) => x.id === id && x.status === "draft"
                                );
                                if (s) onEdit(s);
                              }}
                              onDeleteDraft={(id) => {
                                const s = group.salaries.find(
                                  (x) => x.id === id && x.status === "draft"
                                );
                                if (s) onDelete(s);
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <DataTablePagination
          pageIndex={page}
          pageSize={20}
          rowCount={total}
          onPageChange={onPageChange}
          onPageSizeChange={() => {}}
          showPageSize={false}
        />
      )}
    </div>
  );
}
