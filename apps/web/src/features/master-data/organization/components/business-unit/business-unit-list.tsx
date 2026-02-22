"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { BusinessUnitForm } from "./business-unit-form";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useBusinessUnitList } from "../../hooks/use-business-unit-list";

export function BusinessUnitList() {
  const { state, actions, data, permissions, translations } = useBusinessUnitList();
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
            {t("businessUnit.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("businessUnit.description")}
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
            ) : data.businessUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions.canUpdate || permissions.canDelete ? 4 : 3} className="h-24 text-center">
                  {t("businessUnit.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.businessUnits.map((businessUnit) => (
                <TableRow key={businessUnit.id}>
                  <TableCell className="font-medium">{businessUnit.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {businessUnit.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={businessUnit.is_active}
                        onCheckedChange={() => actions.handleStatusChange(businessUnit.id, businessUnit.is_active, businessUnit.name)}
                        disabled={data.isUpdating || !permissions.canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {businessUnit.is_active ? t("common.active") : t("common.inactive")}
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
                            <DropdownMenuItem onClick={() => actions.handleEdit(businessUnit)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem onClick={() => actions.setDeletingId(businessUnit.id)} className="cursor-pointer text-destructive focus:text-destructive">
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
        <BusinessUnitForm
          open={state.isFormOpen}
          onClose={actions.handleFormClose}
          businessUnit={state.editingBusinessUnit}
        />
      )}

      {/* Delete Dialog */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deletingId}
          onOpenChange={(open) => !open && actions.setDeletingId(null)}
          onConfirm={actions.handleDelete}
          isLoading={data.isDeleting}
          title={t("businessUnit.deleteTitle")}
          description={t("businessUnit.deleteConfirm")}
        />
      )}
    </div>
  );
}
