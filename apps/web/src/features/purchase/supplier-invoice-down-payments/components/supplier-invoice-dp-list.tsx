"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { useExportProgress } from "@/lib/use-export-progress";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useApproveSupplierInvoiceDP,
  useCancelSupplierInvoiceDP,
  useDeleteSupplierInvoiceDP,
  usePendingSupplierInvoiceDP,
  useRejectSupplierInvoiceDP,
  useSubmitSupplierInvoiceDP,
  useSupplierInvoiceDPs,
} from "../hooks/use-supplier-invoice-dp";
import { PurchaseOrderDetail } from "../../orders/components/purchase-order-detail";
import { SupplierInvoiceDetail } from "../../supplier-invoices/components/supplier-invoice-detail";
import type { SupplierInvoiceDPListItem } from "../types";
import { SupplierInvoiceDownPaymentStatusBadge } from "./supplier-invoice-down-payment-status-badge";
import { SupplierInvoiceDPPrintDialog } from "./supplier-invoice-dp-print-dialog";
import { SupplierInvoiceDPDetailModal } from "./supplier-invoice-dp-detail-modal";
import { PurchasePaymentsLinkedDialog } from "@/features/purchase/payments/components/purchase-payments-linked-dialog";

const SupplierInvoiceDPFormDialog = dynamic(
  () => import("./supplier-invoice-dp-form").then((m) => m.SupplierInvoiceDPFormDialog),
  { ssr: false },
);

function getInitialOpenSupplierInvoiceDPFromURL(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("open_supplier_invoice_dp");
}

// ─── Due Date Cell ────────────────────────────────────────────────────────────

function DueDateCell({ dueDate, status }: { dueDate: string; status: string }) {
  const st = (status ?? "").toLowerCase();
  const isSettled = st === "paid" || st === "cancelled" || st === "rejected";
  const formatted = formatDate(dueDate);

  if (!dueDate) return <span className="text-sm text-muted-foreground">—</span>;
  if (isSettled) return <span className="text-sm text-muted-foreground">{formatted}</span>;

  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <div className="space-y-0.5">
        <span className="text-xs text-muted-foreground">{formatted}</span>
        <div className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="text-xs font-semibold">{Math.abs(diffDays)}d overdue</span>
        </div>
      </div>
    );
  }
  if (diffDays === 0) {
    return (
      <div className="space-y-0.5">
        <span className="text-xs text-muted-foreground">{formatted}</span>
        <span className="text-xs font-semibold text-warning">Due today</span>
      </div>
    );
  }
  if (diffDays <= 7) {
    return (
      <div className="space-y-0.5">
        <span className="text-xs text-muted-foreground">{formatted}</span>
        <span className="text-xs font-medium text-warning">{diffDays}d left</span>
      </div>
    );
  }
  return <span className="text-sm">{formatted}</span>;
}

