"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Printer,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { QuotationProductDetailModal } from "@/features/sales/quotation/components/quotation-product-detail-modal";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";

import type { SupplierInvoiceDetail as ISupplierInvoiceDetail } from "../types";
import {
  useApproveSupplierInvoice,
  useCancelSupplierInvoice,
  useDeleteSupplierInvoice,
  usePendingSupplierInvoice,
  useRejectSupplierInvoice,
  useSubmitSupplierInvoice,
  useSupplierInvoice,
  useSupplierInvoiceAuditTrail,
} from "../hooks/use-supplier-invoices";
import { SupplierInvoiceStatusBadge } from "./supplier-invoice-status-badge";
import { SupplierInvoicePrintDialog } from "./supplier-invoice-print-dialog";

const PurchaseOrderDetail = dynamic(
  () =>
    import("../../orders/components/purchase-order-detail").then((m) => m.PurchaseOrderDetail),
  { ssr: false },
);

const GoodsReceiptDetailModal = dynamic(
  () =>
    import("../../goods-receipt/components/goods-receipt-detail").then((m) => m.GoodsReceiptDetail),
  { ssr: false },
);

const SupplierInvoiceDPDetailModal = dynamic(
  () =>
    import("../../supplier-invoice-down-payments/components/supplier-invoice-dp-detail-modal").then(
      (m) => m.SupplierInvoiceDPDetailModal,
    ),
  { ssr: false },
);

const PurchasePaymentForm = dynamic(
  () =>
    import("../../payments/components/purchase-payment-form").then((m) => m.PurchasePaymentForm),
  { ssr: false },
);

// ─── Audit Trail tab ─────────────────────────────────────────────────────────

