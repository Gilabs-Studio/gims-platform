"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Eye,
  History,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useConfirmPurchasePayment,
  useDeletePurchasePayment,
  usePurchasePayments,
} from "../hooks/use-purchase-payments";
import type { PurchasePaymentListItem } from "../types";
import { purchasePaymentsService } from "../services/purchase-payments-service";
import { PurchasePaymentForm } from "./purchase-payment-form";
import { PurchasePaymentDetail } from "./purchase-payment-detail";
import { PurchasePaymentAuditTrail } from "./purchase-payment-audit-trail";
import { PurchasePaymentStatusBadge } from "./purchase-payment-status-badge";
import { PurchasePaymentPrintDialog } from "./purchase-payment-print-dialog";

export function PurchasePaymentsList() {
  const t = useTranslations("purchasePayment");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [deletingItem, setDeletingItem] = useState<PurchasePaymentListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const canCreate = useUserPermission("purchase_payment.create");
  const canDelete = useUserPermission("purchase_payment.delete");
  const canConfirm = useUserPermission("purchase_payment.confirm");
  const canExport = useUserPermission("purchase_payment.export");
  const canAuditTrail = useUserPermission("purchase_payment.read");
  const canView = useUserPermission("purchase_payment.read");
  const canPrint = useUserPermission("purchase_payment.print");

  const { data, isLoading, isError } = usePurchasePayments({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: PurchasePaymentListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeletePurchasePayment();
  const confirmMutation = useConfirmPurchasePayment();

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

  const handleExport = async () => {
    try {
      const blob = await purchasePaymentsService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "purchase_payments.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
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
          <Button
            variant="outline"
            onClick={handleExport}
            className="cursor-pointer"
          >
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t("fields.invoice")}</TableHead>
              <TableHead>{t("fields.bankAccount")}</TableHead>
              <TableHead>{t("fields.paymentDate")}</TableHead>
              <TableHead>{t("fields.method")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{t("fields.amount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = (item.status ?? "").toUpperCase();
                const isPending = status === "PENDING";

                return (
                  <TableRow key={item.id}>
                    <TableCell
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => canView && handleView(item.id)}
                    >
                      {item.invoice?.code}{" "}
                      {item.invoice?.invoice_number ? `(${item.invoice?.invoice_number})` : ""}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.bank_account?.name ?? "-"}
                    </TableCell>
                    <TableCell>{formatDate(item.payment_date)}</TableCell>
                    <TableCell className="capitalize">
                      {(item.method ?? "").toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <PurchasePaymentStatusBadge status={item.status ?? ""} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      {(canView || canAuditTrail || canConfirm || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem
                                onClick={() => handleView(item.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.view")}
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
                                className="cursor-pointer text-success focus:text-success"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.confirm")}
                              </DropdownMenuItem>
                            )}

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

                            {canPrint && (
                              <DropdownMenuItem
                                onClick={() => setPrintingId(item.id)}
                                className="cursor-pointer text-purple focus:text-purple"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && isPending && (
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="cursor-pointer text-destructive focus:text-destructive"
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

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(v) => {
            setPageSize(v);
            setPage(1);
          }}
        />
      )}

      <PurchasePaymentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
        }}
      />

      <PurchasePaymentDetail
        open={detailOpen}
        paymentId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      <PurchasePaymentAuditTrail
        open={auditOpen}
        paymentId={detailId || auditId}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
      />

      {printingId && (
        <PurchasePaymentPrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          paymentId={printingId}
        />
      )}

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(v) => !v && setDeletingItem(null)}
        itemName={tCommon("purchasePayment") || "purchase payment"}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
            toast.success(t("toast.deleted"));
          } catch {
            toast.error(t("toast.failed"));
          } finally {
            setDeletingItem(null);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
