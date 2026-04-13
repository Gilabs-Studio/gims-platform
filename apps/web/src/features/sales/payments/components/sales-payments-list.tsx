"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Printer,
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
import { useExportProgress } from "@/lib/use-export-progress";
import { SalesPaymentPrintDialog } from "./sales-payment-print-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

import {
  useConfirmSalesPayment,
  useDeleteSalesPayment,
  useSalesPayments,
} from "../hooks/use-sales-payments";
import type { SalesPaymentListItem } from "../types";
import { SalesPaymentForm } from "./sales-payment-form";
import { SalesPaymentDetail } from "./sales-payment-detail";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value) || value;
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
  const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);

  const canCreate = useUserPermission("sales_payment.create");
  const canDelete = useUserPermission("sales_payment.delete");
  const canConfirm = useUserPermission("sales_payment.confirm");
  const canExport = useUserPermission("sales_payment.export");
  const canView = useUserPermission("sales_payment.read");
  const canPrint = useUserPermission("sales_payment.print");

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
  const exportProgress = useExportProgress();

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/sales/payments/export",
        params: {
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 100,
        },
      });
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
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
        {canExport && (
          <Button variant="outline" onClick={handleExport} disabled={exportProgress.isExporting} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {exportProgress.label(t("actions.export"))}
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
              <TableHead className="text-right">{t("fields.tenderAmount")}</TableHead>
              <TableHead className="text-right">{t("fields.changeAmount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = (item.status ?? "").toUpperCase();
                const isConfirmed = status === "CONFIRMED";
                const isPending = !isConfirmed;
                const methodLabel = item.method?.toUpperCase() === "CASH" ? t("method.cash") : t("method.bank");
                const showBankAccount = item.method?.toUpperCase() !== "CASH";

                return (
                  <TableRow key={item.id}>
                    <TableCell
                      className={`font-medium ${canView ? "text-primary hover:underline cursor-pointer" : ""}`}
                      onClick={() => canView && handleView(item.id)}
                      role={canView ? "button" : undefined}
                      tabIndex={canView ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!canView) return;
                        if (e.key === "Enter" || e.key === " ") {
                          handleView(item.id);
                        }
                      }}
                    >
                      {item.invoice?.code} {item.invoice?.invoice_number ? `(${item.invoice?.invoice_number})` : ""}
                    </TableCell>
                    <TableCell>{showBankAccount ? (item.bank_account?.name ?? "-") : "-"}</TableCell>
                    <TableCell>{safeDate(item.payment_date)}</TableCell>
                    <TableCell className="text-xs capitalize">{methodLabel}</TableCell>
                    <TableCell>
                      {isConfirmed ? (
                        <Badge variant="success" className="text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("status.confirmed")}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs font-medium">
                          <Clock className="h-3 w-3" />
                          {t("status.pending")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.amount ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      {item.method === "CASH"
                        ? formatCurrency((item.tender_amount && item.tender_amount > 0) ? item.tender_amount : (item.amount ?? 0))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.method === "CASH"
                        ? (item.change_amount != null ? formatCurrency(item.change_amount) : "-")
                        : "-"}
                    </TableCell>
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
                                className="cursor-pointer text-success focus:text-success"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.confirm")}
                              </DropdownMenuItem>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                onClick={() => setPrintingPaymentId(item.id)}
                                className="cursor-pointer text-purple focus:text-purple"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
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

      {printingPaymentId && (
        <SalesPaymentPrintDialog
          open={!!printingPaymentId}
          onClose={() => setPrintingPaymentId(null)}
          paymentId={printingPaymentId}
        />
      )}
    </div>
  );
}
