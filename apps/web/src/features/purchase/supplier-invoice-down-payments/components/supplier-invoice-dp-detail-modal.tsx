"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Printer,
  Send,
  Trash2,
  XCircle,
  CreditCard,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PurchasePaymentForm } from "@/features/purchase/payments/components/purchase-payment-form";
import { PurchasePaymentsLinkedDialog } from "@/features/purchase/payments/components/purchase-payments-linked-dialog";

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
import { AuditTrailTable } from "@/components/ui/audit-trail-table";
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

function AuditTrailTab({ invoiceId, enabled }: { invoiceId: string; enabled: boolean }) {
  const t = useTranslations("supplierInvoiceDP");
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, isError } = useSupplierInvoiceDPAuditTrail(invoiceId, {
    page,
    per_page: pageSize,
  }, { enabled });
  const entries = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <AuditTrailTable
      entries={entries}
      isLoading={isLoading && entries.length === 0}
      errorText={isError && entries.length === 0 ? tCommon("error") : undefined}
      pagination={pagination}
      onPageChange={(nextPage) => setPage(nextPage)}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
        setPage(1);
      }}
      labels={{
        empty: t("auditTrail.empty"),
        columns: {
          action: t("auditTrail.columns.action"),
          user: t("auditTrail.columns.user"),
          time: t("auditTrail.columns.time"),
          details: t("auditTrail.columns.details"),
        },
      }}
    />
  );
}

// ─── Invoice detail view ──────────────────────────────────────────────────────

