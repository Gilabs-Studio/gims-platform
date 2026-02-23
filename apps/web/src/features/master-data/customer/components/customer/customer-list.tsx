"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { CustomerSidePanel } from "./customer-side-panel";
import { CustomerDetailModal } from "./customer-detail-modal";
import { useCustomerList } from "../../hooks/use-customer-list";

export function CustomerList() {
  const { state, actions, data, permissions, translations } = useCustomerList();
  const { t, tCommon } = translations;

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button
          variant="outline"
          onClick={() => data.refetch()}
          className={
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-[0_0_20px] focus-visible:shadow-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 gradient-primary hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 h-9 px-4 py-2 has-[>svg]:px-3 w-full cursor-pointer mt-4 ml-2"
          }
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
          <Button
            onClick={actions.handleCreate}
            className={
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-[0_0_20px] focus-visible:shadow-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 gradient-primary hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 h-9 px-4 py-2 has-[>svg]:px-3 w-full cursor-pointer"
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {tCommon("create")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search")}
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={state.typeFilter}
          onValueChange={(v) => {
            actions.setTypeFilter(v);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("form.customerType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {data.customerTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
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
              <TableHead>{t("form.code")}</TableHead>
              <TableHead>{t("form.name")}</TableHead>
              <TableHead>{t("form.customerType")}</TableHead>
              <TableHead>{t("sections.contact")}</TableHead>
              <TableHead>{tCommon("status")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete) && (
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  {(permissions.canUpdate || permissions.canDelete) && (
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={permissions.canUpdate || permissions.canDelete ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">
                    {item.name}
                    {item.address && (
                      <p className="text-xs text-muted-foreground truncate w-64">
                        {item.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{item.customer_type?.name ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{item.contact_person ?? "-"}</span>
                      <span className="text-xs text-muted-foreground">{item.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? tCommon("active") : tCommon("inactive")}
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
                            View
                          </DropdownMenuItem>

                          {permissions.canUpdate && (
                            <DropdownMenuItem
                              onClick={() => actions.handleEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                          )}

                          {permissions.canDelete && <DropdownMenuSeparator />}

                          {permissions.canDelete && (
                            <DropdownMenuItem
                              onClick={() => actions.setDeleteId(item.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {tCommon("delete")}
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

      {/* Side Panel (Create / Edit) */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <CustomerSidePanel
          isOpen={state.dialogOpen}
          onClose={actions.handleDialogClose}
          mode={state.editingItem ? "edit" : "create"}
          customer={state.editingItem}
        />
      )}

      <CustomerDetailModal
        open={state.detailOpen}
        onOpenChange={actions.setDetailOpen}
        customer={state.detailItem}
      />

      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          itemName="customer"
          isLoading={data.isDeleting}
        />
      )}
    </div>
  );
}
