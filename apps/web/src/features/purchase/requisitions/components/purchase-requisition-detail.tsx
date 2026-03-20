"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPurchaseErrorMessage } from "@/features/purchase/utils/error-utils";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { QuotationProductDetailModal } from "@/features/sales/quotation/components/quotation-product-detail-modal";
import { PurchaseOrderDetail } from "@/features/purchase/orders/components/purchase-order-detail";

import {
  usePurchaseRequisition,
  useDeletePurchaseRequisition,
  useSubmitPurchaseRequisition,
  useApprovePurchaseRequisition,
  useRejectPurchaseRequisition,
  useConvertPurchaseRequisition,
} from "../hooks/use-purchase-requisitions";
import { PurchaseRequisitionStatusBadge } from "./purchase-requisition-status-badge";
import { PurchaseRequisitionAuditTrailContent } from "./purchase-requisition-audit-trail";
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import { PurchaseRequisitionPrintDialog } from "./purchase-requisition-print-dialog";

interface PurchaseRequisitionDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly requisitionId?: string | null;
}

export function PurchaseRequisitionDetail({ open, onClose, requisitionId }: PurchaseRequisitionDetailProps) {
  const t = useTranslations("purchaseRequisition");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  const canEdit = useUserPermission("purchase_requisition.update");
  const canDelete = useUserPermission("purchase_requisition.delete");
  const canSubmit = useUserPermission("purchase_requisition.submit");
  const canApprove = useUserPermission("purchase_requisition.approve");
  const canReject = useUserPermission("purchase_requisition.reject");
  const canConvert = useUserPermission("purchase_requisition.convert");
  const canPrint = useUserPermission("purchase_requisition.print");
  const canViewSupplier = useUserPermission("supplier.read");
  const canViewProduct = useUserPermission("product.read");
  const canAuditTrail = useUserPermission("purchase_requisition.read");
  const hasPurchaseOrderRead = useUserPermission("purchase_order.read");
  const purchaseOrderScope = usePermissionScope("purchase_order.read");
  const { user } = useAuthStore();

  const id = requisitionId ?? "";
  const { data, isLoading } = usePurchaseRequisition(id, {
    enabled: open && !!requisitionId,
  });
  const pr = data?.data;

  const deleteMutation = useDeletePurchaseRequisition();
  const submitMutation = useSubmitPurchaseRequisition();
  const approveMutation = useApprovePurchaseRequisition();
  const rejectMutation = useRejectPurchaseRequisition();
  const convertMutation = useConvertPurchaseRequisition();

  if (!requisitionId) return null;

  const status = (pr?.status ?? "").toUpperCase();

  /**
   * Checks whether the current user may navigate to the linked Purchase Order detail.
   */
  const canViewLinkedPurchaseOrder = (): boolean => {
    if (!hasPurchaseOrderRead || !pr?.converted_to_purchase_order_id) return false;
    if (purchaseOrderScope === "ALL") return true;
    if (purchaseOrderScope === "OWN") return pr.requested_by === user?.id;
    if (purchaseOrderScope === "DIVISION" || purchaseOrderScope === "AREA") return true;
    return false;
  };

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

  const handleConvert = async () => {
    if (!id) return;
    try {
      const res = await convertMutation.mutateAsync(id);
      const poId = res?.data?.purchase_order_id;
      toast.success(t("toast.converted"));
      if (poId && canViewLinkedPurchaseOrder()) setSelectedPurchaseOrderId(poId);
    } catch (error) {
      toast.error(getPurchaseErrorMessage(error, t("toast.failed")));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">
                  {pr?.code ?? t("detail.title")}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  {pr && <PurchaseRequisitionStatusBadge status={pr.status} />}
                  <span className="text-sm text-muted-foreground">
                    {pr?.request_date && formatDate(pr.request_date)}
                  </span>
                </div>
              </div>

              {/* Action icon buttons */}
              <div className="flex items-center gap-1">
                {canPrint && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPrintOpen(true)}
                    className="cursor-pointer text-purple hover:text-purple hover:bg-purple/10"
                    title={t("print")}
                  >
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
                {canDelete && status === "DRAFT" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
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
                {status === "APPROVED" && canConvert && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConvert}
                    disabled={convertMutation.isPending}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("convertToOrder")}
                  >
                    <FileText className="h-4 w-4" />
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
          ) : !pr ? (
            <div className="text-sm text-destructive py-4">{t("detail.failed")}</div>
          ) : (
            <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
                {canAuditTrail && <TabsTrigger value="audit_trail">{t("tabs.auditTrail")}</TabsTrigger>}
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">

                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("fields.code")}</TableCell>
                        <TableCell>{pr.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("columns.requestDate")}</TableCell>
                        <TableCell>{pr.request_date ? formatDate(pr.request_date) : "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>
                          <PurchaseRequisitionStatusBadge status={pr.status} />
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("fields.address")}</TableCell>
                        <TableCell>{pr.address ?? "-"}</TableCell>
                      </TableRow>
                      {(pr.payment_terms || pr.employee) && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("fields.paymentTerms")}</TableCell>
                          <TableCell>{pr.payment_terms?.name ?? "-"}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("fields.requestedBy")}</TableCell>
                          <TableCell>
                            <span>{pr.employee?.name ?? pr.user?.email ?? "-"}</span>
                          </TableCell>
                        </TableRow>
                      )}
                      {pr.business_unit && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("fields.businessUnit")}</TableCell>
                          <TableCell colSpan={3}>{pr.business_unit.name}</TableCell>
                        </TableRow>
                      )}
                      {pr.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("fields.notes")}</TableCell>
                          <TableCell colSpan={3}>{pr.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Supplier Information */}
                {pr.supplier && (
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
                                {canViewSupplier ? (
                                  <button
                                    onClick={() => {
                                      setSelectedSupplierId(pr.supplier!.id);
                                      setIsSupplierOpen(true);
                                    }}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {pr.supplier.name}
                                  </button>
                                ) : (
                                  <span>{pr.supplier.name}</span>
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
                          <TableCell className="text-right">{formatCurrency(pr.subtotal)}</TableCell>
                        </TableRow>
                        {pr.tax_amount > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("fields.taxAmount")} ({pr.tax_rate}%)</TableCell>
                            <TableCell className="text-right">{formatCurrency(pr.tax_amount)}</TableCell>
                          </TableRow>
                        )}
                        {pr.delivery_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("fields.deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pr.delivery_cost)}</TableCell>
                          </TableRow>
                        )}
                        {pr.other_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("fields.otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pr.other_cost)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("fields.total")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">{formatCurrency(pr.total_amount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {(pr.submitted_at || pr.approved_at || pr.rejected_at || pr.converted_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {pr.submitted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("status.submitted")}</TableCell>
                                <TableCell>{new Date(pr.submitted_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {pr.approved_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.approved")}</TableCell>
                                <TableCell>{new Date(pr.approved_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {pr.rejected_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.rejected")}</TableCell>
                                <TableCell>{new Date(pr.rejected_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {pr.converted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.converted")}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <span>{new Date(pr.converted_at).toLocaleString()}</span>
                                    {pr.converted_to_purchase_order_id && canViewLinkedPurchaseOrder() && (
                                      <Badge
                                        variant="outline"
                                        className="cursor-pointer hover:border-primary hover:text-primary transition-colors text-xs"
                                        onClick={() => setSelectedPurchaseOrderId(pr.converted_to_purchase_order_id!)}
                                      >
                                        {t("convertToOrder")}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pr.items?.length ? (
                        pr.items
                          .slice((itemsPage - 1) * itemsPageSize, itemsPage * itemsPageSize)
                          .map((item) => (
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
                                    <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                  )}
                                </button>
                              ) : (
                                <div>
                                  <p className="font-medium">{item.product?.name ?? item.product_id}</p>
                                  {item.product?.code && (
                                    <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.purchase_price)}</TableCell>
                            <TableCell className="text-right">{item.discount}%</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                            {t("emptyItems")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {(pr.items?.length ?? 0) > 0 && (
                  <DataTablePagination
                    pageIndex={itemsPage}
                    pageSize={itemsPageSize}
                    rowCount={pr.items?.length ?? 0}
                    onPageChange={setItemsPage}
                    onPageSizeChange={(newSize) => {
                      setItemsPageSize(newSize);
                      setItemsPage(1);
                    }}
                  />
                )}
              </TabsContent>

              {canAuditTrail && (
                <TabsContent value="audit_trail" className="py-4">
                  <PurchaseRequisitionAuditTrailContent
                    enabled={open && !!requisitionId && activeTab === "audit_trail"}
                    requisitionId={requisitionId}
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

      {/* Purchase Order detail — opened from workflow history "Converted" badge */}
      <PurchaseOrderDetail
        open={!!selectedPurchaseOrderId}
        onClose={() => setSelectedPurchaseOrderId(null)}
        purchaseOrderId={selectedPurchaseOrderId}
      />

      {requisitionId && (
        <PurchaseRequisitionForm
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          requisitionId={requisitionId}
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

      {requisitionId && (
        <PurchaseRequisitionPrintDialog
          open={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          requisitionId={requisitionId}
        />
      )}
    </>
  );
}
