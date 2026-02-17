"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { Payment } from "../types";
import { useApproveFinancePayment, useDeleteFinancePayment, useFinancePayments } from "../hooks/use-finance-payments";
import { PaymentForm } from "./payment-form";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function PaymentsList() {
  const t = useTranslations("financePayments");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("payment.create");
  const canUpdate = useUserPermission("payment.update");
  const canDelete = useUserPermission("payment.delete");
  const canApprove = useUserPermission("payment.approve");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<Payment | null>(null);

  const { data, isLoading, isError } = useFinancePayments({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "payment_date",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteFinancePayment();
  const approveMutation = useApproveFinancePayment();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canCreate && (
          <Button
            onClick={() => {
              setFormMode("create");
              setSelectedId(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.paymentDate")}</TableHead>
              <TableHead>{t("fields.description")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{t("fields.totalAmount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{safeDate(item.payment_date)}</TableCell>
                  <TableCell>{item.description ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "posted" ? "default" : "secondary"}>
                      {t(`status.${item.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.total_amount ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setFormMode("edit");
                              setSelectedId(item.id);
                              setFormOpen(true);
                            }}
                          >
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {canApprove && item.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={async () => {
                              try {
                                await approveMutation.mutateAsync(item.id);
                                toast.success(t("toast.approved"));
                              } catch {
                                toast.error(t("toast.failed"));
                              }
                            }}
                          >
                            {t("actions.approve")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && item.status === "draft" && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setDeletingItem(item)}>
                            {t("actions.delete")}
                          </DropdownMenuItem>
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

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? items.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <PaymentForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title={t("actions.delete")}
        description=""
        onConfirm={async () => {
          const id = deletingItem?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeletingItem(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
      />
    </div>
  );
}
