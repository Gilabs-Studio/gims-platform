"use client";

import { useState } from "react";
import { Edit, Trash2, Package, Truck, CheckCircle2, XCircle, FileText, Clock, Info, History, DollarSign, Warehouse, MapPin, Phone, User, Calendar } from "lucide-react";
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
import {
  useDeleteDeliveryOrder,
  useUpdateDeliveryOrderStatus,
  useDeliveryOrder,
  useShipDeliveryOrder,
  useDeliverDeliveryOrder,
} from "../hooks/use-deliveries";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { DeliveryOrder } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

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
  const updateStatus = useUpdateDeliveryOrderStatus();
  const shipDelivery = useShipDeliveryOrder();
  const deliverDelivery = useDeliverDeliveryOrder();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("delivery");

  // Fetch full detail when modal opens
  const { data: detailData, isLoading } = useDeliveryOrder(delivery?.id ?? "", {
    enabled: open && !!delivery?.id,
  });

  const canEdit = useUserPermission("delivery_order.update");
  const canDelete = useUserPermission("delivery_order.delete");
  const canShip = useUserPermission("delivery_order.ship");
  const canDeliver = useUserPermission("delivery_order.deliver");

  if (!delivery) return null;

  // Use detailed data if available, otherwise use passed delivery
  const displayDelivery = detailData?.data ?? delivery;
  const items = displayDelivery.items ?? [];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "prepared":
        return (
          <Badge variant="default" className="text-xs font-medium bg-yellow-600">
            <Package className="h-3 w-3 mr-1.5" />
            {t("status.prepared")}
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="default" className="text-xs font-medium bg-purple-600">
            <Truck className="h-3 w-3 mr-1.5" />
            {t("status.shipped")}
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="default" className="text-xs font-medium bg-green-600">
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
      console.error("Failed to delete delivery order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleShip = async () => {
    if (!delivery?.id) return;
    const trackingNumber = prompt(t("trackingNumber") + ":");
    if (!trackingNumber) return;
    try {
      await shipDelivery.mutateAsync({
        id: delivery.id,
        data: { tracking_number: trackingNumber },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to ship delivery order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDeliver = async () => {
    if (!delivery?.id) return;
    // TODO: Implement signature capture in Sprint 9
    const signature = prompt(t("common.enterSignature") + ":");
    if (!signature) return;
    try {
      await deliverDelivery.mutateAsync({
        id: delivery.id,
        data: { receiver_signature: signature },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to deliver order:", error);
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
                  {displayDelivery?.is_partial_delivery && (
                    <Badge variant="outline" className="text-xs">
                      {t("isPartialDelivery")}
                    </Badge>
                  )}
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
                    onClick={handleShip}
                    disabled={shipDelivery.isPending}
                    className="cursor-pointer text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    title={t("actions.ship")}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                )}
                {displayDelivery?.status === "shipped" && canDeliver && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeliver}
                    disabled={deliverDelivery.isPending}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.deliver")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
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
                <TabsTrigger value="tracking">
                  <Truck className="h-4 w-4 mr-2" />
                  {t("tabs.tracking")}
                </TabsTrigger>
              </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-8 py-6">
              
              {/* Hero Section - Warehouse & Status */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Warehouse className="h-5 w-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">{t("warehouse")}</span>
                      </div>
                      <div className="text-3xl font-bold tracking-tight text-primary">
                        {displayDelivery.warehouse?.name ?? "N/A"}
                      </div>
                      {displayDelivery.notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {displayDelivery.notes}
                        </p>
                      )}
                    </div>
                    {(displayDelivery.shipped_at || displayDelivery.delivered_at || displayDelivery.cancelled_at) && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <History className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        {displayDelivery.shipped_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <Truck className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-purple-700 dark:text-purple-400">{t("status.shipped")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayDelivery.shipped_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayDelivery.delivered_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-green-700 dark:text-green-400">{t("status.delivered")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayDelivery.delivered_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayDelivery.cancelled_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-red-700 dark:text-red-400">{t("status.cancelled")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayDelivery.cancelled_at).toLocaleString()}
                              </p>
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
                {/* Left Section - Delivery & Receiver Details */}
                <div className="space-y-6">
                  {/* Delivery Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("common.delivery")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                        <p className="text-base font-semibold">{displayDelivery.code}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("deliveryDate")}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-sm font-medium">{new Date(displayDelivery.delivery_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {displayDelivery.warehouse && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("warehouse")}</p>
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm font-medium">{displayDelivery.warehouse.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Receiver & Shipping Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Receiver & Shipping
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      {/* Receiver Info */}
                      {(displayDelivery.receiver_name || displayDelivery.receiver_phone || displayDelivery.delivery_address) && (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs text-muted-foreground">{t("receiverName")}</p>
                              <p className="text-sm font-medium">{displayDelivery.receiver_name || "-"}</p>
                              {displayDelivery.receiver_phone && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                  <Phone className="h-3 w-3" />
                                  {displayDelivery.receiver_phone}
                                </div>
                              )}
                            </div>
                          </div>
                          {displayDelivery.delivery_address && (
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <MapPin className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <p className="text-xs text-muted-foreground">{t("deliveryAddress")}</p>
                                <p className="text-sm font-medium">{displayDelivery.delivery_address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Separator if both receiver and shipping info exist */}
                      {((displayDelivery.receiver_name || displayDelivery.delivery_address) && 
                        (displayDelivery.courier_agency || displayDelivery.tracking_number)) && (
                        <Separator />
                      )}

                      {/* Shipping Info */}
                      {(displayDelivery.courier_agency || displayDelivery.tracking_number) && (
                        <div className="grid grid-cols-2 gap-4">
                          {displayDelivery.courier_agency && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("courierAgency")}</p>
                              <div className="flex items-center gap-2">
                                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-sm font-medium truncate">{displayDelivery.courier_agency.name}</p>
                              </div>
                            </div>
                          )}
                          {displayDelivery.tracking_number && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("trackingNumber")}</p>
                              <p className="text-sm font-medium font-mono">{displayDelivery.tracking_number}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Sales Order & Financials */}
                <div className="space-y-6">
                  {/* Sales Order Information Card */}
                  {displayDelivery.sales_order && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="bg-muted/50 px-6 py-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          {t("salesOrder")}
                        </h3>
                      </div>
                      <div className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                            <p className="text-base font-semibold">{displayDelivery.sales_order.code}</p>
                          </div>
                          <Badge variant={displayDelivery.sales_order.status === "confirmed" ? "default" : "secondary"}>
                            {displayDelivery.sales_order.status}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-4 px-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                          <span className="text-base font-bold text-primary">{t("common.total")}</span>
                          <span className="text-2xl font-bold text-primary">{formatCurrency(displayDelivery.sales_order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary/Notes if no SO, or extra spacing */}
                  {!displayDelivery.sales_order && (
                    <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                       <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                       <p className="text-sm">No linked Sales Order</p>
                    </div>
                  )}
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
                      <TableHead>{t("item.batch")}</TableHead>
                      <TableHead>{t("item.installationStatus")}</TableHead>
                      <TableHead>{t("item.functionTestStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t("noItems")}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
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
                          <TableCell>
                            {item.inventory_batch?.batch_number ? (
                              <Badge variant="outline">{item.inventory_batch.batch_number}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.installation_status || "-"}</TableCell>
                          <TableCell>{item.function_test_status || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="space-y-4 py-4">
              {displayDelivery.tracking_number ? (
                <div className="bg-card rounded-xl border shadow-sm p-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("trackingNumber")}</p>
                      <p className="text-lg font-mono font-semibold">{displayDelivery.tracking_number}</p>
                    </div>
                    {displayDelivery.courier_agency && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("courierAgency")}</p>
                        <p className="text-sm font-medium">{displayDelivery.courier_agency.name}</p>
                      </div>
                    )}
                    {displayDelivery.shipped_at && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("shippedAt")}</p>
                        <p className="text-sm font-medium">{new Date(displayDelivery.shipped_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("trackingNumber")} not available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {delivery && (
        <DeliveryForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          delivery={delivery}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteDelivery.isPending}
      />
    </>
  );
}
