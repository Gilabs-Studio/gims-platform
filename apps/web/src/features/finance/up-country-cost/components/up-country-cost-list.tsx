"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  CalendarIcon,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import {
  useFinanceUpCountryCostList,
  useFinanceUpCountryCostStats,
  useDeleteFinanceUpCountryCost,
  useSubmitFinanceUpCountryCost,
  useManagerApproveFinanceUpCountryCost,
  useManagerRejectFinanceUpCountryCost,
  useFinanceApproveUpCountryCost,
  useMarkPaidFinanceUpCountryCost,
} from "../hooks/use-finance-up-country-cost";
import type { UpCountryCost, UpCountryCostStatus } from "../types";
import { UpCountryCostForm } from "./up-country-cost-form";
import { UpCountryCostDetail } from "./up-country-cost-detail";

const STATUS_LIST: UpCountryCostStatus[] = [
  "draft",
  "submitted",
  "manager_approved",
  "finance_approved",
  "paid",
  "rejected",
];

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  return formatDate(value) || value;
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "paid":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <Banknote className="h-3 w-3 mr-1" />
          {t(`status.paid`)}
        </Badge>
      );
    case "finance_approved":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.finance_approved`)}
        </Badge>
      );
    case "manager_approved":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.manager_approved`)}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <Send className="h-3 w-3 mr-1" />
          {t(`status.submitted`)}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t(`status.rejected`)}
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t(`status.draft`)}
        </Badge>
      );
  }
}

function ParticipantAvatars({
  employeeIds,
  getEmployeeName,
  getEmployeeCode,
}: {
  employeeIds: string[];
  getEmployeeName: (id: string) => string;
  getEmployeeCode: (id: string) => string;
}) {
  if (employeeIds.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const maxVisible = 3;
  const visibleIds = employeeIds.slice(0, maxVisible);
  const remaining = employeeIds.length - visibleIds.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleIds.map((employeeId) => (
          <Avatar key={employeeId} className="h-7 w-7 border-2 border-background" title={getEmployeeName(employeeId)}>
            <AvatarFallback className="text-[10px]" dataSeed={getEmployeeCode(employeeId) || getEmployeeName(employeeId)} />
          </Avatar>
        ))}
      </div>
      {remaining > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">+{remaining}</span>
      )}
    </div>
  );
}

