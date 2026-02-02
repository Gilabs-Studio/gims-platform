"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Clock, Package, Truck, Info, DollarSign, History, PieChart } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { OrderForm } from "./order-form";
import { OrderStatusBadge } from "./order-status-badge";
import {
  useDeleteOrder,
  useUpdateOrderStatus,
  useOrder,
} from "../hooks/use-orders";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SalesOrder, SalesOrderSummary } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface OrderDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly order: SalesOrder | SalesOrderSummary | null;
}

export function OrderDetailModal({
  open,
  onClose,
  order,
}: OrderDetailModalProps) {
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Pagination state
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const t = useTranslations("order");

  // Fetch full detail when modal opens
  const { data: detailData, isLoading } = useOrder(order?.id ?? "", {
    enabled: open && !!order?.id,
  });

  const canEdit = useUserPermission("sales_order.update");
  const canDelete = useUserPermission("sales_order.delete");
  const canConfirm = useUserPermission("sales_order.confirm");
  const canCancel = useUserPermission("sales_order.cancel");

  if (!order) return null;

  // Use detailed data if available, otherwise use passed order
  const displayOrder = detailData?.data ?? order;
  const items = (displayOrder as SalesOrder).items ?? [];
  
  // Client-side pagination logic
  const totalItems = items.length;
  const paginatedItems = items.slice((itemsPage - 1) * pageSize, itemsPage * pageSize);



  const handleDelete = async () => {
    if (!order?.id) return;
    try {
      await deleteOrder.mutateAsync(order.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleConfirm = async () => {
    if (!order?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        data: { status: "confirmed" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to confirm order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleCancel = async () => {
    if (!order?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        data: { status: "cancelled" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{displayOrder?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {order && <OrderStatusBadge status={order.status} className="text-xs font-medium" />}
                  <span className="text-sm text-muted-foreground">
                  {displayOrder?.order_date && new Date(displayOrder.order_date).toLocaleDateString()}
                  </span>
                  {(displayOrder as SalesOrder)?.reserved_stock && (
                    <Badge variant="outline" className="text-xs">
                      {t("reservedStock")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && order?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && order?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {displayOrder?.status === "draft" && canConfirm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConfirm}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("actions.confirm")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {displayOrder?.status !== "cancelled" && displayOrder?.status !== "delivered" && canCancel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("actions.cancel")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <Skeleton className="h-20 flex-1" />
                <Skeleton className="h-20 flex-1" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">
                  <Info className="h-4 w-4 mr-2" />
                  {t("tabs.general")}
                </TabsTrigger>
                <TabsTrigger value="items">
                  <Package className="h-4 w-4 mr-2" />
                  {t("tabs.items")}
                </TabsTrigger>
              </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-8 py-6">
              {/* Total Amount Card - Hero Section */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">{t("totalAmount")}</span>
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-primary">
                        {formatCurrency(displayOrder?.total_amount ?? 0)}
                      </div>
                      {(displayOrder as SalesOrder).notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {(displayOrder as SalesOrder).notes}
                        </p>
                      )}
                    </div>
                    {((displayOrder as SalesOrder).confirmed_at || (displayOrder as SalesOrder).cancelled_at) && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <History className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        {(displayOrder as SalesOrder).confirmed_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-blue-700 dark:text-blue-400">{t("status.confirmed")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(displayOrder as SalesOrder).confirmed_at ? new Date((displayOrder as SalesOrder).confirmed_at!).toLocaleString() : ""}
                              </p>
                            </div>
                          </div>
                        )}
                        {(displayOrder as SalesOrder).cancelled_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-red-700 dark:text-red-400">{t("status.cancelled")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(displayOrder as SalesOrder).cancelled_at ? new Date((displayOrder as SalesOrder).cancelled_at!).toLocaleString() : ""}
                              </p>
                              {(displayOrder as SalesOrder).cancellation_reason && (
                                <p className="text-xs mt-1.5 italic text-muted-foreground border-l-2 border-red-300 pl-2">
                                  {(displayOrder as SalesOrder).cancellation_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Section - Order Details & Related Info */}
                <div className="space-y-6">
                  {/* Order Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("common.order")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                        <p className="text-base font-semibold">{displayOrder.code}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("orderDate")}</p>
                          <p className="text-sm font-medium">{displayOrder?.order_date ? new Date(displayOrder.order_date).toLocaleDateString() : "-"}</p>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Related Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        {t("common.related")}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-5">
                        {(displayOrder as SalesOrder).payment_terms && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("paymentTerms")}</p>
                              <p className="text-sm font-medium truncate">{(displayOrder as SalesOrder).payment_terms?.name}</p>
                            </div>
                          </div>
                        )}
                        {(displayOrder as SalesOrder).sales_rep && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("salesRep")}</p>
                              <p className="text-sm font-medium truncate">{(displayOrder as SalesOrder).sales_rep?.name}</p>
                            </div>
                          </div>
                        )}
                        {(displayOrder as SalesOrder).business_unit && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("businessUnit")}</p>
                              <p className="text-sm font-medium truncate">{(displayOrder as SalesOrder).business_unit?.name}</p>
                            </div>
                          </div>
                        )}
                        {(displayOrder as SalesOrder).business_type && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("businessType")}</p>
                              <p className="text-sm font-medium truncate">{(displayOrder as SalesOrder).business_type?.name}</p>
                            </div>
                          </div>
                        )}
                        {(displayOrder as SalesOrder).delivery_area && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("deliveryArea")}</p>
                              <p className="text-sm font-medium truncate">{(displayOrder as SalesOrder).delivery_area?.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section - Financial Breakdown */}
                <div className="space-y-6">
                  {/* Sales Quotation Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("salesQuotations") || "Sales Quotations"}
                      </h3>
                    </div>
                    <div className="p-6">
                      {(displayOrder as SalesOrder).sales_quotation ? (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                              <p className="text-base font-semibold">{(displayOrder as SalesOrder).sales_quotation?.code}</p>
                            </div>
                            <Badge variant={(displayOrder as SalesOrder).sales_quotation?.status === "approved" ? "default" : "secondary"}>
                              {(displayOrder as SalesOrder).sales_quotation?.status}
                            </Badge>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("common.customer")}</p>
                              <p className="text-sm font-medium truncate" title={(displayOrder as SalesOrder).sales_quotation?.sales_prospect?.company?.name || "N/A"}>
                                {(displayOrder as SalesOrder).sales_quotation?.sales_prospect?.company?.name || "TODO BELUM DIIMPLEMENT"}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("common.date")}</p>
                              <p className="text-sm font-medium">{formatDate((displayOrder as SalesOrder).sales_quotation?.quotation_date)}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("common.total")}</p>
                              <p className="text-sm font-medium">{formatCurrency((displayOrder as SalesOrder).sales_quotation?.total_amount ?? 0)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">{t("noQuotation") || "No linked quotation"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Financial Summary Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("common.financial")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Subtotal */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">{t("subtotal")}</span>
                        <span className="text-base font-semibold">{formatCurrency((displayOrder as SalesOrder)?.subtotal ?? 0)}</span>
                      </div>

                      {/* Discount */}
                      {((displayOrder as SalesOrder).discount_amount ?? 0) > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("discountAmount")}</span>
                          <span className="text-base font-semibold text-destructive">
                            -{formatCurrency((displayOrder as SalesOrder)?.discount_amount ?? 0)}
                          </span>
                        </div>
                      )}

                      {/* Tax */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("taxAmount")} ({(displayOrder as SalesOrder)?.tax_rate ?? 0}%)
                        </span>
                        <span className="text-base font-semibold">{formatCurrency((displayOrder as SalesOrder)?.tax_amount ?? 0)}</span>
                      </div>

                      {/* Delivery Cost */}
                      {((displayOrder as SalesOrder).delivery_cost ?? 0) > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("deliveryCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency((displayOrder as SalesOrder)?.delivery_cost ?? 0)}</span>
                        </div>
                      )}

                      {/* Other Cost */}
                      {((displayOrder as SalesOrder).other_cost ?? 0) > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("otherCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency((displayOrder as SalesOrder)?.other_cost ?? 0)}</span>
                        </div>
                      )}

                      {/* Total - Highlighted */}
                      <div className="flex items-center justify-between py-4 px-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                        <span className="text-base font-bold text-primary">{t("totalAmount")}</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(displayOrder?.total_amount ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 py-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("item.product")}</TableHead>
                      <TableHead className="text-right">{t("item.quantity")}</TableHead>
                      <TableHead className="text-right">{t("item.price")}</TableHead>
                      <TableHead className="text-right">{t("item.discount")}</TableHead>
                      <TableHead className="text-right">{t("item.reservedQuantity")}</TableHead>
                      <TableHead className="text-right">{t("item.deliveredQuantity")}</TableHead>
                      <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t("noItems")}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                              {item.product?.code && (
                                <p className="text-sm text-muted-foreground">{item.product.code}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{item.reserved_quantity ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{item.delivered_quantity ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalItems > 0 && (
                <DataTablePagination
                  pageIndex={itemsPage}
                  pageSize={pageSize}
                  rowCount={totalItems}
                  onPageChange={setItemsPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setItemsPage(1);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {order && (
        <OrderForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          order={order as SalesOrder}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteOrder.isPending}
      />
    </>
  );
}