function AuditTrailTab({ invoiceId, enabled }: { invoiceId: string; enabled: boolean }) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, isError } = useSupplierInvoiceAuditTrail(invoiceId, {
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

function SupplierInvoiceDetailView({
  data,
  onClose,
}: {
  data: ISupplierInvoiceDetail;
  onClose: () => void;
}) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");

  const canViewProduct = useUserPermission("product.read");
  const canViewSupplier = useUserPermission("supplier.read");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [isPOOpen, setIsPOOpen] = useState(false);
  const [selectedGRId, setSelectedGRId] = useState<string | null>(null);
  const [isGROpen, setIsGROpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);
  const [isDPOpen, setIsDPOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "items" | "audit">("general");

  const deleteMutation = useDeleteSupplierInvoice();

  const st = (data.status ?? "").toLowerCase();
  const dpDeduction = data.down_payment_amount ?? 0;

  return (
    <>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "general" | "items" | "audit")} className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general") || "General"}</TabsTrigger>
          <TabsTrigger value="items">{t("tabs.items") || "Items"}</TabsTrigger>
          <TabsTrigger value="audit">{t("tabs.auditTrail") || t("auditTrail.title")}</TabsTrigger>
        </TabsList>

        {/* ── General tab ───────────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6 py-4">

          {/* Invoice header block */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50 w-48">
                    {t("fields.invoiceNumber") || "Invoice No."}
                  </TableCell>
                  <TableCell>{data.invoice_number || "-"}</TableCell>
                  <TableCell className="font-medium bg-muted/50 w-48">
                    {t("fields.invoiceDate")}
                  </TableCell>
                  <TableCell>{formatDate(data.invoice_date)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("fields.dueDate")}</TableCell>
                  <TableCell>
                    <span
                      className={(() => {
                        const settled = ["paid", "cancelled", "rejected"].includes(st);
                        if (settled || !data.due_date) return "font-medium";
                        const due = new Date(data.due_date);
                        const now = new Date();
                        due.setHours(0, 0, 0, 0);
                        now.setHours(0, 0, 0, 0);
                        const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
                        if (diff < 0) return "font-semibold text-destructive";
                        if (diff <= 7) return "font-semibold text-warning";
                        return "font-medium";
                      })()}
                    >
                      {formatDate(data.due_date)}
                    </span>
                    {(() => {
                      const settled = ["paid", "cancelled", "rejected"].includes(st);
                      if (settled || !data.due_date) return null;
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
                        return (
                          <span className="ml-1.5 text-warning text-xs font-semibold">
                            · Due today
                          </span>
                        );
                      if (diff <= 7)
                        return (
                          <span className="ml-1.5 text-warning text-xs font-medium">
                            · {diff}d left
                          </span>
                        );
                      return null;
                    })()}
                  </TableCell>
                  <TableCell className="font-medium bg-muted/50">
                    {t("fields.paymentTerms")}
                  </TableCell>
                  <TableCell>{data.payment_terms?.name ?? "-"}</TableCell>
                </TableRow>
                {data.created_by && (
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">
                      {tCommon("createdBy") || "Created by"}
                    </TableCell>
                    <TableCell colSpan={3}>{data.created_by}</TableCell>
                  </TableRow>
                )}
                {data.notes && (
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50">{t("fields.notes")}</TableCell>
                    <TableCell colSpan={3}>{data.notes}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Supplier + References */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              <Building2 className="h-4 w-4 inline mr-1.5 text-muted-foreground" />
              {t("sections.supplier") || "Supplier"}
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50 w-48">
                      {t("fields.supplier") || "Supplier"}
                    </TableCell>
                    <TableCell>
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
                        <span className="font-semibold">{data.supplier_name || "-"}</span>
                      )}
                    </TableCell>
                    {data.purchase_order && (
                      <>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("fields.purchaseOrder")}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                  {(data.goods_receipt || data.down_payment_invoice) && (
                    <TableRow>
                      {data.goods_receipt && (
                        <>
                          <TableCell className="font-medium bg-muted/50">
                            {t("fields.goodsReceipt") || "Goods Receipt"}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="font-mono font-medium text-primary hover:underline cursor-pointer"
                              onClick={() => {
                                setSelectedGRId(data.goods_receipt!.id);
                                setIsGROpen(true);
                              }}
                            >
                              {data.goods_receipt.code}
                            </button>
                          </TableCell>
                        </>
                      )}
                      {data.down_payment_invoice && (
                        <>
                          <TableCell className="font-medium bg-muted/50">
                            {t("fields.dpRef") || "DP Ref"}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="font-mono font-medium text-primary hover:underline cursor-pointer"
                              onClick={() => {
                                setSelectedDPId(data.down_payment_invoice!.id);
                                setIsDPOpen(true);
                              }}
                            >
                              {data.down_payment_invoice.code}
                            </button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Workflow dates */}
          {(data.submitted_at || data.approved_at || data.rejected_at || data.cancelled_at) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {tCommon("workflow") || "Workflow"}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {data.submitted_at && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">Submitted</TableCell>
                          <TableCell>{formatDate(data.submitted_at)}</TableCell>
                        </TableRow>
                      )}
                      {data.approved_at && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Approved</TableCell>
                          <TableCell>{formatDate(data.approved_at)}</TableCell>
                        </TableRow>
                      )}
                      {data.rejected_at && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 text-destructive">
                            Rejected
                          </TableCell>
                          <TableCell className="text-destructive">
                            {formatDate(data.rejected_at)}
                          </TableCell>
                        </TableRow>
                      )}
                      {data.cancelled_at && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Cancelled</TableCell>
                          <TableCell>{formatDate(data.cancelled_at)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Financial summary */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">
              {tCommon("financial") || "Financial"}
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium bg-muted/50 w-48">
                      {t("fields.subtotal")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(data.sub_total)}
                    </TableCell>
                  </TableRow>
                  {data.tax_rate > 0 && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("fields.taxAmount")} ({data.tax_rate}%)
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.tax_amount)}
                      </TableCell>
                    </TableRow>
                  )}
                  {data.delivery_cost > 0 && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("fields.deliveryCost")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.delivery_cost)}
                      </TableCell>
                    </TableRow>
                  )}
                  {data.other_cost > 0 && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">
                        {t("fields.otherCost")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(data.other_cost)}
                      </TableCell>
                    </TableRow>
                  )}
                  {dpDeduction > 0 && (
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 text-success">
                        DP Deduction
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        − {formatCurrency(dpDeduction)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold bg-muted">{t("fields.total")}</TableCell>
                    <TableCell className="text-right font-bold font-mono text-lg">
                      {formatCurrency(data.amount)}
                    </TableCell>
                  </TableRow>
                  {(st === "unpaid" || st === "partial" || st === "paid") && (
                    <>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Paid</TableCell>
                        <TableCell className="text-right font-mono text-success font-medium">
                          {formatCurrency(data.paid_amount)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold bg-muted">Remaining</TableCell>
                        <TableCell className="text-right font-bold font-mono text-lg text-primary">
                          {formatCurrency(data.remaining_amount)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ── Items tab ─────────────────────────────────────────────────── */}
        <TabsContent value="items" className="space-y-4 py-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">{t("items.fields.product")}</TableHead>
                  <TableHead className="text-right w-[12%]">{t("items.fields.quantity")}</TableHead>
                  <TableHead className="text-right w-[18%]">{t("items.fields.price")}</TableHead>
                  <TableHead className="text-right w-[12%]">{t("items.fields.discount")}</TableHead>
                  <TableHead className="text-right w-[18%]">{t("items.fields.subTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      -
                    </TableCell>
                  </TableRow>
                ) : (
                  (data.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product && canViewProduct ? (
                          <button
                            onClick={() => {
                              setSelectedProductId(item.product!.id);
                              setIsProductOpen(true);
                            }}
                            className="text-primary hover:underline cursor-pointer text-left"
                          >
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.code && (
                              <p className="text-xs text-muted-foreground">{item.product.code}</p>
                            )}
                          </button>
                        ) : (
                          <div>
                            <p className="font-medium">
                              {item.product?.name ?? item.product_id}
                            </p>
                            {item.product?.code && (
                              <p className="text-xs text-muted-foreground">{item.product.code}</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0 ? `${item.discount}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.sub_total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Audit Trail tab ─────────────────────────────────────────── */}
        <TabsContent value="audit">
          <AuditTrailTab invoiceId={data.id} enabled={activeTab === "audit"} />
        </TabsContent>
      </Tabs>

      {/* Print dialog */}
      {printOpen && (
        <SupplierInvoicePrintDialog
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

      {/* Product detail */}
      {isProductOpen && selectedProductId && (
        <QuotationProductDetailModal
          open={isProductOpen}
          onOpenChange={(v) => {
            setIsProductOpen(v);
            if (!v) setSelectedProductId(null);
          }}
          productId={selectedProductId}
        />
      )}

      {/* Payment form */}
      {paymentOpen && (
        <PurchasePaymentForm
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          defaultInvoiceId={data.id}
        />
      )}

      {/* PO detail */}
      {isPOOpen && selectedPOId && (
        <PurchaseOrderDetail
          open={isPOOpen}
          onClose={() => {
            setIsPOOpen(false);
            setSelectedPOId(null);
          }}
          purchaseOrderId={selectedPOId}
        />
      )}

      {/* GR detail */}
      {isGROpen && selectedGRId && (
        <GoodsReceiptDetailModal
          open={isGROpen}
          onClose={() => {
            setIsGROpen(false);
            setSelectedGRId(null);
          }}
          goodsReceiptId={selectedGRId}
        />
      )}

      {/* DP detail */}
      {isDPOpen && selectedDPId && (
        <SupplierInvoiceDPDetailModal
          open={isDPOpen}
          onOpenChange={(v) => {
            setIsDPOpen(v);
            if (!v) setSelectedDPId(null);
          }}
          id={selectedDPId}
        />
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName="supplier invoice"
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

interface SupplierInvoiceDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoiceId?: string | null;
}

export function SupplierInvoiceDetail({ open, onClose, invoiceId }: SupplierInvoiceDetailProps) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");
  const id = invoiceId ?? "";

  const { data, isLoading, isError } = useSupplierInvoice(id, {
    enabled: open && !!invoiceId,
  });

  const detail = data?.data;
  const st = (detail?.status ?? "").toLowerCase();

  const canSubmit = useUserPermission("supplier_invoice.submit");
  const canApprove = useUserPermission("supplier_invoice.approve");
  const canReject = useUserPermission("supplier_invoice.reject");
  const canCancel = useUserPermission("supplier_invoice.cancel");
  const canPending = useUserPermission("supplier_invoice.pending");
  const canPrint = useUserPermission("supplier_invoice.print");
  const canDelete = useUserPermission("supplier_invoice.delete");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const submitMutation = useSubmitSupplierInvoice();
  const approveMutation = useApproveSupplierInvoice();
  const rejectMutation = useRejectSupplierInvoice();
  const cancelMutation = useCancelSupplierInvoice();
  const pendingMutation = usePendingSupplierInvoice();
  const deleteMutation = useDeleteSupplierInvoice();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Title row — mirrors InvoiceDetailModal: title left, actions right */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {detail?.invoice_number ?? t("detail.title")}
              </DialogTitle>
              <div className="flex items-center gap-3">
                {detail && <SupplierInvoiceStatusBadge status={detail.status} />}
                {detail?.invoice_date && (
                  <span className="text-sm text-muted-foreground">
                    {formatDate(detail.invoice_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons — top-right, icon-style like InvoiceDetailModal */}
            {detail && (
              <div className="flex items-center gap-1">
                {canSubmit && st === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={submitMutation.isPending}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.submit")}
                    onClick={async () => {
                      try {
                        await submitMutation.mutateAsync(detail.id);
                        toast.success(t("toast.submitted"));
                      } catch {
                        toast.error(t("toast.failed"));
                      }
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}

                {canApprove && st === "submitted" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={approveMutation.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.approve")}
                    onClick={async () => {
                      try {
                        await approveMutation.mutateAsync(detail.id);
                        toast.success(t("toast.approved"));
                      } catch {
                        toast.error(t("toast.failed"));
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}

                {canReject && st === "submitted" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={t("actions.reject")}
                    onClick={async () => {
                      try {
                        await rejectMutation.mutateAsync(detail.id);
                        toast.success(t("toast.rejected"));
                      } catch {
                        toast.error(t("toast.failed"));
                      }
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}

                {canPending && st === "approved" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pendingMutation.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.pending")}
                    onClick={async () => {
                      try {
                        await pendingMutation.mutateAsync(detail.id);
                        toast.success(t("toast.pending"));
                      } catch {
                        toast.error(t("toast.failed"));
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}

                {(st === "unpaid" || st === "partial") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.createPayment")}
                    onClick={() => setPaymentOpen(true)}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                )}

                {canPrint && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer text-purple hover:text-purple hover:bg-purple/10"
                    title={t("actions.print")}
                    onClick={() => setPrintOpen(true)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}

                {canCancel && (st === "draft" || st === "submitted" || st === "approved") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={cancelMutation.isPending}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={t("actions.cancel")}
                    onClick={async () => {
                      try {
                        await cancelMutation.mutateAsync(detail.id);
                        toast.success(t("toast.cancelled"));
                      } catch {
                        toast.error(t("toast.failed"));
                      }
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}

                {canDelete && st === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={tCommon("delete")}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
          <SupplierInvoiceDetailView data={detail} onClose={onClose} />
        )}

        {/* Print — hoisted to wrapper so it works even before detail view mounts */}
        {printOpen && detail && (
          <SupplierInvoicePrintDialog
            open={printOpen}
            onClose={() => setPrintOpen(false)}
            invoiceId={detail.id}
          />
        )}

        {/* Payment form — hoisted to wrapper */}
        {paymentOpen && detail && (
          <PurchasePaymentForm
            open={paymentOpen}
            onClose={() => setPaymentOpen(false)}
            defaultInvoiceId={detail.id}
          />
        )}

        {/* Delete confirmation — hoisted to wrapper */}
        {detail && (
          <DeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            itemName="supplier invoice"
            onConfirm={async () => {
              try {
                await deleteMutation.mutateAsync(detail.id);
                toast.success(t("toast.deleted"));
                setDeleteOpen(false);
                onClose();
              } catch {
                toast.error(t("toast.failed"));
              }
            }}
            isLoading={deleteMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}