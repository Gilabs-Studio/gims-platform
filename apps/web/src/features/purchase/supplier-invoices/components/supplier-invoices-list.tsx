"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useApproveSupplierInvoice,
  useCancelSupplierInvoice,
  useDeleteSupplierInvoice,
  usePendingSupplierInvoice,
  useRejectSupplierInvoice,
  useSubmitSupplierInvoice,
  useSupplierInvoices,
} from "../hooks/use-supplier-invoices";
import { supplierInvoicesService } from "../services/supplier-invoices-service";
import type { SupplierInvoiceListItem } from "../types";
import { SupplierInvoiceDetail } from "./supplier-invoice-detail";
import { SupplierInvoiceStatusBadge } from "./supplier-invoice-status-badge";
import { PurchaseOrderDetail } from "../../orders/components/purchase-order-detail";
import { SupplierInvoiceDPDetailModal } from "../../supplier-invoice-down-payments/components/supplier-invoice-dp-detail-modal";
import { SupplierInvoicePrintDialog } from "./supplier-invoice-print-dialog";

// ─── Due Date Cell ────────────────────────────────────────────────────────────

function DueDateCell({ dueDate, status }: { dueDate: string; status: string }) {
  const st = (status ?? "").toLowerCase();
  // Fully settled statuses — no urgency needed
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
        <span className="text-xs font-semibold text-amber-500">Due today</span>
      </div>
    );
  }
  if (diffDays <= 7) {
    return (
      <div className="space-y-0.5">
        <span className="text-xs text-muted-foreground">{formatted}</span>
        <span className="text-xs font-medium text-amber-500">{diffDays}d left</span>
      </div>
    );
  }
  return <span className="text-sm">{formatted}</span>;
}

const SupplierInvoiceFormDialog = dynamic(
  () => import("./supplier-invoice-form").then((m) => m.SupplierInvoiceFormDialog),
  { ssr: false },
);

const PurchasePaymentForm = dynamic(
  () => import("../../payments/components/purchase-payment-form").then((m) => m.PurchasePaymentForm),
  { ssr: false },
);

export function SupplierInvoicesList() {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [deletingRow, setDeletingRow] = useState<SupplierInvoiceListItem | null>(null);

  const [isPOOpen, setIsPOOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const [isDPOpen, setIsDPOpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);

  const [printingId, setPrintingId] = useState<string | null>(null);
  const [createPaymentForInvoiceId, setCreatePaymentForInvoiceId] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter.toUpperCase() : undefined,
      sort_by: "created_at",
      sort_dir: "desc",
    }),
    [page, pageSize, debouncedSearch, statusFilter],
  );

  const { data, isLoading, isError } = useSupplierInvoices(listParams);

  const deleteMutation = useDeleteSupplierInvoice();
  const pendingMutation = usePendingSupplierInvoice();
  const submitMutation = useSubmitSupplierInvoice();
  const approveMutation = useApproveSupplierInvoice();
  const rejectMutation = useRejectSupplierInvoice();
  const cancelMutation = useCancelSupplierInvoice();

  const canCreate = useUserPermission("supplier_invoice.create");
  const canUpdate = useUserPermission("supplier_invoice.update");
  const canDelete = useUserPermission("supplier_invoice.delete");
  const canPending = useUserPermission("supplier_invoice.pending");
  const canSubmit = useUserPermission("supplier_invoice.submit");
  const canApprove = useUserPermission("supplier_invoice.approve");
  const canReject = useUserPermission("supplier_invoice.reject");
  const canCancel = useUserPermission("supplier_invoice.cancel");
  const canExport = useUserPermission("supplier_invoice.export");
  const canView = useUserPermission("supplier_invoice.read");
  const canPrint = useUserPermission("supplier_invoice.print");

  async function handleExport() {
    try {
      const blob = await supplierInvoicesService.exportCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supplier-invoices.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
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

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("fields.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all") || "All"}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="submitted">{t("status.submitted")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
            <SelectItem value="unpaid">{t("status.unpaid")}</SelectItem>
            <SelectItem value="partial">{t("status.partial")}</SelectItem>
            <SelectItem value="paid">{t("status.paid")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {canExport && (
          <Button variant="outline" onClick={handleExport} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
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
              <TableHead className="w-[160px]">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.invoiceDate")}</TableHead>
              <TableHead>{t("columns.dueDate")}</TableHead>
              <TableHead>{t("columns.purchaseOrder")}</TableHead>
              <TableHead>{t("columns.downPayment")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              <TableHead className="text-right">{t("columns.paidAmount")}</TableHead>
              <TableHead className="text-right">{t("columns.remainingAmount")}</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  {canShowActions && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canShowActions ? 11 : 10}
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
                    <TableCell>{formatDate(row.invoice_date)}</TableCell>
                    <TableCell>
                      <DueDateCell dueDate={row.due_date} status={row.status} />
                    </TableCell>
                    <TableCell>
                      {row.purchase_order ? (
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
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.down_payment_invoice ? (
                        <span
                          className="text-xs font-mono font-medium text-primary hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDPId(row.down_payment_invoice!.id);
                            setIsDPOpen(true);
                          }}
                        >
                          {row.down_payment_invoice.code}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.supplier_name ? (
                        <span className="text-sm font-medium">{row.supplier_name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.paid_amount ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.remaining_amount ?? row.amount ?? 0)}</TableCell>
                    <TableCell>
                      <SupplierInvoiceStatusBadge status={row.status} />
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
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
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
                                className="cursor-pointer text-green-600 focus:text-green-600"
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
                                className="cursor-pointer text-green-600 focus:text-green-600"
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

                            {(st === "unpaid" || st === "partial") && (
                              <DropdownMenuItem
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                                onClick={() => setCreatePaymentForInvoiceId(row.id)}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {t("actions.createPayment")}
                              </DropdownMenuItem>
                            )}

                            {canCancel && (st === "draft" || st === "submitted" || st === "approved") && (
                              <>
                                <DropdownMenuSeparator />
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
                              </>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                className="cursor-pointer text-violet-600 focus:text-violet-600"
                                onClick={() => setPrintingId(row.id)}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && st === "draft" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                  onClick={() => setDeletingRow(row)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tCommon("delete")}
                                </DropdownMenuItem>
                              </>
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

      <SupplierInvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoiceId={editId}
      />

      <SupplierInvoiceDetail
        open={detailOpen}
        invoiceId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      {printingId && (
        <SupplierInvoicePrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          invoiceId={printingId}
        />
      )}

      {createPaymentForInvoiceId && (
        <PurchasePaymentForm
          open={!!createPaymentForInvoiceId}
          onClose={() => setCreatePaymentForInvoiceId(null)}
          defaultInvoiceId={createPaymentForInvoiceId}
        />
      )}

      <PurchaseOrderDetail
        open={isPOOpen}
        onClose={() => {
          setIsPOOpen(false);
          setSelectedPOId(null);
        }}
        purchaseOrderId={selectedPOId}
      />

      {selectedDPId && (
        <SupplierInvoiceDPDetailModal
          open={isDPOpen}
          onOpenChange={(v) => {
            setIsDPOpen(v);
            if (!v) setSelectedDPId(null);
          }}
          id={selectedDPId}
        />
      )}

      <DeleteDialog
        open={!!deletingRow}
        onOpenChange={(v) => !v && setDeletingRow(null)}
        itemName={tCommon("supplierInvoice") || "supplier invoice"}
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
