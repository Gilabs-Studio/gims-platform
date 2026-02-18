"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, Package, Truck, Clock } from "lucide-react";
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
import {
  useDeleteOrder,
  useUpdateOrderStatus,
  useOrder,
} from "../hooks/use-orders";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesOrder } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface OrderDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly order: SalesOrder | null;
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
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("order");

  const { data: detailData, isLoading } = useOrder(order?.id ?? "", {
    enabled: open && !!order?.id,
  });

  const canEdit = useUserPermission("sales_order.update");
  const canDelete = useUserPermission("sales_order.delete");
  const canConfirm = useUserPermission("sales_order.confirm");
  const canCancel = useUserPermission("sales_order.cancel");

  if (!order) return null;

  const displayOrder = detailData?.data ?? order;
  const allItems = displayOrder.items ?? [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * pageSize,
    itemsPage * pageSize
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "confirmed":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.confirmed")}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Package className="h-3 w-3 mr-1.5" />
            {t("status.processing")}
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Truck className="h-3 w-3 mr-1.5" />
            {t("status.shipped")}
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.delivered")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

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
                  {order && getStatusBadge(order.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayOrder?.order_date && new Date(displayOrder.order_date).toLocaleDateString()}
                  </span>
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
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
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
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">
                
                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("code")}</TableCell>
                        <TableCell>{displayOrder.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("orderDate")}</TableCell>
                        <TableCell>{new Date(displayOrder.order_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayOrder.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("salesQuotation")}</TableCell>
                        <TableCell>
                          {displayOrder.sales_quotation_id ?? "-"}
                        </TableCell>
                      </TableRow>
                      {displayOrder.payment_terms && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("paymentTerms")}</TableCell>
                          <TableCell>{displayOrder.payment_terms.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("salesRep")}</TableCell>
                          <TableCell>{displayOrder.sales_rep?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayOrder.business_unit && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("businessUnit")}</TableCell>
                          <TableCell>{displayOrder.business_unit.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("businessType")}</TableCell>
                          <TableCell>{displayOrder.business_type?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayOrder.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayOrder.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Customer Information Table */}
                {(displayOrder.customer_name || displayOrder.customer_contact || 
                  displayOrder.customer_phone || displayOrder.customer_email) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerName")}</TableCell>
                              <TableCell>{displayOrder.customer_name ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerContact")}</TableCell>
                              <TableCell>{displayOrder.customer_contact ?? "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("customerPhone")}</TableCell>
                              <TableCell>{displayOrder.customer_phone ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50">{t("customerEmail")}</TableCell>
                              <TableCell>{displayOrder.customer_email ?? "-"}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Summary Table */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("common.financial")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("subtotal")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(displayOrder.subtotal)}</TableCell>
                        </TableRow>
                        {displayOrder.discount_amount > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("discountAmount")}</TableCell>
                            <TableCell className="text-right text-destructive">
                              -{formatCurrency(displayOrder.discount_amount)}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {t("taxAmount")} ({displayOrder.tax_rate}%)
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(displayOrder.tax_amount)}</TableCell>
                        </TableRow>
                        {displayOrder.delivery_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayOrder.delivery_cost)}</TableCell>
                          </TableRow>
                        )}
                        {displayOrder.other_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayOrder.other_cost)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("totalAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(displayOrder.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {(displayOrder.confirmed_at || displayOrder.cancelled_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayOrder.confirmed_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("confirmedAt")}</TableCell>
                                <TableCell>{new Date(displayOrder.confirmed_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {displayOrder.cancelled_at && (
                              <>
                                <TableRow>
                                  <TableCell className="font-medium bg-muted/50">{t("cancelledAt")}</TableCell>
                                  <TableCell>{new Date(displayOrder.cancelled_at).toLocaleString()}</TableCell>
                                </TableRow>
                                {displayOrder.cancellation_reason && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("cancellationReason")}</TableCell>
                                    <TableCell>{displayOrder.cancellation_reason}</TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-4 py-4">
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("item.product")}</TableHead>
                          <TableHead className="text-right">{t("item.quantity")}</TableHead>
                          <TableHead className="text-right">{t("item.price")}</TableHead>
                          <TableHead className="text-right">{t("item.discount")}</TableHead>
                          <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {t("noItems")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item) => (
                            <TableRow key={item.id}>
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
                </>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {order && (
        <OrderForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          order={order}
        />
      )}

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
