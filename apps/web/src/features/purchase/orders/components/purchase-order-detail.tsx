"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Edit,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Printer,
  DollarSign,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPurchaseErrorMessage } from "@/features/purchase/utils/error-utils";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { QuotationProductDetailModal } from "@/features/sales/quotation/components/quotation-product-detail-modal";

import {
  usePurchaseOrder,
  useDeletePurchaseOrder,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
} from "../hooks/use-purchase-orders";
import { PurchaseOrderStatusBadge } from "./purchase-order-status-badge";
import { PurchaseOrderAuditTrailContent } from "./purchase-order-audit-trail";
import { PurchaseOrderForm } from "./purchase-order-form";
import { purchaseOrdersService } from "../services/purchase-orders-service";
import { SupplierInvoiceFormDialog } from "@/features/purchase/supplier-invoices/components/supplier-invoice-form";
import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import { SupplierInvoiceDPFormDialog } from "@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-dp-form";
import { useSupplierInvoices } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";
import { useSupplierInvoiceDPAddData, useSupplierInvoiceDPs } from "@/features/purchase/supplier-invoice-down-payments/hooks/use-supplier-invoice-dp";

interface PurchaseOrderDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly purchaseOrderId?: string | null;
}

export function PurchaseOrderDetail({
  open,
  onClose,
  purchaseOrderId,
}: PurchaseOrderDetailProps) {
  const t = useTranslations("purchaseOrder");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSIFormOpen, setIsSIFormOpen] = useState(false);
  const [isSIDPFormOpen, setIsSIDPFormOpen] = useState(false);
  const [isSIDetailOpen, setIsSIDetailOpen] = useState(false);
  const [selectedSIId, setSelectedSIId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  const canEdit = useUserPermission("purchase_order.update");
  const canSubmit = useUserPermission("purchase_order.submit");
  const canApprove = useUserPermission("purchase_order.approve");
  const canReject = useUserPermission("purchase_order.reject");
  const canPrint = useUserPermission("purchase_order.print");
  const canCreateSI = useUserPermission("supplier_invoice.create");
  const canCreateSIDP = useUserPermission("supplier_invoice_dp.create");
  const canViewSupplier = useUserPermission("supplier.read");
  const canViewProduct = useUserPermission("product.read");
  const canAuditTrail = useUserPermission("purchase_order.read");

  const id = purchaseOrderId ?? "";
  const { data, isLoading } = usePurchaseOrder(id, {
    enabled: open && !!purchaseOrderId,
  });
  const po = data?.data;

  const { data: siData } = useSupplierInvoices(
    { purchase_order_id: id, per_page: 20 },
    { enabled: open && !!purchaseOrderId },
  );
  const { data: siDPData } = useSupplierInvoiceDPs(
    { purchase_order_id: id, per_page: 20 },
    { enabled: open && !!purchaseOrderId },
  );
  const sidpAddDataQuery = useSupplierInvoiceDPAddData({
    enabled: open && !!purchaseOrderId && canCreateSIDP,
  });
  const eligibleSIDPOrderIds = useMemo(() => {
    const rows = sidpAddDataQuery.data?.data?.purchase_orders ?? [];
    return new Set(rows.map((row) => row.id));
  }, [sidpAddDataQuery.data]);
  const canCreateSIDPForOrder =
    (po?.status ?? "").toUpperCase() === "APPROVED" &&
    canCreateSIDP &&
    !!purchaseOrderId &&
    !sidpAddDataQuery.isLoading &&
    eligibleSIDPOrderIds.has(purchaseOrderId);

  const financialOverview = useMemo(() => {
    if (!po) return null;
    const siList = siData?.data ?? [];
    const dpList = siDPData?.data ?? [];
    const totalInvoiced = siList.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
    const totalPaidInvoice = siList.reduce((sum, inv) => sum + (inv.paid_amount ?? 0), 0);
    const totalDP = dpList.reduce((sum, dp) => sum + (dp.amount ?? 0), 0);
    const orderTotal = po.total_amount ?? 0;
    const totalPaid = totalPaidInvoice;
    const remainingBalance = orderTotal - totalPaid;
    return {
      orderTotal,
      totalInvoiced,
      totalDP,
      totalPaid,
      remainingBalance,
      invoiceCount: siList.length,
      dpCount: dpList.length,
    };
  }, [po, siData, siDPData]);

  const deleteMutation = useDeletePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const rejectMutation = useRejectPurchaseOrder();

  if (!purchaseOrderId) return null;

  const status = (po?.status ?? "").toUpperCase();
  const hasGoodsReceipt = (po?.items ?? []).some(
    (item) => (item.quantity_received ?? 0) > 0,
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("toast.deleted"));
      setIsDeleteOpen(false);
      onClose();
    } catch (error) {
      toast.error(getPurchaseErrorMessage(error, t("toast.failed")));
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitMutation.mutateAsync(id);
      toast.success(t("toast.submitted"));
    } catch (error) {
      toast.error(getPurchaseErrorMessage(error, t("toast.failed")));
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("toast.approved"));
    } catch (error) {
      toast.error(getPurchaseErrorMessage(error, t("toast.failed")));
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success(t("toast.rejected"));
    } catch (error) {
      toast.error(getPurchaseErrorMessage(error, t("toast.failed")));
    }
  };

  const supplierObj = po?.supplier as { id?: string; name?: string } | undefined;
  const paymentTermsName = (po?.payment_terms as { name?: string } | undefined)?.name ?? "-";
  const businessUnitName = (po?.business_unit as { name?: string } | undefined)?.name ?? "-";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">
                  {po?.code ?? t("detail.title")}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {po?.order_date && formatDate(po.order_date)}
                  </span>
                </div>
              </div>

              {/* Action icon buttons */}
              <div className="flex items-center gap-1">
                {canPrint && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { if (purchaseOrderId) purchaseOrdersService.openPrintWindow(purchaseOrderId).catch(() => toast.error("Print failed")); }}
                    className="cursor-pointer text-purple hover:text-purple hover:bg-purple/10"
                    title={t("print")}>
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && status === "DRAFT" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditOpen(true)}
                    className="cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canSubmit && status === "DRAFT" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.submit")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {status === "SUBMITTED" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.approve")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {status === "SUBMITTED" && canReject && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-red-50"
                    title={t("actions.reject")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {status === "APPROVED" && canCreateSI && hasGoodsReceipt && (financialOverview?.invoiceCount ?? 0) === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSIFormOpen(true)}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.createSI")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                {canCreateSIDPForOrder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSIDPFormOpen(true)}
                    className="cursor-pointer text-success hover:text-success hover:bg-success/10"
                    title={t("actions.createSIDP")}
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !po ? (
            <div className="text-sm text-destructive py-4">{t("detail.failed")}</div>
          ) : (
            <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
                {canAuditTrail && (
                  <TabsTrigger value="audit_trail">{t("tabs.auditTrail")}</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">
                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("fields.code")}</TableCell>
                        <TableCell>{po.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("columns.orderDate")}</TableCell>
                        <TableCell>{po.order_date ? formatDate(po.order_date) : "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>
                          <PurchaseOrderStatusBadge status={po.status} />
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("fields.dueDate")}</TableCell>
                        <TableCell>{po.due_date ? formatDate(po.due_date) : "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("fields.paymentTerms")}</TableCell>
                        <TableCell>{paymentTermsName}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("fields.businessUnit")}</TableCell>
                        <TableCell>{businessUnitName}</TableCell>
                      </TableRow>
                      {po.purchase_requisition && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("columns.purchaseRequisition")}</TableCell>
                          <TableCell colSpan={3}>
                            {(po.purchase_requisition as { code?: string })?.code ?? "-"}
                          </TableCell>
                        </TableRow>
                      )}
                      {po.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("fields.notes")}</TableCell>
                          <TableCell colSpan={3}>{po.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Supplier Information */}
                {supplierObj && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("fields.supplierInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("columns.supplier")}</TableCell>
                              <TableCell>
                                {canViewSupplier && supplierObj.id ? (
                                  <button
                                    onClick={() => {
                                      setSelectedSupplierId(supplierObj.id!);
                                      setIsSupplierOpen(true);
                                    }}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {supplierObj.name}
                                  </button>
                                ) : (
                                  <span>{supplierObj.name ?? "-"}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Summary */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("common.financial")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("fields.subtotal")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(po.sub_total ?? 0)}</TableCell>
                        </TableRow>
                        {(po.tax_amount ?? 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">
                              {t("fields.taxAmount")}
                              {(po.tax_rate ?? 0) > 0 && ` (${po.tax_rate}%)`}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(po.tax_amount ?? 0)}</TableCell>
                          </TableRow>
                        )}
                        {(po.delivery_cost ?? 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("fields.deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(po.delivery_cost ?? 0)}</TableCell>
                          </TableRow>
                        )}
                        {(po.other_cost ?? 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("fields.otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(po.other_cost ?? 0)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("fields.total")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">{formatCurrency(po.total_amount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Payment Overview - n/n style like sales order */}
                {financialOverview && (financialOverview.invoiceCount > 0 || financialOverview.dpCount > 0) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("paymentOverview.title")}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase">{t("paymentOverview.orderTotal")}</p>
                          <p className="text-sm font-bold">{formatCurrency(financialOverview.orderTotal)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase">
                            {t("paymentOverview.downPayment")} ({financialOverview.dpCount})
                          </p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(financialOverview.totalDP)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase">
                            {t("paymentOverview.invoiced")} ({financialOverview.invoiceCount})
                          </p>
                          <p className="text-sm font-bold text-success">{formatCurrency(financialOverview.totalInvoiced)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                          <p className="text-xs text-muted-foreground font-medium uppercase">{t("paymentOverview.remaining")}</p>
                          <p className={`text-sm font-bold ${financialOverview.remainingBalance > 0 ? "text-warning" : "text-success"}`}>
                            {formatCurrency(financialOverview.remainingBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Workflow History */}
                {(po.submitted_at || po.approved_at || po.closed_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {po.submitted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("status.submitted")}</TableCell>
                                <TableCell>{new Date(po.submitted_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {po.approved_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.approved")}</TableCell>
                                <TableCell>{new Date(po.approved_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {po.closed_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.closed")}</TableCell>
                                <TableCell>{new Date(po.closed_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-4 py-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("fields.product")}</TableHead>
                        <TableHead className="text-right">{t("fields.quantity")}</TableHead>
                        <TableHead className="text-right">{t("fields.purchasePrice")}</TableHead>
                        <TableHead className="text-right">{t("fields.discount")}</TableHead>
                        <TableHead className="text-right">{t("fields.subtotal")}</TableHead>
                        <TableHead>{t("fields.notes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items?.length ? (
                        po.items
                          .slice((itemsPage - 1) * itemsPageSize, itemsPage * itemsPageSize)
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {item.product && canViewProduct ? (
                                  <button
                                    onClick={() => {
                                      setSelectedProductId((item.product as { id: string }).id);
                                      setIsProductOpen(true);
                                    }}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    <p className="font-medium">{(item.product as { name?: string }).name}</p>
                                    {(item.product as { code?: string }).code && (
                                      <p className="text-sm text-muted-foreground">
                                        {(item.product as { code?: string }).code}
                                      </p>
                                    )}
                                  </button>
                                ) : (
                                  <div>
                                    <p className="font-medium">
                                      {(item.product as { name?: string } | null | undefined)?.name ?? item.product_id}
                                    </p>
                                    {(item.product as { code?: string } | null | undefined)?.code && (
                                      <p className="text-sm text-muted-foreground">
                                        {(item.product as { code?: string }).code}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right">{item.discount ?? 0}%</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{item.notes ?? "-"}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                            {t("emptyItems")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination
                  pageIndex={itemsPage}
                  pageSize={itemsPageSize}
                  rowCount={po.items?.length ?? 0}
                  onPageChange={setItemsPage}
                  onPageSizeChange={(newSize) => {
                    setItemsPageSize(newSize);
                    setItemsPage(1);
                  }}
                />
              </TabsContent>

              {canAuditTrail && (
                <TabsContent value="audit_trail" className="py-4">
                  <PurchaseOrderAuditTrailContent
                    enabled={open && !!purchaseOrderId && activeTab === "audit_trail"}
                    purchaseOrderId={purchaseOrderId}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <SupplierDetailModal
        open={isSupplierOpen}
        onOpenChange={setIsSupplierOpen}
        supplierId={selectedSupplierId}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

      {purchaseOrderId && (
        <PurchaseOrderForm
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          purchaseOrderId={purchaseOrderId}
        />
      )}

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteMutation.isPending}
      />

      <SupplierInvoiceFormDialog
        open={isSIFormOpen}
        onOpenChange={(open) => setIsSIFormOpen(open)}
        defaultPurchaseOrderId={purchaseOrderId}
        onSuccess={(invoiceId) => {
          setSelectedSIId(invoiceId);
          setIsSIDetailOpen(true);
        }}
      />

      <SupplierInvoiceDetail
        open={isSIDetailOpen}
        onClose={() => {
          setIsSIDetailOpen(false);
          setSelectedSIId(null);
        }}
        invoiceId={selectedSIId}
      />

      <SupplierInvoiceDPFormDialog
        open={isSIDPFormOpen}
        onOpenChange={(open) => setIsSIDPFormOpen(open)}
        defaultPurchaseOrderId={purchaseOrderId}
      />
    </>
  );
}
