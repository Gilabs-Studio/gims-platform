"use client";

import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { WarehouseDialog } from "./warehouse-dialog";
import { WarehouseDetailModal } from "./warehouse-detail-modal";
import { WarehouseDeleteBlockedDialog } from "./warehouse-delete-blocked-dialog";
import { useWarehouseList } from "../../hooks/use-warehouse-list";

export function WarehouseList() {
  const { state, actions, data, permissions, translations } = useWarehouseList();
  const { t } = translations;

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.noData")}
        <Button
          variant="outline"
          onClick={() => data.refetch()}
          className="mt-4 ml-2 cursor-pointer"
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("warehouse.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("common.description")}</p>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("common.create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
              <TableHead>{t("warehouse.form.code")}</TableHead>
              <TableHead>{t("warehouse.form.name")}</TableHead>
              <TableHead>{t("warehouse.form.address")}</TableHead>
              <TableHead>{t("warehouse.form.capacity")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && <TableHead className="w-[100px]">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={permissions.canUpdate || permissions.canDelete ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("warehouse.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {item.outlet_id && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Store className="h-3 w-3" />
                          Outlet
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate w-64">
                        {item.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{item.address ?? "-"}</TableCell>
                  <TableCell>{item.capacity ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "success" : "secondary"}>
                      {item.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => actions.handleViewDetail(item)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("common.view")}
                          </DropdownMenuItem>

                          {permissions.canUpdate && (
                            <DropdownMenuItem
                              onClick={() => actions.handleEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}

                          {permissions.canDelete && <DropdownMenuSeparator />}

                          {permissions.canDelete && (
                            <DropdownMenuItem
                              onClick={() => {
                                console.log("Delete clicked for item:", item);
                                console.log("has_stock:", item.has_stock);
                                if (item.has_stock) {
                                  actions.setBlockedDeleteId(item.id);
                                } else {
                                  actions.setDeleteId(item.id);
                                }
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
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

      {/* Create / Edit Dialog */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <WarehouseDialog
          open={state.dialogOpen}
          onOpenChange={actions.handleDialogClose}
          editingItem={state.editingItem}
        />
      )}

      <WarehouseDetailModal
        open={state.detailOpen}
        onOpenChange={actions.setDetailOpen}
        warehouse={state.detailItem}
        onEdit={permissions.canUpdate ? (item) => {
          actions.setDetailOpen(false);
          actions.handleEdit(item);
        } : undefined}
      />

      {/* Normal delete (no stock) */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          title={t("warehouse.deleteTitle")}
          description={t("warehouse.deleteConfirm")}
          isLoading={data.isDeleting}
        />
      )}

      {/* Blocked delete — warehouse still has stock */}
      <WarehouseDeleteBlockedDialog
        open={!!state.blockedDeleteId}
        onOpenChange={(open: boolean) => !open && actions.setBlockedDeleteId(null)}
      />
    </div>
  );
}