export function UpCountryCostList() {
  const t = useTranslations("financeUpCountryCost");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("up_country_cost.create");
  const canView = useUserPermission("up_country_cost.read");
  const canUpdate = useUserPermission("up_country_cost.update");
  const canDelete = useUserPermission("up_country_cost.delete");
  const canApprove = useUserPermission("up_country_cost.approve");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<UpCountryCost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<UpCountryCost | null>(null);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    [debouncedSearch, statusFilter, startDate, endDate],
  );

  const { data, isLoading, isError } = useFinanceUpCountryCostList(queryParams);
  const { data: statsData, isLoading: statsLoading } = useFinanceUpCountryCostStats();
  const { data: employeesData } = useEmployees({ per_page: 500, is_active: true });

  const deleteMutation = useDeleteFinanceUpCountryCost();
  const submitMutation = useSubmitFinanceUpCountryCost();
  const managerApproveMutation = useManagerApproveFinanceUpCountryCost();
  const managerRejectMutation = useManagerRejectFinanceUpCountryCost();
  const financeApproveMutation = useFinanceApproveUpCountryCost();
  const markPaidMutation = useMarkPaidFinanceUpCountryCost();

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const stats = statsData?.data;
  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; employee_code: string }>();
    (employeesData?.data ?? []).forEach((employee) => {
      map.set(employee.id, {
        name: employee.name,
        employee_code: employee.employee_code,
      });
    });
    return map;
  }, [employeesData?.data]);

  const getEmployeeName = (id: string): string => employeeMap.get(id)?.name ?? "-";
  const getEmployeeCode = (id: string): string => employeeMap.get(id)?.employee_code ?? "";

  const handleCreate = () => {
    setSelectedItem(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEdit = (item: UpCountryCost) => {
    setSelectedItem(item);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleViewDetail = (item: UpCountryCost) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success(t("toast.submitted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleManagerApprove = async (id: string) => {
    try {
      await managerApproveMutation.mutateAsync(id);
      toast.success(t("toast.managerApproved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleManagerReject = async (id: string) => {
    try {
      await managerRejectMutation.mutateAsync({ id, comment: "" });
      toast.success(t("toast.managerRejected"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleFinanceApprove = async (id: string) => {
    try {
      await financeApproveMutation.mutateAsync(id);
      toast.success(t("toast.financeApproved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaidMutation.mutateAsync(id);
      toast.success(t("toast.paid"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {tCommon("create")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="rounded-md border p-4">
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("stats.totalRequests")}</p>
              <p className="font-semibold">{stats?.total_requests ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("stats.pendingApproval")}</p>
              <p className="font-semibold">{stats?.pending_approval ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">{t("stats.totalAmount")}</p>
              <p className="font-semibold">{formatCurrency(stats?.total_amount ?? 0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tCommon("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">{t("filters.allStatuses")}</SelectItem>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer">{t(`status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-52 justify-start text-left font-normal cursor-pointer",
                !startDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? formatDateLabel(startDate) : t("filters.startDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate ? new Date(startDate) : undefined}
              onSelect={(date: Date | undefined) => setStartDate(date ? dateToISO(date) : "")}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {startDate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 cursor-pointer"
            onClick={() => setStartDate("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-52 justify-start text-left font-normal cursor-pointer",
                !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? formatDateLabel(endDate) : t("filters.endDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate ? new Date(endDate) : undefined}
              onSelect={(date: Date | undefined) => setEndDate(date ? dateToISO(date) : "")}
              disabled={startDate ? (date) => date < new Date(startDate) : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {endDate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 cursor-pointer"
            onClick={() => setEndDate("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.code")}</TableHead>
              <TableHead>{t("fields.purpose")}</TableHead>
              <TableHead>{t("fields.employees")}</TableHead>
              <TableHead>{t("fields.location")}</TableHead>
              <TableHead>{t("fields.startDate")}</TableHead>
              <TableHead>{t("fields.endDate")}</TableHead>
              <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(canView && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => {
                    if (canView) {
                      handleViewDetail(item);
                    }
                  }}
                >
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{item.purpose}</TableCell>
                  <TableCell>
                    <ParticipantAvatars
                      employeeIds={item.employees.map((employee) => employee.employee_id)}
                      getEmployeeName={getEmployeeName}
                      getEmployeeCode={getEmployeeCode}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.location ?? "-"}</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
                  <TableCell>{formatDate(item.end_date)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(item.total_amount)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status, t)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canView && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleViewDetail(item)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.viewDetail")}
                          </DropdownMenuItem>
                        )}

                        {canUpdate && item.status === "draft" && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                        )}

                        {canApprove && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-primary focus:text-primary"
                            onClick={() => handleSubmit(item.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {t("actions.submit")}
                          </DropdownMenuItem>
                        )}

                        {canApprove && item.status === "submitted" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-success focus:text-success"
                              onClick={() => handleManagerApprove(item.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.managerApprove")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleManagerReject(item.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.managerReject")}
                            </DropdownMenuItem>
                          </>
                        )}

                        {canApprove && item.status === "manager_approved" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-success focus:text-success"
                              onClick={() => handleFinanceApprove(item.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.financeApprove")}
                            </DropdownMenuItem>
                          </>
                        )}

                        {canApprove && item.status === "finance_approved" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-success focus:text-success"
                              onClick={() => handleMarkPaid(item.id)}
                            >
                              <Banknote className="h-4 w-4 mr-2" />
                              {t("actions.markPaid")}
                            </DropdownMenuItem>
                          </>
                        )}

                        {canDelete && item.status === "draft" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UpCountryCostForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={selectedItem}
      />

      <UpCountryCostDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
        onActionSuccess={() => {
          setDetailOpen(false);
        }}
      />
    </div>
  );
}
