"use client";

import { useState } from "react";
import { Edit, Trash2, Package, Truck, CheckCircle2, XCircle, Clock, Send, Receipt } from "lucide-react";
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
import { DeliveryForm } from "./delivery-form";
import { ShipDialog } from "./ship-dialog";
import { DeliverDialog } from "./deliver-dialog";
import {
  useDeleteDeliveryOrder,
  useDeliveryOrder,
  useUpdateDeliveryOrderStatus,
  useApproveDeliveryOrder,
  useShipDeliveryOrder,
  useDeliverDeliveryOrder,
} from "../hooks/use-deliveries";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { DeliveryOrder } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDeliveryDetail } from "../hooks/use-delivery-detail";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import type { SalesOrder } from "../../order/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";
import { InvoiceForm } from "../../invoice/components/invoice-form";

interface DeliveryDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly delivery: DeliveryOrder | null;
}

export function DeliveryDetailModal({
  open,
  onClose,
  delivery,
}: DeliveryDetailModalProps) {
  const deleteDelivery = useDeleteDeliveryOrder();
  const shipMutation = useShipDeliveryOrder();
  const deliverMutation = useDeliverDeliveryOrder();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("delivery");

  const { data: detailData, isLoading } = useDeliveryOrder(delivery?.id ?? "", {
    enabled: open && !!delivery?.id,
  });

  const canEdit = useUserPermission("delivery_order.update");
  const canDelete = useUserPermission("delivery_order.delete");
  const canShip = useUserPermission("delivery_order.ship");
  const canDeliver = useUserPermission("delivery_order.deliver");
  const canApprove = useUserPermission("delivery_order.approve");
  const canCreateInvoice = useUserPermission("customer_invoice.create");
  const canUpdate = useUserPermission("delivery_order.update");

  const updateStatus = useUpdateDeliveryOrderStatus();
  const approveMutation = useApproveDeliveryOrder();

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  const {
    canViewProduct,
    canViewSalesOrder,
    isProductOpen, setIsProductOpen, selectedProductId,
    isSalesOrderOpen, setIsSalesOrderOpen, selectedSalesOrderId,
    openProduct, openSalesOrder,
  } = useDeliveryDetail();

  if (!delivery) return null;

  const displayDelivery = detailData?.data ?? delivery;
  const allItems = displayDelivery.items ?? [];
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
      case "sent":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
          </Badge>
        );
      case "prepared":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Package className="h-3 w-3 mr-1.5" />
            {t("status.prepared")}
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="default" className="text-xs font-medium">
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
    if (!delivery?.id) return;
    try {
      await deleteDelivery.mutateAsync(delivery.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete delivery:", error);
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
                <DialogTitle className="text-xl mb-2">{displayDelivery?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {delivery && getStatusBadge(delivery.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayDelivery?.delivery_date && new Date(displayDelivery.delivery_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && delivery?.status === "draft" && (
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
                {canUpdate && displayDelivery?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!delivery?.id) return;
                      try {
                        await updateStatus.mutateAsync({ id: delivery.id, data: { status: "sent" } });
                        toast.success(t("actions.submitSuccess") || t("statusUpdated"));
                        onClose();
                      } catch (error) {
                        console.error("Failed to submit delivery:", error);
                        toast.error(t("common.error"));
                      }
                    }}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.submit")}
                    disabled={updateStatus.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {displayDelivery?.status === "sent" && (
                  <>
                    {canApprove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!delivery?.id) return;
                          try {
                            await approveMutation.mutateAsync(delivery.id);
                            toast.success(t("statusUpdated"));
                            onClose();
                          } catch (error) {
                            console.error("Failed to approve delivery:", error);
                            toast.error(t("common.error"));
                          }
                        }}
                        className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                        title={t("actions.approve")}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!delivery?.id) return;
                          try {
                            await updateStatus.mutateAsync({ id: delivery.id, data: { status: "rejected" } });
                            toast.success(t("statusUpdated"));
                            onClose();
                          } catch (error) {
                            console.error("Failed to reject delivery:", error);
                            toast.error(t("common.error"));
                          }
                        }}
                        className="cursor-pointer text-destructive hover:text-destructive"
                        title={t("actions.reject")}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
                {displayDelivery?.status === "approved" && canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!delivery?.id) return;
                      try {
                        await updateStatus.mutateAsync({ id: delivery.id, data: { status: "prepared" } });
                        toast.success(t("statusUpdated"));
                        onClose();
                      } catch (error) {
                        console.error("Failed to prepare delivery:", error);
                        toast.error(t("common.error"));
                      }
                    }}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.prepare")}
                    disabled={updateStatus.isPending}
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && delivery?.status === "draft" && (
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
                {displayDelivery?.status === "prepared" && canShip && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsShipDialogOpen(true)}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.ship")}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                )}
                {displayDelivery?.status === "shipped" && canDeliver && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeliverDialogOpen(true)}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.deliver")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {displayDelivery?.status === "delivered" && canCreateInvoice && displayDelivery?.sales_order_id && displayDelivery?.sales_order?.status !== "closed" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.createInvoice")}
                  >
                    <Receipt className="h-4 w-4" />
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
                        <TableCell>{displayDelivery.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("deliveryDate")}</TableCell>
                        <TableCell>{new Date(displayDelivery.delivery_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayDelivery.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("salesOrder")}</TableCell>
                        <TableCell>
                          {canViewSalesOrder && displayDelivery.sales_order_id ? (
                            <button
                              onClick={() => openSalesOrder(displayDelivery.sales_order_id)}
                              className="text-primary hover:underline cursor-pointer text-left"
                            >
                              {displayDelivery.sales_order?.code ?? displayDelivery.sales_order_id}
                            </button>
                          ) : (
                            <span>{displayDelivery.sales_order?.code ?? displayDelivery.sales_order_id ?? "-"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {displayDelivery.tracking_number && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("trackingNumber")}</TableCell>
                          <TableCell>{displayDelivery.tracking_number}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("courier")}</TableCell>
                          <TableCell>{displayDelivery.courier_agency?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayDelivery.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayDelivery.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Receiver Information Table */}
                {(displayDelivery.receiver_name || displayDelivery.receiver_phone || 
                  displayDelivery.delivery_address) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("receiverInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("receiverName")}</TableCell>
                              <TableCell>{displayDelivery.receiver_name ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("receiverPhone")}</TableCell>
                              <TableCell>
                                {displayDelivery.receiver_phone ? (
                                  <a
                                    href={`https://wa.me/${displayDelivery.receiver_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {displayDelivery.receiver_phone}
                                  </a>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("receiverAddress")}</TableCell>
                              <TableCell colSpan={3}>{displayDelivery.delivery_address ?? "-"}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Workflow History */}
                {(displayDelivery.shipped_at || displayDelivery.delivered_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayDelivery.shipped_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("shippedAt")}</TableCell>
                                <TableCell>{new Date(displayDelivery.shipped_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {displayDelivery.delivered_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("deliveredAt")}</TableCell>
                                <TableCell>{new Date(displayDelivery.delivered_at).toLocaleString()}</TableCell>
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
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("item.product")}</TableHead>
                          <TableHead className="text-right">{t("item.quantityOrdered")}</TableHead>
                          <TableHead className="text-right">{t("item.quantityShipped")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              {t("noItems")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {canViewProduct && item.product ? (
                                  <button
                                    onClick={() => openProduct(item.product?.id)}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    <p className="font-medium">{item.product.name}</p>
                                    {item.product.code && (
                                      <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                    )}
                                  </button>
                                ) : (
                                  <div>
                                    <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                                    {item.product?.code && (
                                      <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right font-medium">{item.quantity}</TableCell>
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

      {delivery && (
        <DeliveryForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          delivery={delivery}
        />
      )}

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteDelivery.isPending}
      />

      {delivery && (
        <>
          <ShipDialog
            open={isShipDialogOpen}
            onOpenChange={setIsShipDialogOpen}
            onConfirm={async (trackingNumber: string) => {
              await shipMutation.mutateAsync({ 
                id: delivery.id, 
                data: { tracking_number: trackingNumber }
              });
              toast.success(t("shipSuccess"));
              onClose();
            }}
            isLoading={shipMutation.isPending}
            initialTrackingNumber={delivery.tracking_number}
          />
          <DeliverDialog
            open={isDeliverDialogOpen}
            onOpenChange={setIsDeliverDialogOpen}
            onConfirm={async (data: { signatureUrl: string; receiverName: string }) => {
              await deliverMutation.mutateAsync({
                id: delivery.id,
                data: {
                  receiver_signature: data.signatureUrl,
                  receiver_name: data.receiverName,
                },
              });
              toast.success(t("deliverSuccess"));
              onClose();
            }}
            isLoading={deliverMutation.isPending}
            initialReceiverName={delivery.receiver_name}
          />
        </>
      )}

      <OrderDetailModal
        open={isSalesOrderOpen}
        onClose={() => setIsSalesOrderOpen(false)}
        order={selectedSalesOrderId ? { id: selectedSalesOrderId } as unknown as SalesOrder : null}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

      {/* Create Invoice from delivered DO's sales order */}
      {delivery && isCreateInvoiceOpen && (
        <InvoiceForm
          open={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          defaultSalesOrderId={displayDelivery?.sales_order_id}
          defaultDeliveryOrderId={displayDelivery?.id}
        />
      )}
    </>
  );
}
