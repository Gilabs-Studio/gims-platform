"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
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
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useWarehouses,
  useDeleteWarehouse,
} from "../../hooks/use-warehouses";
import type { Warehouse } from "../../types";
import { WarehouseDialog } from "./warehouse-dialog";
import { WarehouseDetailModal } from "./warehouse-detail-modal";

export function WarehouseList() {
  const t = useTranslations("warehouse");
  // tCommon alias for backward compatibility
  const tCommon = useTranslations("warehouse");
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Warehouse | null>(null);
  const [detailItem, setDetailItem] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useWarehouses({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteWarehouse();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Warehouse) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: Warehouse) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("warehouse.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete warehouse");
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.noData")}
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="mt-4 ml-2 cursor-pointer"
        >
          Retry
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
        <Button onClick={handleCreate} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("common.create")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
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
              <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("warehouse.empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">
                    {item.name}
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem
                          onClick={() => handleViewDetail(item)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => handleEdit(item)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          onClick={() => setDeleteId(item.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
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

      {/* Dialogs */}
      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

       <WarehouseDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        warehouse={detailItem}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="warehouse"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