export function SupplierInvoiceDPList() {
  const t = useTranslations("supplierInvoiceDP");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(getInitialOpenSupplierInvoiceDPFromURL);

  const [deletingRow, setDeletingRow] = useState<SupplierInvoiceDPListItem | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
  const [selectedInvoiceForPayments, setSelectedInvoiceForPayments] = useState<{ id: string; code: string } | null>(null);

  const isPaymentStatus = (status?: string): boolean => {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "waiting_payment" || normalized === "paid" || normalized === "partial" || normalized === "unpaid";
  };

  const [isRegularInvoiceOpen, setIsRegularInvoiceOpen] = useState(false);
  const [selectedRegularInvoiceId, setSelectedRegularInvoiceId] = useState<string | null>(null);

  const [isPOOpen, setIsPOOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      sort_by: "created_at",
      sort_dir: "desc",
    }),
    [page, pageSize, debouncedSearch],
  );

  const { data, isLoading, isError } = useSupplierInvoiceDPs(listParams);

  const deleteMutation = useDeleteSupplierInvoiceDP();
  const pendingMutation = usePendingSupplierInvoiceDP();
  const submitMutation = useSubmitSupplierInvoiceDP();
  const approveMutation = useApproveSupplierInvoiceDP();
  const rejectMutation = useRejectSupplierInvoiceDP();
  const cancelMutation = useCancelSupplierInvoiceDP();

  useEffect(() => {
    if (detailId) {
      setDetailOpen(true);
    }
  }, [detailId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.get("open_supplier_invoice_dp")) return;

    searchParams.delete("open_supplier_invoice_dp");
    const nextQuery = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextURL);
  }, []);

  const canCreate = useUserPermission("supplier_invoice_dp.create");
  const canUpdate = useUserPermission("supplier_invoice_dp.update");
  const canDelete = useUserPermission("supplier_invoice_dp.delete");
  const canPending = useUserPermission("supplier_invoice_dp.pending");
  const canSubmit = useUserPermission("supplier_invoice_dp.submit");
  const canApprove = useUserPermission("supplier_invoice_dp.approve");
  const canReject = useUserPermission("supplier_invoice_dp.reject");
  const canCancel = useUserPermission("supplier_invoice_dp.cancel");
  const canExport = useUserPermission("supplier_invoice_dp.export");
  const canView = useUserPermission("supplier_invoice_dp.read");
  const canPrint = useUserPermission("supplier_invoice_dp.print");
  const canViewPO = useUserPermission("purchase_order.read");
  const exportProgress = useExportProgress();

  async function handleExport() {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/purchase/supplier-invoice-down-payments/export",
        params: listParams,
      });
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const canShowActions =
    canUpdate || canPending || canSubmit || canApprove || canReject || canCancel || canDelete || canView || canPrint;

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
    );
  }

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
              setEditId(undefined);
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
              <TableHead className="w-[180px]">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.regularInvoice")}</TableHead>
              <TableHead>{t("columns.invoiceDate")}</TableHead>
              <TableHead>{t("columns.dueDate")}</TableHead>
              <TableHead>{t("columns.purchaseOrder")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              {canShowActions && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  {canShowActions && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canShowActions ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const st = (row.status ?? "").toLowerCase();
                return (
                  <TableRow key={row.id}>
                    <TableCell
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => canView && handleView(row.id)}
                    >
                      {row.code}
                    </TableCell>
                    <TableCell>
                      {row.regular_invoices && row.regular_invoices.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {row.regular_invoices.map((reg) => (
                            <span
                              key={reg.id}
                              className="text-xs font-mono font-medium text-primary hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRegularInvoiceId(reg.id);
                                setIsRegularInvoiceOpen(true);
                              }}
                            >
                              {reg.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.invoice_date)}</TableCell>
                    <TableCell>
                      <DueDateCell dueDate={row.due_date} status={row.status} />
                    </TableCell>
                    <TableCell>
                      {row.purchase_order ? (
                        canViewPO ? (
                          <span
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPOId(row.purchase_order!.id);
                              setIsPOOpen(true);
                            }}
                          >
                            {row.purchase_order.code}
                          </span>
                        ) : (
                          <span className="font-medium">{row.purchase_order.code}</span>
                        )
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                    <TableCell>
                      {(() => {
                        const clickable = isPaymentStatus(row.status);
                        if (!clickable) {
                          return <SupplierInvoiceDownPaymentStatusBadge status={row.status} />;
                        }
                        return (
                          <button
                            type="button"
                            className="inline-flex items-center cursor-pointer"
                            title={t("common.view")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoiceForPayments({ id: row.id, code: (row.invoice_number || row.code) ?? "" });
                              setIsPaymentDetailOpen(true);
                            }}
                          >
                            <SupplierInvoiceDownPaymentStatusBadge status={row.status} />
                          </button>
                        );
                      })()}
                    </TableCell>
                    {canShowActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleView(row.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.view")}
                              </DropdownMenuItem>
                            )}

                            {canUpdate && st === "draft" && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setEditId(row.id);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                            )}

                            {canSubmit && st === "draft" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-primary focus:text-primary"
                                onClick={async () => {
                                  try {
                                    await submitMutation.mutateAsync(row.id);
                                    toast.success(t("toast.submitted"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {t("actions.submit")}
                              </DropdownMenuItem>
                            )}

                            {canApprove && st === "submitted" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-success focus:text-success"
                                onClick={async () => {
                                  try {
                                    await approveMutation.mutateAsync(row.id);
                                    toast.success(t("toast.approved"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.approve")}
                              </DropdownMenuItem>
                            )}

                            {canReject && st === "submitted" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={async () => {
                                  try {
                                    await rejectMutation.mutateAsync(row.id);
                                    toast.success(t("toast.rejected"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.reject")}
                              </DropdownMenuItem>
                            )}

                            {canPending && st === "approved" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-success focus:text-success"
                                onClick={async () => {
                                  try {
                                    await pendingMutation.mutateAsync(row.id);
                                    toast.success(t("toast.pending"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.pending")}
                              </DropdownMenuItem>
                            )}

                            {canCancel && (st === "draft" || st === "submitted" || st === "approved" || st === "unpaid") && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={async () => {
                                  try {
                                    await cancelMutation.mutateAsync(row.id);
                                    toast.success(t("toast.cancelled"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.cancel")}
                              </DropdownMenuItem>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                className="cursor-pointer text-purple focus:text-purple"
                                onClick={() => setPrintingId(row.id)}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && st === "draft" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeletingRow(row)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
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
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <SupplierInvoiceDPFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoiceId={editId}
      />

      {detailId && (
        <SupplierInvoiceDPDetailModal
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v);
            if (!v) setDetailId(null);
          }}
          id={detailId}
        />
      )}

      <SupplierInvoiceDetail
        open={isRegularInvoiceOpen}
        invoiceId={selectedRegularInvoiceId}
        onClose={() => {
          setIsRegularInvoiceOpen(false);
          setSelectedRegularInvoiceId(null);
        }}
      />

      <PurchaseOrderDetail
        open={isPOOpen}
        onClose={() => {
          setIsPOOpen(false);
          setSelectedPOId(null);
        }}
        purchaseOrderId={selectedPOId}
      />

      {printingId && (
        <SupplierInvoiceDPPrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          invoiceId={printingId}
        />
      )}

      {isPaymentDetailOpen && selectedInvoiceForPayments && (
        <PurchasePaymentsLinkedDialog
          open={isPaymentDetailOpen}
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) {
              setIsPaymentDetailOpen(false);
              setSelectedInvoiceForPayments(null);
            }
          }}
          invoiceId={selectedInvoiceForPayments.id}
          invoiceCode={selectedInvoiceForPayments.code}
        />
      )}

      <DeleteDialog
        open={!!deletingRow}
        onOpenChange={(v) => !v && setDeletingRow(null)}
        itemName={tCommon("supplierInvoiceDP") || "supplier invoice down payment"}
        onConfirm={async () => {
          if (!deletingRow) return;
          try {
            await deleteMutation.mutateAsync(deletingRow.id);
            toast.success(t("toast.deleted"));
          } catch {
            toast.error(t("toast.failed"));
          } finally {
            setDeletingRow(null);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
