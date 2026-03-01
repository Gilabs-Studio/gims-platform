"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Printer,
  Receipt,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";

import type { SupplierInvoiceDPDetail } from "../types";
import {
  useApproveSupplierInvoiceDP,
  useCancelSupplierInvoiceDP,
  useDeleteSupplierInvoiceDP,
  usePendingSupplierInvoiceDP,
  useRejectSupplierInvoiceDP,
  useSubmitSupplierInvoiceDP,
  useSupplierInvoiceDP,
  useSupplierInvoiceDPAuditTrail,
} from "../hooks/use-supplier-invoice-dp";
import { SupplierInvoiceDownPaymentStatusBadge } from "./supplier-invoice-down-payment-status-badge";
import { SupplierInvoiceDPPrintDialog } from "./supplier-invoice-dp-print-dialog";
import { PurchaseOrderDetail } from "../../orders/components/purchase-order-detail";
import { SupplierInvoiceDetail } from "../../supplier-invoices/components/supplier-invoice-detail";

// ─── Audit Trail tab ──────────────────────────────────────────────────────────

function AuditTrailTab({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("supplierInvoiceDP");
  const { data, isLoading } = useSupplierInvoiceDPAuditTrail(invoiceId, {
    page: 1,
    per_page: 50,
  });
  const entries = data?.data ?? [];

  if (isLoading) return <Skeleton className="h-32 w-full mt-4" />;
  if (entries.length === 0)
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {t("auditTrail.empty")}
      </p>
    );

  return (
    <div className="rounded-md border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("auditTrail.columns.action")}</TableHead>
            <TableHead>{t("auditTrail.columns.user")}</TableHead>
            <TableHead>{t("auditTrail.columns.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.action}</TableCell>
              <TableCell>
                {entry.user?.name ?? entry.user?.email ?? "-"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {entry.created_at ? formatDate(entry.created_at) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Invoice detail view ──────────────────────────────────────────────────────

function SupplierInvoiceDPDetailView({
  data,
  onClose,
}: {
  data: SupplierInvoiceDPDetail;
  onClose: () => void;
}) {
  const t = useTranslations("supplierInvoiceDP");
  const tCommon = useTranslations("common");

  const canSubmit = useUserPermission("supplier_invoice_dp.submit");
  const canApprove = useUserPermission("supplier_invoice_dp.approve");
  const canReject = useUserPermission("supplier_invoice_dp.reject");
  const canCancel = useUserPermission("supplier_invoice_dp.cancel");
  const canPending = useUserPermission("supplier_invoice_dp.pending");
  const canDelete = useUserPermission("supplier_invoice_dp.delete");
  const canPrint = useUserPermission("supplier_invoice_dp.print");
  const canViewSupplier = useUserPermission("supplier.read");
  const canViewPO = useUserPermission("purchase_order.read");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [isPOOpen, setIsPOOpen] = useState(false);
  const [selectedRegularInvoiceId, setSelectedRegularInvoiceId] = useState<string | null>(null);
  const [isRegularInvoiceOpen, setIsRegularInvoiceOpen] = useState(false);

  const submitMutation = useSubmitSupplierInvoiceDP();
  const approveMutation = useApproveSupplierInvoiceDP();
  const rejectMutation = useRejectSupplierInvoiceDP();
  const cancelMutation = useCancelSupplierInvoiceDP();
  const pendingMutation = usePendingSupplierInvoiceDP();
  const deleteMutation = useDeleteSupplierInvoiceDP();

  const st = (data.status ?? "").toLowerCase();
  const isSettled = st === "paid" || st === "cancelled" || st === "rejected";

  const dueDateColorClass = (() => {
    if (isSettled || !data.due_date) return "font-medium text-foreground";
    const due = new Date(data.due_date);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (diff < 0) return "font-semibold text-destructive";
    if (diff <= 7) return "font-semibold text-amber-500";
    return "font-medium text-foreground";
  })();

  const dueDateUrgency = (() => {
    if (isSettled || !data.due_date) return null;
    const due = new Date(data.due_date);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (diff < 0)
      return (
        <span className="ml-1.5 inline-flex items-center gap-0.5 text-destructive text-xs font-semibold">
          <AlertTriangle className="h-3 w-3" />
          {Math.abs(diff)}d overdue
        </span>
      );
    if (diff === 0)
      return <span className="ml-1.5 text-amber-500 text-xs font-semibold">· Due today</span>;
    if (diff <= 7)
      return <span className="ml-1.5 text-amber-500 text-xs font-medium">· {diff}d left</span>;
    return null;
  })();

  return (
    <>
      <Tabs defaultValue="invoice" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="invoice">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Invoice
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {t("auditTrail.title")}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 flex-wrap">
            {canSubmit && st === "draft" && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-blue-600 border-blue-600 hover:bg-blue-50"
                disabled={submitMutation.isPending}
                onClick={async () => {
                  try {
                    await submitMutation.mutateAsync(data.id);
                    toast.success(t("toast.submitted"));
                  } catch {
                    toast.error(t("toast.failed"));
                  }
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.submit")}
              </Button>
            )}

            {canApprove && st === "submitted" && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-green-600 border-green-600 hover:bg-green-50"
                disabled={approveMutation.isPending}
                onClick={async () => {
                  try {
                    await approveMutation.mutateAsync(data.id);
                    toast.success(t("toast.approved"));
                  } catch {
                    toast.error(t("toast.failed"));
                  }
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.approve")}
              </Button>
            )}

            {canReject && st === "submitted" && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-destructive border-destructive hover:bg-destructive/10"
                disabled={rejectMutation.isPending}
                onClick={async () => {
                  try {
                    await rejectMutation.mutateAsync(data.id);
                    toast.success(t("toast.rejected"));
                  } catch {
                    toast.error(t("toast.failed"));
                  }
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.reject")}
              </Button>
            )}

            {canPending && st === "approved" && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-green-600 border-green-600 hover:bg-green-50"
                disabled={pendingMutation.isPending}
                onClick={async () => {
                  try {
                    await pendingMutation.mutateAsync(data.id);
                    toast.success(t("toast.pending"));
                  } catch {
                    toast.error(t("toast.failed"));
                  }
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.pending")}
              </Button>
            )}

            {canCancel && (st === "draft" || st === "submitted" || st === "approved") && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-destructive border-destructive hover:bg-destructive/10"
                disabled={cancelMutation.isPending}
                onClick={async () => {
                  try {
                    await cancelMutation.mutateAsync(data.id);
                    toast.success(t("toast.cancelled"));
                  } catch {
                    toast.error(t("toast.failed"));
                  }
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.cancel")}
              </Button>
            )}

            {canPrint && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-violet-600 border-violet-600 hover:bg-violet-50"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.print")}
              </Button>
            )}

            {canDelete && st === "draft" && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {tCommon("delete")}
              </Button>
            )}
          </div>
        </div>

        {/* ── Invoice tab ─────────────────────────────────────────── */}
        <TabsContent value="invoice" className="space-y-6">

          {/* Header block */}
          <div className="flex items-start justify-between gap-4 p-5 bg-muted/30 rounded-xl border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="font-mono font-bold text-lg">{data.code}</span>
                <SupplierInvoiceDownPaymentStatusBadge status={data.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.invoice_number && (
                  <span className="font-medium text-foreground">
                    {data.invoice_number} &bull;{" "}
                  </span>
                )}
                {t("fields.dueDate")}:{" "}
                <span className={dueDateColorClass}>
                  {formatDate(data.due_date)}
                </span>
                {dueDateUrgency}
              </p>
            </div>
            <div className="text-right text-sm space-y-1">
              <div className="text-muted-foreground">{t("fields.invoiceDate")}</div>
              <div className="font-semibold text-base">{formatDate(data.invoice_date)}</div>
            </div>
          </div>

          {/* Bill From + Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Bill From</h4>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold">
                  {canViewSupplier && data.supplier_id ? (
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer text-left font-semibold"
                      onClick={() => {
                        setSelectedSupplierId(data.supplier_id);
                        setIsSupplierOpen(true);
                      }}
                    >
                      {data.supplier_name || "-"}
                    </button>
                  ) : (
                    <span>{data.supplier_name || "-"}</span>
                  )}
                </div>
                {data.purchase_order && (
                  <div className="text-muted-foreground">
                    {t("fields.purchaseOrder")}:{" "}
                    {canViewPO ? (
                      <button
                        type="button"
                        className="font-mono font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedPOId(data.purchase_order!.id);
                          setIsPOOpen(true);
                        }}
                      >
                        {data.purchase_order.code}
                      </button>
                    ) : (
                      <span className="font-mono font-medium text-foreground">
                        {data.purchase_order.code}
                      </span>
                    )}
                  </div>
                )}
                {data.regular_invoices && data.regular_invoices.length > 0 && (
                  <div className="text-muted-foreground">
                    Regular Invoice(s):{" "}
                    <span className="flex flex-wrap gap-1 mt-0.5">
                      {data.regular_invoices.map((reg) => (
                        <button
                          key={reg.id}
                          type="button"
                          className="font-mono text-primary hover:underline cursor-pointer text-xs"
                          onClick={() => {
                            setSelectedRegularInvoiceId(reg.id);
                            setIsRegularInvoiceOpen(true);
                          }}
                        >
                          {reg.code}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Invoice Details</h4>
              </div>
              <div className="space-y-1.5 text-sm">
                {data.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">{formatDate(data.submitted_at)}</span>
                  </div>
                )}
                {data.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-medium">{formatDate(data.approved_at)}</span>
                  </div>
                )}
                {data.rejected_at && (
                  <div className="flex justify-between text-destructive">
                    <span>Rejected</span>
                    <span className="font-medium">{formatDate(data.rejected_at)}</span>
                  </div>
                )}
                {data.cancelled_at && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cancelled</span>
                    <span className="font-medium">{formatDate(data.cancelled_at)}</span>
                  </div>
                )}
                {!data.submitted_at &&
                  !data.approved_at &&
                  !data.rejected_at &&
                  !data.cancelled_at && (
                    <span className="text-muted-foreground text-xs">No workflow activity yet</span>
                  )}
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm rounded-lg border overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-muted/50 font-bold">
                <span className="text-sm">{t("fields.amount")}</span>
                <span className="font-mono text-lg">{formatCurrency(data.amount)}</span>
              </div>
              {(st === "unpaid" || st === "partial" || st === "paid") && (
                <>
                  <div className="flex justify-between items-center px-4 py-2.5 border-t text-emerald-600">
                    <span className="text-sm">Paid</span>
                    <span className="text-sm font-mono">{formatCurrency(data.paid_amount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 border-t font-bold">
                    <span className="text-sm">Remaining</span>
                    <span className="font-mono text-primary">{formatCurrency(data.remaining_amount ?? 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {t("fields.notes")}:{" "}
                </span>
                {data.notes}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Audit Trail tab ──────────────────────────────────────── */}
        <TabsContent value="audit">
          <AuditTrailTab invoiceId={data.id} />
        </TabsContent>
      </Tabs>

      {/* Print dialog */}
      {printOpen && (
        <SupplierInvoiceDPPrintDialog
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          invoiceId={data.id}
        />
      )}

      {/* Supplier detail */}
      {isSupplierOpen && selectedSupplierId && (
        <SupplierDetailModal
          open={isSupplierOpen}
          onOpenChange={(v) => {
            setIsSupplierOpen(v);
            if (!v) setSelectedSupplierId(null);
          }}
          supplierId={selectedSupplierId}
        />
      )}

      {/* Purchase order detail */}
      {isPOOpen && (
        <PurchaseOrderDetail
          open={isPOOpen}
          onClose={() => {
            setIsPOOpen(false);
            setSelectedPOId(null);
          }}
          purchaseOrderId={selectedPOId}
        />
      )}

      {/* Regular invoice detail */}
      {isRegularInvoiceOpen && selectedRegularInvoiceId && (
        <SupplierInvoiceDetail
          open={isRegularInvoiceOpen}
          invoiceId={selectedRegularInvoiceId}
          onClose={() => {
            setIsRegularInvoiceOpen(false);
            setSelectedRegularInvoiceId(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName="supplier invoice down payment"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(data.id);
            toast.success(t("toast.deleted"));
            setDeleteOpen(false);
            onClose();
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

// ─── Dialog wrapper ───────────────────────────────────────────────────────────

interface SupplierInvoiceDPDetailModalProps {
  readonly id: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function SupplierInvoiceDPDetailModal({
  id,
  open,
  onOpenChange,
}: SupplierInvoiceDPDetailModalProps) {
  const t = useTranslations("supplierInvoiceDP");
  const { data, isLoading, isError } = useSupplierInvoiceDP(id, {
    enabled: open && !!id,
  });

  const detail = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">
              {detail?.invoice_number ?? t("detail.title")}
            </DialogTitle>
            {detail && (
              <SupplierInvoiceDownPaymentStatusBadge status={detail.status} />
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <SupplierInvoiceDPDetailView
            data={detail}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
