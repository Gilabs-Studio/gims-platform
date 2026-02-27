"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  History,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";

import {
  useConfirmSalesPayment,
  useDeleteSalesPayment,
  useSalesPayments,
} from "../hooks/use-sales-payments";
import type { SalesPaymentListItem } from "../types";
import { salesPaymentsService } from "../services/sales-payments-service";
import { SalesPaymentForm } from "./sales-payment-form";
import { SalesPaymentDetail } from "./sales-payment-detail";
import { SalesPaymentAuditTrail } from "./sales-payment-audit-trail";

function formatMoney(value: number | null | undefined): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safe);
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toUpperCase();
}

export function SalesPaymentsList() {
  const t = useTranslations("salesPayment");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [deletingItem, setDeletingItem] = useState<SalesPaymentListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);

  const canCreate = useUserPermission("sales_payment.create");
  const canDelete = useUserPermission("sales_payment.delete");
  const canConfirm = useUserPermission("sales_payment.confirm");
  const canExport = useUserPermission("sales_payment.export");
  const canAuditTrail = useUserPermission("sales_payment.audit_trail");
  const canView = useUserPermission("sales_payment.read");

  const { data, isLoading, isError } = useSalesPayments({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: SalesPaymentListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteSalesPayment();
  const confirmMutation = useConfirmSalesPayment();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleExport = async () => {
    try {
      const blob = await salesPaymentsService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sales_payments.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExport} className="cursor-pointer">
              <Download className="h-4 w-4 mr-2" />
              {t("actions.export")}
            </Button>
          )}

          {canCreate && (
            <Button
              onClick={() => {
                setFormOpen(true);
              }}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.create")}
            </Button>
          )}
        </div>
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
              <TableHead>{t("fields.invoice")}</TableHead>
              <TableHead>{t("fields.bankAccount")}</TableHead>
              <TableHead>{t("fields.paymentDate")}</TableHead>
              <TableHead>{t("fields.method")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{t("fields.amount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = normalizeStatus(item.status);
                const isPending = status === "PENDING";

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.invoice?.code} {item.invoice?.invoice_number ? `(${item.invoice?.invoice_number})` : ""}</TableCell>
                    <TableCell>{item.bank_account?.name ?? "-"}</TableCell>
                    <TableCell>{safeDate(item.payment_date)}</TableCell>
                    <TableCell>{item.method}</TableCell>
                    <TableCell>
                      <Badge variant={status === "CONFIRMED" ? "default" : "secondary"}>
                        {status === "CONFIRMED" ? t("status.confirmed") : t("status.pending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(item.amount)}</TableCell>
                    <TableCell className="text-right">
                      {canView && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setDetailId(item.id);
                                setDetailOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actions.view")}
                            </DropdownMenuItem>

                            {canAuditTrail && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setAuditId(item.id);
                                  setAuditOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <History className="h-4 w-4 mr-2" />
                                {t("actions.auditTrail")}
                              </DropdownMenuItem>
                            )}

                            {canConfirm && isPending && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await confirmMutation.mutateAsync(item.id);
                                    toast.success(t("toast.confirmed"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.confirm")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && isPending && (
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="cursor-pointer text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("actions.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pageIndex={page}
          pageSize={pageSize}
          rowCount={pagination.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(v) => {
            setPageSize(v);
            setPage(1);
          }}
        />
      ) : null}

      <SalesPaymentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
        }}
      />

      <SalesPaymentDetail
        open={detailOpen}
        paymentId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      <SalesPaymentAuditTrail
        open={auditOpen}
        paymentId={auditId}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
      />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(v) => {
          if (!v) setDeletingItem(null);
        }}
        title={t("actions.delete")}
        description={deletingItem ? String(deletingItem.invoice?.code || deletingItem.invoice?.invoice_number || "-") : ""}
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
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
