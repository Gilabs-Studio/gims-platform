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
import { formatDate } from "@/lib/utils";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { PurchaseOrderDetail } from "@/features/purchase/orders/components/purchase-order-detail";
import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import { SupplierInvoiceFormDialog } from "@/features/purchase/supplier-invoices/components/supplier-invoice-form";

import {
  useGoodsReceipt,
  useDeleteGoodsReceipt,
  useSubmitGoodsReceipt,
  useApproveGoodsReceipt,
  useRejectGoodsReceipt,
} from "../hooks/use-goods-receipts";
import { GoodsReceiptStatusBadge } from "./goods-receipt-status-badge";
import { GoodsReceiptAuditTrailContent } from "./goods-receipt-audit-trail";
import { GoodsReceiptForm } from "./goods-receipt-form";
import { GoodsReceiptPrintDialog } from "./goods-receipt-print-dialog";
import { SILinkedDialog } from "./si-linked-dialog";

interface GoodsReceiptDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goodsReceiptId?: string | null;
}

export function GoodsReceiptDetail({ open, onClose, goodsReceiptId }: GoodsReceiptDetailProps) {
  const t = useTranslations("goodsReceipt");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [selectedSIId, setSelectedSIId] = useState<string | null>(null);
  const [isSIDetailOpen, setIsSIDetailOpen] = useState(false);
  const [isSIFormOpen, setIsSIFormOpen] = useState(false);
  const [siLinkedOpen, setSiLinkedOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  const canEdit = useUserPermission("goods_receipt.update");
  const canDelete = useUserPermission("goods_receipt.delete");
  const canSubmit = useUserPermission("goods_receipt.submit");
  const canApprove = useUserPermission("goods_receipt.approve");
  const canReject = useUserPermission("goods_receipt.reject");
  const canClose = useUserPermission("goods_receipt.close");
  const canPrint = useUserPermission("goods_receipt.print");
  const canViewSupplier = useUserPermission("supplier.read");
  const canViewPO = useUserPermission("purchase_order.read");
  const canAuditTrail = useUserPermission("goods_receipt.audit_trail");

  const id = goodsReceiptId ?? "";
  const { data, isLoading } = useGoodsReceipt(id, {
    enabled: open && !!goodsReceiptId,
  });
  const gr = data?.data;

  const deleteMutation = useDeleteGoodsReceipt();
  const submitMutation = useSubmitGoodsReceipt();
  const approveMutation = useApproveGoodsReceipt();
  const rejectMutation = useRejectGoodsReceipt();

  if (!goodsReceiptId) return null;

  const status = (gr?.status ?? "").toUpperCase();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("toast.deleted"));
      setIsDeleteOpen(false);
      onClose();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await submitMutation.mutateAsync(id);
      toast.success(t("toast.submitted"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("toast.approved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success(t("toast.rejected"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  // Open SI form first; conversion is completed when SI is submitted.
  const handleConvertToSI = () => {
    if (!id) return;
    setIsSIFormOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">
                  {gr?.code ?? t("detail.title")}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  {gr && (
                    <GoodsReceiptStatusBadge
                      status={gr.status}
                      onClick={
                        status === "CLOSED" || status === "PARTIAL"
                          ? () => setSiLinkedOpen(true)
                          : undefined
                      }
                    />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {gr?.receipt_date && formatDate(gr.receipt_date)}
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
                    title={t("actions.edit")}
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
                    title={t("actions.delete")}
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
                {(status === "APPROVED" || status === "PARTIAL") && canClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConvertToSI}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("convertToSupplierInvoice")}
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
          ) : !gr ? (
            <div className="text-sm text-destructive py-4">{t("detail.failed")}</div>
          ) : (
            <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
                {canAuditTrail && <TabsTrigger value="audit_trail">{t("auditTrail.title")}</TabsTrigger>}
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">
                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("columns.code")}</TableCell>
                        <TableCell>{gr.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("fields.receiptDate")}</TableCell>
                        <TableCell>{gr.receipt_date ? formatDate(gr.receipt_date) : "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("fields.status")}</TableCell>
                        <TableCell>
                          <GoodsReceiptStatusBadge
                            status={gr.status}
                            onClick={
                              status === "CLOSED" || status === "PARTIAL"
                                ? () => setSiLinkedOpen(true)
                                : undefined
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("fields.purchaseOrder")}</TableCell>
                        <TableCell>
                          {gr.purchase_order ? (
                            canViewPO ? (
                              <button
                                onClick={() => {
                                  setSelectedPurchaseOrderId(gr.purchase_order!.id);
                                  setIsPurchaseOrderOpen(true);
                                }}
                                className="font-mono font-medium text-primary hover:underline cursor-pointer"
                              >
                                {gr.purchase_order.code}
                              </button>
                            ) : (
                              <span className="font-mono font-medium text-primary">{gr.purchase_order.code}</span>
                            )
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                      {gr.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("fields.notes")}</TableCell>
                          <TableCell colSpan={3}>{gr.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Supplier Information */}
                {gr.supplier && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("sections.supplierInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-small bg-muted/50 w-48">{t("fields.supplier")}</TableCell>
                              <TableCell>
                                {canViewSupplier ? (
                                  <button
                                    onClick={() => {
                                      setSelectedSupplierId(gr.supplier!.id);
                                      setIsSupplierOpen(true);
                                    }}
                                    className="text-primary hover:underline cursor-pointer text-left text-sm"
                                  >
                                    {gr.supplier.name}
                                  </button>
                                ) : (
                                  <span>{gr.supplier.name}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Workflow History */}
                {(gr.submitted_at || gr.approved_at || gr.rejected_at || gr.closed_at || gr.converted_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("sections.workflowHistory")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {gr.submitted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("status.submitted")}</TableCell>
                                <TableCell>{new Date(gr.submitted_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {gr.approved_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.approved")}</TableCell>
                                <TableCell>{new Date(gr.approved_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {gr.rejected_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.rejected")}</TableCell>
                                <TableCell>{new Date(gr.rejected_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {gr.closed_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.closed")}</TableCell>
                                <TableCell>{new Date(gr.closed_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {gr.converted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("convertToSupplierInvoice")}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <span>{new Date(gr.converted_at).toLocaleString()}</span>
                                    {gr.converted_to_supplier_invoice_id && (
                                      <button
                                        type="button"
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setSelectedSIId(gr.converted_to_supplier_invoice_id ?? null);
                                          setIsSIDetailOpen(true);
                                        }}
                                      >
                                        <Badge variant="outline" className="text-xs hover:bg-accent">
                                          {t("fields.supplierInvoice")}
                                        </Badge>
                                      </button>
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
                        <TableHead>{t("items.fields.product")}</TableHead>
                        <TableHead className="text-right">{t("items.fields.receivedQty")}</TableHead>
                        <TableHead>{t("items.fields.notes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gr.items?.length ? (
                        gr.items
                          .slice((itemsPage - 1) * itemsPageSize, itemsPage * itemsPageSize)
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.product?.name ?? item.purchase_order_item_id}
                              </TableCell>
                              <TableCell className="text-right font-mono">{item.quantity_received}</TableCell>
                              <TableCell className="text-muted-foreground">{item.notes ?? "-"}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">-</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {(gr.items?.length ?? 0) > 0 && (
                  <DataTablePagination
                    pageIndex={itemsPage}
                    pageSize={itemsPageSize}
                    rowCount={gr.items?.length ?? 0}
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
                  <GoodsReceiptAuditTrailContent
                    enabled={open && !!goodsReceiptId && activeTab === "audit_trail"}
                    goodsReceiptId={goodsReceiptId}
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

      {goodsReceiptId && (
        <GoodsReceiptForm
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          goodsReceiptId={goodsReceiptId}
        />
      )}

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title={t("actions.delete")}
        description={t("detail.title")}
        isLoading={deleteMutation.isPending}
      />

      {goodsReceiptId && (
        <GoodsReceiptPrintDialog
          open={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          receiptId={goodsReceiptId}
        />
      )}

      <PurchaseOrderDetail
        open={isPurchaseOrderOpen}
        onClose={() => {
          setIsPurchaseOrderOpen(false);
          setSelectedPurchaseOrderId(null);
        }}
        purchaseOrderId={selectedPurchaseOrderId}
      />

      <SupplierInvoiceDetail
        open={isSIDetailOpen}
        onClose={() => {
          setIsSIDetailOpen(false);
          setSelectedSIId(null);
        }}
        invoiceId={selectedSIId}
      />

      <SupplierInvoiceFormDialog
        open={isSIFormOpen}
        onOpenChange={(v) => setIsSIFormOpen(v)}
        defaultPurchaseOrderId={gr?.purchase_order?.id ?? null}
        defaultGoodsReceiptId={gr?.id ?? null}
      />
      
      {gr && siLinkedOpen && (
        <SILinkedDialog
          open={siLinkedOpen}
          onOpenChange={setSiLinkedOpen}
          goodsReceiptCode={gr.code}
          goodsReceiptId={gr.id}
          purchaseOrderId={gr.purchase_order?.id ?? ""}
        />
      )}
    </>
  );
}

