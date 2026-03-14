"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import { CurrencyFormDialog } from "./currency-form-dialog";
import { useCurrencies, useDeleteCurrency, useUpdateCurrency } from "../hooks/use-currencies";
import type { Currency } from "../types";

export function CurrencyList() {
  const t = useTranslations("currency");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("currency.create");
  const canUpdate = useUserPermission("currency.update");
  const canDelete = useUserPermission("currency.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Currency | null>(null);
  const [deleteItem, setDeleteItem] = useState<Currency | null>(null);

  const { data, isLoading, isError, refetch } = useCurrencies({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "code",
    sort_dir: "asc",
  });

  const updateMutation = useUpdateCurrency();
  const deleteMutation = useDeleteCurrency();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => refetch()} className="mt-4 ml-2 cursor-pointer">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("form.code")}</TableHead>
              <TableHead>{t("form.name")}</TableHead>
              <TableHead>{t("form.symbol")}</TableHead>
              <TableHead>{t("form.decimalPlaces")}</TableHead>
              <TableHead>{t("form.isActive")}</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  {(canUpdate || canDelete) && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canUpdate || canDelete ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.symbol || "-"}</TableCell>
                  <TableCell>{item.decimal_places}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={async () => {
                          if (!canUpdate) return;
                          try {
                            await updateMutation.mutateAsync({
                              id: item.id,
                              data: {
                                code: item.code,
                                name: item.name,
                                symbol: item.symbol,
                                decimal_places: item.decimal_places,
                                is_active: !item.is_active,
                              },
                            });
                            toast.success(t("updated"));
                          } catch {
                            toast.error(tCommon("error"));
                          }
                        }}
                        disabled={!canUpdate || updateMutation.isPending}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{item.is_active ? tCommon("active") : tCommon("inactive")}</span>
                    </div>
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setDialogOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && canDelete && <DropdownMenuSeparator />}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => setDeleteItem(item)} className="cursor-pointer text-destructive focus:text-destructive">
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

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      )}

      <CurrencyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editingItem={editingItem} />

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        onConfirm={async () => {
          if (!deleteItem) return;
          try {
            await deleteMutation.mutateAsync(deleteItem.id);
            toast.success(t("deleted"));
            setDeleteItem(null);
          } catch {
            toast.error(tCommon("error"));
          }
        }}
        itemName="currency"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}