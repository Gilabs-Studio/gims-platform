"use client";

import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Switch } from "@/components/ui/switch";
import { ProductDialog } from "./product-dialog";
import { ProductDetailDialog } from "./product-detail-dialog";
import { useProductList } from "../../hooks/use-product-list";

export function ProductList() {
  const { state, actions, data, permissions, translations } = useProductList();
  const { t, tCommon } = translations;

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button
          variant="outline"
          onClick={() => data.refetch()}
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
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
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
              <TableHead className="w-[100px]">{t("form.code")}</TableHead>
              <TableHead>{t("form.name")}</TableHead>
              <TableHead>{t("form.category")}</TableHead>
              <TableHead>{t("form.brand")}</TableHead>
              <TableHead>{t("form.uom")}</TableHead>
              <TableHead>{t("form.isActive")}</TableHead>
              <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>
                    <div 
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => actions.handleView(item)}
                    >
                      {item.name}
                    </div>
                    {item.manufacturer_part_number && (
                      <div className="text-xs text-muted-foreground">
                        {item.manufacturer_part_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.category?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{item.brand?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {item.uom?.symbol ?? item.uom?.name ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() =>
                          actions.handleStatusChange(item.id, item.is_active, item.name)
                        }
                        disabled={data.isUpdating || !permissions.canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.is_active ? tCommon("active") : tCommon("inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* View Details - always available */}
                        <DropdownMenuItem
                          onClick={() => actions.handleView(item)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        {/* Edit - permission required */}
                        {permissions.canUpdate && (
                          <DropdownMenuItem
                            onClick={() => actions.handleEdit(item)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}


                        {permissions.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => actions.setDeleteId(item.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Edit Dialog */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <ProductDialog
          open={state.dialogOpen}
          onOpenChange={actions.handleDialogClose}
          editingItem={state.editingItem}
        />
      )}

      {/* View Detail Dialog */}
      <ProductDetailDialog
        open={state.detailDialogOpen}
        onOpenChange={actions.setDetailDialogOpen}
        product={state.viewingItem}
      />

      {/* Delete Dialog */}
      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          itemName="product"
          isLoading={data.isDeleting}
        />
      )}
    </div>
  );
}
