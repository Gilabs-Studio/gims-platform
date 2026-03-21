"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, CheckCircle, XCircle, Send, Eye, FileText, Download } from "lucide-react";
import { EmployeeForm } from "./employee-form";
import { EmployeeDetailModal } from "./employee-detail-modal";
import { resolveImageUrl, sortOptions } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useEmployeeList } from "../hooks/use-employee-list";
import { getDisplayFilename } from "@/components/ui/file-upload";

export function EmployeeList() {
  const { state, actions, data, permissions, translations: { t } } = useEmployeeList();
  const { handleStatusChange } = actions;



  if (data.isError) {
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
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
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
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={state.divisionFilter}
          onValueChange={(v) => {
            actions.setDivisionFilter(v === "all" ? "" : v);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.division")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {sortOptions(data.divisions, (d) => d.name).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.positionFilter}
          onValueChange={(v) => {
            actions.setPositionFilter(v === "all" ? "" : v);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.jobPosition")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {sortOptions(data.positions, (p) => p.name).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.companyFilter}
          onValueChange={(v) => {
            actions.setCompanyFilter(v === "all" ? "" : v);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.company")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {sortOptions(data.companies, (c) => c.name).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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
              <TableHead>{t("columns.company")}</TableHead>
              <TableHead>{t("columns.contract")}</TableHead>
              <TableHead>{t("columns.isActive")}</TableHead>
              <TableHead className="w-[100px]">
                {t("columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
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
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.employees.map((employee) => (
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
                  <TableCell>{employee.company?.name ?? "-"}</TableCell>
                  <TableCell>
                    {employee.current_contract?.document_path ? (
                      <a
                        href={resolveImageUrl(employee.current_contract.document_path) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {getDisplayFilename(employee.current_contract.document_path) || t("contract.actions.download")}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={employee.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(employee.id, employee.is_active)
                        }
                        disabled={!permissions.canUpdate || data.isUpdating}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {employee.is_active
                          ? t("columns.isActive") // Reusing 'Active' label or similar if available, or just hardcode/use common
                          : "Inactive" /* Ideally use tCommon or t corresponding keys. Division uses t("common.active") */}
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
                          onClick={() => actions.handleViewDetail(employee)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        {permissions.canUpdate && (
                          <DropdownMenuItem
                            onClick={() => actions.handleEdit(employee)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}

                        {permissions.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => actions.setDeletingId(employee.id)}
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
      {data.pagination && (
        <DataTablePagination
          pageIndex={data.pagination.page}
          pageSize={data.pagination.per_page}
          rowCount={data.pagination.total}
          onPageChange={actions.setPage}
          onPageSizeChange={(newSize) => {
            actions.setPageSize(newSize);
            actions.setPage(1);
          }}
        />
      )}

      {/* Form Dialog */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <EmployeeForm
          open={state.isFormOpen}
          onOpenChange={actions.handleFormClose}
          employee={state.editingEmployee}
        />
      )}

      <EmployeeDetailModal
        open={state.isDetailOpen}
        onOpenChange={actions.setIsDetailOpen}
        employee={state.detailEmployee}
        onEdit={(employee) => {
          actions.setIsDetailOpen(false);
          actions.handleEdit(employee);
        }}
      />

      {/* Delete Dialog */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deletingId}
          onOpenChange={(open) => !open && actions.setDeletingId(null)}
          onConfirm={actions.handleDelete}
          title={t("deleteTitle")}
          description={t("deleteConfirm")}
          isLoading={data.isDeleting}
        />
      )}
    </div>
  );
}
