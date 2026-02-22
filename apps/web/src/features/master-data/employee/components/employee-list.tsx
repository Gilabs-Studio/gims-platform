"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Eye,
} from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EmployeeForm } from "./employee-form";
import { EmployeeDetailModal } from "./employee-detail-modal";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { sortOptions } from "@/lib/utils";
import type { Employee, EmployeeStatus } from "../types";
import {
  useEmployees,
  useEmployee,
  useDeleteEmployee,
  useUpdateEmployee,
  useSubmitEmployeeForApproval,
  useApproveEmployee,
} from "../hooks/use-employees";
import { useDebounce } from "@/hooks/use-debounce";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useJobPositions } from "@/features/master-data/organization/hooks/use-job-positions";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

const STATUS_OPTIONS: EmployeeStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
];

export function EmployeeList() {
  const t = useTranslations("employee");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openIdFromUrl = searchParams.get("openId");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [divisionFilter, setDivisionFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: openEmployeeData } = useEmployee(openIdFromUrl ?? undefined);

  useEffect(() => {
    if (!openIdFromUrl || !openEmployeeData?.data) return;
    setDetailEmployee(openEmployeeData.data);
    setIsDetailOpen(true);
    router.replace(pathname, { scroll: false });
  }, [openIdFromUrl, openEmployeeData?.data, pathname, router]);

  const { data, isLoading, isError } = useEmployees({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    division_id: divisionFilter || undefined,
    job_position_id: positionFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: divisionsData } = useDivisions({ per_page: 100 });
  const { data: positionsData } = useJobPositions({ per_page: 100 });

  const canCreate = useUserPermission("employee.create");
  const canUpdate = useUserPermission("employee.update");
  const canDelete = useUserPermission("employee.delete");
  const canApprove = useUserPermission("employee.approve");

  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  const submitForApproval = useSubmitEmployeeForApproval();
  const approveEmployee = useApproveEmployee();

  const employees = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const divisions = divisionsData?.data ?? [];
  const positions = positionsData?.data ?? [];

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleViewDetail = (employee: Employee) => {
    setDetailEmployee(employee);
    setIsDetailOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteEmployee.mutateAsync(deletingId);
        toast.success(t("deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error("Failed to delete employee");
      }
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateEmployee.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("updateSuccess"));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitForApproval.mutateAsync(id);
      toast.success(t("submitSuccess"));
    } catch {
      toast.error("Failed to submit for approval");
    }
  };

  const handleApprove = async (id: string, action: "approve" | "reject") => {
    try {
      await approveEmployee.mutateAsync({ id, data: { action } });
      toast.success(
        action === "approve" ? t("approveSuccess") : t("rejectSuccess"),
      );
    } catch {
      toast.error(`Failed to ${action} employee`);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const getStatusBadge = (status: EmployeeStatus) => {
    const variants: Record<
      EmployeeStatus,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "secondary",
      pending: "outline",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>;
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load employees
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={divisionFilter}
          onValueChange={(v) => {
            setDivisionFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.division")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {sortOptions(divisions, (d) => d.name).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={positionFilter}
          onValueChange={(v) => {
            setPositionFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.jobPosition")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {sortOptions(positions, (p) => p.name).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : (v as EmployeeStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.division")}</TableHead>
              <TableHead>{t("columns.position")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.isActive")}</TableHead>
              <TableHead className="w-[100px]">
                {t("columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-mono text-sm">
                    {employee.employee_code}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      {employee.email && (
                        <div className="text-sm text-muted-foreground">
                          {employee.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{employee.division?.name ?? "-"}</TableCell>
                  <TableCell>{employee.job_position?.name ?? "-"}</TableCell>
                  <TableCell>{getStatusBadge(employee.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={employee.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            employee.id,
                            employee.is_active,
                            employee.name,
                          )
                        }
                        disabled={!canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {
                          employee.is_active
                            ? t("columns.isActive") // Reusing 'Active' label or similar if available, or just hardcode/use common
                            : "Inactive" /* Ideally use tCommon or t corresponding keys. Division uses t("common.active") */
                        }
                      </span>
                    </div>
                  </TableCell>
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
                        <DropdownMenuItem
                          onClick={() => handleViewDetail(employee)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(employee)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && employee.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleSubmitForApproval(employee.id)}
                            className="cursor-pointer"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {t("actions.submit")}
                          </DropdownMenuItem>
                        )}
                        {canApprove && employee.status === "pending" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleApprove(employee.id, "approve")
                              }
                              className="cursor-pointer text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("actions.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleApprove(employee.id, "reject")
                              }
                              className="cursor-pointer text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {t("actions.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(employee.id)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("actions.delete")}
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

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Form Dialog */}
      <EmployeeForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        employee={editingEmployee}
      />

      <EmployeeDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        employee={detailEmployee}
        onEdit={(employee) => {
          setIsDetailOpen(false);
          handleEdit(employee);
        }}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title={t("deleteTitle")}
        description={t("deleteConfirm")}
        isLoading={deleteEmployee.isPending}
      />
    </div>
  );
}