function SupplierInvoiceDPDetailView({
  data,
  onClose,
  isCreatePaymentOpen,
  setIsCreatePaymentOpen,
  isEditOpen,
  setIsEditOpen,
}: {
  data: SupplierInvoiceDPDetail;
  onClose: () => void;
  isCreatePaymentOpen: boolean;
  setIsCreatePaymentOpen: (v: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (v: boolean) => void;
}) {
  const t = useTranslations("supplierInvoiceDP");
  const tCommon = useTranslations("common");

  const canSubmit = useUserPermission("supplier_invoice_dp.submit");
  const canCreatePayment = useUserPermission("purchase_payment.create");
  const canUpdate = useUserPermission("supplier_invoice_dp.update");
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

  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
  const [selectedInvoiceForPayments, setSelectedInvoiceForPayments] = useState<{ id: string; code: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"invoice" | "audit">("invoice");

  const isPaymentStatus = (status?: string): boolean => {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "waiting_payment" || normalized === "paid" || normalized === "partial" || normalized === "unpaid";
  };

  const submitMutation = useSubmitSupplierInvoiceDP();
  const approveMutation = useApproveSupplierInvoiceDP();
  const rejectMutation = useRejectSupplierInvoiceDP();
  const cancelMutation = useCancelSupplierInvoiceDP();
  const pendingMutation = usePendingSupplierInvoiceDP();
  const deleteMutation = useDeleteSupplierInvoiceDP();

  const SupplierInvoiceDPFormDialog = dynamic(
    () => import("./supplier-invoice-dp-form").then((m) => m.SupplierInvoiceDPFormDialog),
    { ssr: false },
  );

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
    if (diff <= 7) return "font-semibold text-warning";
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
      return <span className="ml-1.5 text-warning text-xs font-semibold">· Due today</span>;
    if (diff <= 7)
      return <span className="ml-1.5 text-warning text-xs font-medium">· {diff}d left</span>;
    return null;
  })();

  return (
    <>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "invoice" | "audit")} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="flex-1">
            <TabsTrigger value="invoice">{t("tabs.general") || "Invoice"}</TabsTrigger>
            <TabsTrigger value="audit">{t("tabs.auditTrail") || t("auditTrail.title")}</TabsTrigger>
          </TabsList>

          
        </div>

        {/* ── Invoice tab (mirrors customer invoice DP layout) ───────────────── */}
        <TabsContent value="invoice" className="space-y-6">
          {/* Key Information */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50 w-44">{t("columns.code")}</TableCell>
                  <TableCell className="font-mono font-semibold">{data.code}</TableCell>
                  <TableCell className="font-medium bg-muted/50 w-44">{t("fields.status")}</TableCell>
                  <TableCell>
                    {(() => {
                      const clickable = isPaymentStatus(data.status);
                      if (!clickable) {
                        return <SupplierInvoiceDownPaymentStatusBadge status={data.status} />;
                      }
                      return (
                        <button
                          type="button"
                          className="inline-flex items-center cursor-pointer"
                          title={tCommon("view")}
                          onClick={() => {
                            setSelectedInvoiceForPayments({ id: data.id, code: data.code });
                            setIsPaymentDetailOpen(true);
                          }}
                        >
                          <SupplierInvoiceDownPaymentStatusBadge status={data.status} />
                        </button>
                      );
                    })()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("fields.invoiceDate")}</TableCell>
                  <TableCell>{formatDate(data.invoice_date)}</TableCell>
                  <TableCell className="font-medium bg-muted/50">{t("fields.dueDate")}</TableCell>
                  <TableCell>
                    {data.due_date ? (
                      <span className={dueDateColorClass}>{formatDate(data.due_date)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("fields.purchaseOrder")}</TableCell>
                  <TableCell className="font-mono">
                    {canViewPO && data.purchase_order?.id ? (
                      <button
                        type="button"
                        className="font-mono text-primary underline-offset-4 hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedPOId(data.purchase_order!.id);
                          setIsPOOpen(true);
                        }}
                      >
                        {data.purchase_order?.code}
                      </button>
                    ) : (
                      data.purchase_order?.code ?? "-"
                    )}
                  </TableCell>
                  <TableCell className="font-medium bg-muted/50">Supplier</TableCell>
                  <TableCell>
                    {canViewSupplier && data.supplier_id ? (
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedSupplierId(data.supplier_id);
                          setIsSupplierOpen(true);
                        }}
                      >
                        {data.supplier_name ?? "-"}
                      </button>
                    ) : (
                      data.supplier_name ?? <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
                {data.regular_invoices && data.regular_invoices.length > 0 && (
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">Regular Invoice(s)</TableCell>
                    <TableCell className="font-mono" colSpan={3}>
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Amount Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 text-center space-y-1 bg-primary/5">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">TOTAL</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(data.amount)}</p>
            </div>
            <div className="border rounded-lg p-4 text-center space-y-1 bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">REMAINING</p>
              <p className="text-2xl font-bold font-mono">{formatCurrency(data.remaining_amount ?? data.amount ?? 0)}</p>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t("fields.notes")}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/30 p-3 border">{data.notes}</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="audit">
          <AuditTrailTab invoiceId={data.id} enabled={activeTab === "audit"} />
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

      {/* Purchase payment form (match customer flow) */}
      {data && (
        <PurchasePaymentForm
          open={isCreatePaymentOpen}
          onClose={() => setIsCreatePaymentOpen(false)}
          defaultInvoiceId={data.id}
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

      {/* Supplier invoice DP edit dialog (match customer flow) */}
      {data && (
        <SupplierInvoiceDPFormDialog
          open={isEditOpen}
          onOpenChange={(open) => { if (!open) setIsEditOpen(false); }}
          invoiceId={data.id}
          defaultPurchaseOrderId={data.purchase_order?.id}
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

  // Header actions: mirror customer modal actions (create payment, edit, submit, print, approve)
  const canCreatePayment = useUserPermission("purchase_payment.create");
  const canUpdate = useUserPermission("supplier_invoice_dp.update");
  const canSubmit = useUserPermission("supplier_invoice_dp.submit");
  const canApprove = useUserPermission("supplier_invoice_dp.approve");
  const canPrint = useUserPermission("supplier_invoice_dp.print");

  const submitMutation = useSubmitSupplierInvoiceDP();
  const approveMutation = useApproveSupplierInvoiceDP();
  const [printOpen, setPrintOpen] = useState(false);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const normalizedDetailStatus = (detail?.status ?? "").toLowerCase() === "approved"
    ? "unpaid"
    : (detail?.status ?? "").toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">
                {detail?.invoice_number ?? t("detail.title")}
              </DialogTitle>
              {detail && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {detail.invoice_date && (
                    <span className="text-sm text-muted-foreground">{formatDate(detail.invoice_date)}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {detail && canCreatePayment && (normalizedDetailStatus === "unpaid" || normalizedDetailStatus === "partial") ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreatePaymentOpen(true)}
                  className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                  title={t("actions.createPayment")}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              ) : null}

              {detail && canUpdate && (detail.status ?? "").toLowerCase() === "draft" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  className="cursor-pointer"
                  title={t("actions.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}

              {detail && canSubmit && (detail.status ?? "").toLowerCase() === "draft" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!detail?.id) return;
                    try {
                      await submitMutation.mutateAsync(detail.id);
                      toast.success(t("toast.submitted"));
                    } catch {
                      toast.error(t("toast.failed"));
                    }
                  }}
                  className="cursor-pointer text-primary hover:text-primary/80 hover:bg-primary/5"
                  title={t("actions.submit")}
                >
                  <Send className="h-4 w-4" />
                </Button>
              ) : null}

              {detail && canPrint ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPrintOpen(true)}
                  className="cursor-pointer text-purple hover:text-purple hover:bg-purple/10"
                  title={t("actions.print")}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              ) : null}

              {detail && canApprove && (detail.status ?? "").toLowerCase() === "submitted" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!detail?.id) return;
                    try {
                      await approveMutation.mutateAsync(detail.id);
                      toast.success(t("toast.approved"));
                    } catch {
                      toast.error(t("toast.failed"));
                    }
                  }}
                  className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                  title={t("actions.approve")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
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
            isCreatePaymentOpen={isCreatePaymentOpen}
            setIsCreatePaymentOpen={setIsCreatePaymentOpen}
            isEditOpen={isEditOpen}
            setIsEditOpen={setIsEditOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
