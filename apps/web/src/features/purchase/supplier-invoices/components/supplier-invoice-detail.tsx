"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Printer,
  Receipt,
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
    import("../../supplier-invoice-down-payments/components/supplier-invoice-dp-detail-modal").then((m) => m.SupplierInvoiceDPDetailModal),
  { ssr: false },
);

const PurchasePaymentForm = dynamic(
  () =>
    import("../../payments/components/purchase-payment-form").then((m) => m.PurchasePaymentForm),
  { ssr: false },
);

// ─── Audit Trail tab ─────────────────────────────────────────────────────────

function AuditTrailTab({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("supplierInvoice");
  const { data, isLoading } = useSupplierInvoiceAuditTrail(invoiceId, { page: 1, per_page: 50 });
  const entries = data?.data ?? [];

  if (isLoading) return <Skeleton className="h-32 w-full mt-4" />;
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("auditTrail.empty")}</p>;

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
              <TableCell>{entry.user?.name ?? entry.user?.email ?? "-"}</TableCell>
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

// ─── Invoice detail view (industry invoice layout) ────────────────────────────

function SupplierInvoiceDetailView({
  data,
  onClose,
}: {
  data: ISupplierInvoiceDetail;
  onClose: () => void;
}) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");

  const canUpdate = useUserPermission("supplier_invoice.update");
  const canDelete = useUserPermission("supplier_invoice.delete");
  const canSubmit = useUserPermission("supplier_invoice.submit");
  const canApprove = useUserPermission("supplier_invoice.approve");
  const canReject = useUserPermission("supplier_invoice.reject");
  const canCancel = useUserPermission("supplier_invoice.cancel");
  const canPending = useUserPermission("supplier_invoice.pending");
  const canPrint = useUserPermission("supplier_invoice.print");
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

  const submitMutation = useSubmitSupplierInvoice();
  const approveMutation = useApproveSupplierInvoice();
  const rejectMutation = useRejectSupplierInvoice();
  const cancelMutation = useCancelSupplierInvoice();
  const pendingMutation = usePendingSupplierInvoice();
  const deleteMutation = useDeleteSupplierInvoice();

  const st = (data.status ?? "").toLowerCase();

  // Use the auto-calculated down_payment_amount (sum of all PAID DPs) from backend
  const dpDeduction = data.down_payment_amount ?? 0;

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

          {/* Action bar */}
          <div className="flex items-center gap-1.5">
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

            {(st === "unpaid" || st === "partial") && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                {t("actions.createPayment")}
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

        {/* ── Invoice tab ───────────────────────────────────────────────── */}
        <TabsContent value="invoice" className="space-y-6">

          {/* Invoice header block */}
          <div className="flex items-start justify-between gap-4 p-5 bg-muted/30 rounded-xl border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="font-mono font-bold text-lg">{data.code}</span>
                <SupplierInvoiceStatusBadge status={data.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.invoice_number && (
                  <span className="font-medium text-foreground">{data.invoice_number} &bull; </span>
                )}
                {t("fields.dueDate")}:{" "}
                <span className={(() => {
                  const settled = ["paid", "cancelled", "rejected"].includes(st);
                  if (settled || !data.due_date) return "font-medium text-foreground";
                  const due = new Date(data.due_date);
                  const now = new Date();
                  due.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
                  const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
                  if (diff < 0) return "font-semibold text-destructive";
                  if (diff <= 7) return "font-semibold text-amber-500";
                  return "font-medium text-foreground";
                })()}>
                  {formatDate(data.due_date)}
                </span>
                {(() => {
                  const settled = ["paid", "cancelled", "rejected"].includes(st);
                  if (settled || !data.due_date) return null;
                  const due = new Date(data.due_date);
                  const now = new Date();
                  due.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
                  const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
                  if (diff < 0) return (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-destructive text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />{Math.abs(diff)}d overdue
                    </span>
                  );
                  if (diff === 0) return <span className="ml-1.5 text-amber-500 text-xs font-semibold">· Due today</span>;
                  if (diff <= 7) return <span className="ml-1.5 text-amber-500 text-xs font-medium">· {diff}d left</span>;
                  return null;
                })()}
              </p>
              {data.created_by && (
                <p className="text-xs text-muted-foreground mt-1">
                  {tCommon("createdBy") || "Created by"}: {data.created_by}
                </p>
              )}
            </div>
            <div className="text-right text-sm space-y-1">
              <div className="text-muted-foreground">{t("fields.invoiceDate")}</div>
              <div className="font-semibold text-base">{formatDate(data.invoice_date)}</div>
            </div>
          </div>

          {/* Supplier info + PO info */}
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
                  </div>
                )}
                {data.goods_receipt && (
                  <div className="text-muted-foreground">
                    {t("fields.goodsReceipt") || "Goods Receipt"}:{" "}
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
                  </div>
                )}
                {data.down_payment_invoice && (
                  <div className="text-muted-foreground">
                    DP Ref:{" "}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.paymentTerms")}</span>
                  <span className="font-medium">{data.payment_terms?.name ?? "-"}</span>
                </div>
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
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
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
                            <p className="font-medium">{item.product?.name ?? item.product_id}</p>
                            {item.product?.code && (
                              <p className="text-xs text-muted-foreground">{item.product.code}</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0 ? `${item.discount}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.sub_total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Financial summary — right-aligned */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-0 rounded-lg border overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5 border-b">
                <span className="text-sm text-muted-foreground">{t("fields.subtotal")}</span>
                <span className="text-sm font-mono">{formatCurrency(data.sub_total)}</span>
              </div>
              {data.tax_rate > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5 border-b">
                  <span className="text-sm text-muted-foreground">
                    {t("fields.taxAmount")} ({data.tax_rate}%)
                  </span>
                  <span className="text-sm font-mono">{formatCurrency(data.tax_amount)}</span>
                </div>
              )}
              {data.delivery_cost > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5 border-b">
                  <span className="text-sm text-muted-foreground">{t("fields.deliveryCost")}</span>
                  <span className="text-sm font-mono">{formatCurrency(data.delivery_cost)}</span>
                </div>
              )}
              {data.other_cost > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5 border-b">
                  <span className="text-sm text-muted-foreground">{t("fields.otherCost")}</span>
                  <span className="text-sm font-mono">{formatCurrency(data.other_cost)}</span>
                </div>
              )}
              {dpDeduction > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5 border-b text-emerald-600">
                  <span className="text-sm">DP Deduction</span>
                  <span className="text-sm font-mono">− {formatCurrency(dpDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 bg-muted/50 font-bold">
                <span className="text-sm">{t("fields.total")}</span>
                <span className="font-mono text-lg">{formatCurrency(data.amount)}</span>
              </div>
              {(st === "unpaid" || st === "partial" || st === "paid") && (
                <>
                  <div className="flex justify-between items-center px-4 py-2.5 border-t text-emerald-600">
                    <span className="text-sm">Paid</span>
                    <span className="text-sm font-mono">{formatCurrency(data.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 border-t font-bold">
                    <span className="text-sm">Remaining</span>
                    <span className="font-mono text-primary">{formatCurrency(data.remaining_amount)}</span>
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
                <span className="font-medium text-muted-foreground">{t("fields.notes")}: </span>
                {data.notes}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Audit Trail tab ─────────────────────────────────────────── */}
        <TabsContent value="audit">
          <AuditTrailTab invoiceId={data.id} />
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
  const id = invoiceId ?? "";

  const { data, isLoading, isError } = useSupplierInvoice(id, {
    enabled: open && !!invoiceId,
  });

  const detail = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">
              {detail?.invoice_number ?? t("detail.title")}
            </DialogTitle>
            {detail && <SupplierInvoiceStatusBadge status={detail.status} />}
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
      </DialogContent>
    </Dialog>
  );
}

