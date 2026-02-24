"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { JobPositionForm } from "./job-position-form";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useJobPositionList } from "../../hooks/use-job-position-list";

export function JobPositionList() {
  const { state, actions, data, permissions, translations } = useJobPositionList();
  const { t } = translations;

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("jobPosition.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("jobPosition.description")}
          </p>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("common.create")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.description_field")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && <TableHead className="w-[100px]">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : data.jobPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions.canUpdate || permissions.canDelete ? 4 : 3} className="h-24 text-center">
                  {t("jobPosition.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.jobPositions.map((jobPosition) => (
                <TableRow key={jobPosition.id}>
                  <TableCell className="font-medium">{jobPosition.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {jobPosition.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {/* Appended fix mapping identical to divisions bug */}
                      <Switch
                        checked={jobPosition.is_active}
                        onCheckedChange={() => actions.handleStatusChange(jobPosition.id, jobPosition.is_active, jobPosition.name)}
                        disabled={data.isUpdating || !permissions.canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {jobPosition.is_active ? t("common.active") : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.canUpdate && (
                            <DropdownMenuItem onClick={() => actions.handleEdit(jobPosition)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem onClick={() => actions.setDeletingId(jobPosition.id)} className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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
        <JobPositionForm
          open={state.isFormOpen}
          onClose={actions.handleFormClose}
          jobPosition={state.editingJobPosition}
        />
      )}

      {/* Delete Dialog */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deletingId}
          onOpenChange={(open) => !open && actions.setDeletingId(null)}
          onConfirm={actions.handleDelete}
          isLoading={data.isDeleting}
          title={t("jobPosition.deleteTitle")}
          description={t("jobPosition.deleteConfirm")}
        />
      )}
    </div>
  );
}
