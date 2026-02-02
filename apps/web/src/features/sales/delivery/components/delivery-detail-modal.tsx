"use client";

import { useState } from "react";
import { ShipDialog } from "./ship-dialog";
import { DeliverDialog } from "./deliver-dialog";
import { Edit, Trash2, Package, Truck, CheckCircle2, XCircle, FileText, Clock, Info, History, Warehouse, MapPin, Phone, User, Calendar, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
// Tabs import removed
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
import { formatCurrency, resolveImageUrl } from "@/lib/utils";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface DeliveryDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly delivery: DeliveryOrder | null;
}

function SignaturePreview({ url, onClick }: { url?: string; onClick: () => void }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="rounded-lg border overflow-hidden bg-muted/20 w-full aspect-video flex items-center justify-center text-muted-foreground/50">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg border overflow-hidden bg-muted/20 w-48 h-48 cursor-pointer hover:opacity-90 transition-opacity" 
      onClick={onClick}
    >
      <img 
        src={url}
        alt="Proof of Delivery" 
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
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
  const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
  const [isDeliverDialogOpen, setIsDeliverDialogOpen] = useState(false);
  
  // Pagination state
  // Pagination state
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
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
  
  // Client-side pagination logic
  const totalItems = items.length;
  const paginatedItems = items.slice((itemsPage - 1) * pageSize, itemsPage * pageSize);

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
          <Badge variant="warning" className="text-xs font-medium">
            <Package className="h-3 w-3 mr-1.5" />
            {t("status.prepared")}
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
    setIsShipDialogOpen(true);
  };

  const handleShipConfirm = async (trackingNumber: string) => {
    if (!delivery?.id) return;
    try {
      await shipDelivery.mutateAsync({
        id: delivery.id,
        data: { tracking_number: trackingNumber },
      });
      toast.success(t("statusUpdated"));
      setIsShipDialogOpen(false);
    } catch (error) {
      console.error("Failed to ship delivery order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDeliver = async () => {
    setIsDeliverDialogOpen(true);
  };

  const handleDeliverConfirm = async ({ signatureUrl, receiverName }: { signatureUrl: string; receiverName: string }) => {
    if (!delivery?.id) return;
    try {
      await deliverDelivery.mutateAsync({
        id: delivery.id,
        data: { 
          receiver_signature: signatureUrl, 
          receiver_name: receiverName 
        },
      });
      toast.success(t("statusUpdated"));
      setIsDeliverDialogOpen(false);
    } catch (error) {
      console.error("Failed to deliver order:", error);
      toast.error(t("common.error"));
    }
  };

  const handlePrepare = async () => {
    if (!delivery?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: delivery.id,
        data: { status: "prepared" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to prepare order:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="2xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2 flex items-center gap-3">
                  {displayDelivery?.code ?? t("common.view")}
                  {delivery && getStatusBadge(delivery.status)}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{displayDelivery?.delivery_date && new Date(displayDelivery.delivery_date).toLocaleDateString()}</span>
                  </div>
                  {displayDelivery?.is_partial_delivery && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <Badge variant="outline" className="text-[10px] py-0 h-5">
                        {t("isPartialDelivery")}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && delivery?.status === "draft" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="cursor-pointer"
                      title={t("common.edit")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrepare}
                      disabled={updateStatus.isPending}
                      className="cursor-pointer text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                      title={t("actions.prepare")}
                    >
                      <Package className="h-4 w-4" />
                    </Button>
                  </>
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
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Meta & Context */}
                <div className="space-y-6 flex flex-col">
                  {/* Warehouse Status Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex-none">
                    <div className="bg-muted/50 px-6 py-4 border-b">
                       <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Warehouse className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{t("warehouse")}</span>
                      </div>
                      <div className="text-lg font-bold leading-tight">
                        {displayDelivery.warehouse?.name ?? "N/A"}
                      </div>
                    </div>
                    {displayDelivery.notes && (
                      <div className="p-4 bg-muted/20 text-sm text-muted-foreground border-b">
                         <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="italic">"{displayDelivery.notes}"</p>
                         </div>
                      </div>
                    )}
                  </div>

                  {/* Workflow & tracking */}
                  {(displayDelivery.shipped_at || displayDelivery.delivered_at || displayDelivery.cancelled_at || displayDelivery.tracking_number) && (
                     <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex-none">
                       <div className="bg-muted/50 px-4 py-3 border-b">
                          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                             <History className="h-3.5 w-3.5" />
                             {t("common.workflow")}
                          </h3>
                       </div>
                       <div className="p-4 space-y-4">
                          {displayDelivery.tracking_number && (
                            <div className="flex items-start gap-3 pb-3 border-b border-dashed">
                              <Truck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{t("trackingNumber")}</p>
                                <p className="font-mono font-medium">{displayDelivery.tracking_number}</p>
                                {displayDelivery.courier_agency && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{displayDelivery.courier_agency.name}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {displayDelivery.shipped_at && (
                           <div className="flex items-start gap-3">
                              <Truck className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">{t("status.shipped")}</p>
                                <p className="text-xs text-muted-foreground">{new Date(displayDelivery.shipped_at).toLocaleString()}</p>
                              </div>
                           </div>
                          )}
                          
                          {displayDelivery.delivered_at && (
                           <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("status.delivered")}</p>
                                <p className="text-xs text-muted-foreground">{new Date(displayDelivery.delivered_at).toLocaleString()}</p>
                              </div>
                           </div>
                          )}
                       </div>
                     </div>
                  )}

                  {/* Receiver Info */}
                   <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex-none">
                      <div className="bg-muted/50 px-4 py-3 border-b">
                         <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                           <User className="h-3.5 w-3.5" />
                           {t("receiverName")} & {t("deliveryAddress")}
                         </h3>
                      </div>
                      <div className="p-4 space-y-4">
                         {(displayDelivery.receiver_name || displayDelivery.receiver_phone) ? (
                            <div className="flex items-start gap-3">
                               <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                               <div>
                                  <p className="font-medium text-sm">{displayDelivery.receiver_name || "Unknown Receiver"}</p>
                                  {displayDelivery.receiver_phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                      <Phone className="h-3 w-3" />
                                      {displayDelivery.receiver_phone}
                                    </div>
                                  )}
                               </div>
                            </div>
                         ) : (
                            <p className="text-xs text-muted-foreground italic pl-1">{t("receiverName")} not set</p>
                         )}
                         
                         {displayDelivery.delivery_address && (
                            <div className="flex items-start gap-3 pt-3 border-t border-dashed">
                               <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                               <p className="text-sm text-muted-foreground leading-snug">{displayDelivery.delivery_address}</p>
                            </div>
                         )}

                         {displayDelivery.receiver_signature && (
                            <div className="pt-3 border-t border-dashed">
                               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("receiverSignature")}</p>
                               <SignaturePreview 
                                  url={resolveImageUrl(displayDelivery.receiver_signature)} 
                                  onClick={() => window.open(resolveImageUrl(displayDelivery.receiver_signature), '_blank')}
                               />
                            </div>
                         )}
                      </div>
                   </div>

                   {/* Sales Order Link */}
                   {displayDelivery.sales_order && (
                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex-none mt-auto">
                       <div className="bg-muted/50 px-4 py-3 border-b flex justify-between items-center">
                          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                             <FileText className="h-3.5 w-3.5" />
                             {t("salesOrder")}
                          </h3>
                             <Badge variant={displayDelivery.sales_order.status === "confirmed" ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                             {displayDelivery.sales_order.status}
                             </Badge>
                       </div>
                       <div className="p-4">
                          <div className="flex justify-between items-end">
                             <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("code")}</p>
                                <p className="font-semibold">{displayDelivery.sales_order.code}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("common.total")}</p>
                                <p className="font-bold text-primary">{formatCurrency(displayDelivery.sales_order.total_amount)}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                   )}
                </div>

                {/* Right Column - Items Table */}
                <div className="lg:col-span-2 flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
                   <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {t("tabs.items")}
                        <Badge variant="secondary" className="ml-1 rounded-full px-2">{items.length}</Badge>
                      </h3>
                   </div>
                   
                   <div className="flex-1 overflow-auto">
                     <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                          <TableRow>
                            <TableHead>{t("common.product")}</TableHead>
                            <TableHead className="text-right">{t("common.quantity")}</TableHead>
                            <TableHead>{t("common.batch")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Package className="h-10 w-10 opacity-20" />
                                  <p>{t("noItems")}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedItems.map((item) => (
                              <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="pl-6 py-4">
                                  <div>
                                    <p className="font-medium text-sm">{item.product?.name ?? t("unknownProduct")}</p>
                                    {item.product?.code && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.product.code}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                   {item.quantity}
                                </TableCell>
                                <TableCell>
                                  {item.inventory_batch?.batch_number ? (
                                    <div className="flex flex-col gap-1">
                                      <Badge variant="outline" className="font-mono text-xs w-fit">
                                        {item.inventory_batch.batch_number}
                                      </Badge>
                                      {item.inventory_batch.expiry_date && (
                                        <span className="text-[10px] text-muted-foreground">
                                          exp: {new Date(item.inventory_batch.expiry_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                   </div>
                   {totalItems > 0 && (
                      <div className="border-t p-2">
                         <DataTablePagination
                           pageIndex={itemsPage}
                           pageSize={pageSize}
                           rowCount={totalItems}
                           onPageChange={setItemsPage}
                           onPageSizeChange={(newSize) => {
                             setPageSize(newSize);
                             setItemsPage(1);
                           }}
                           showPageSize={false}
                         />
                      </div>
                   )}
                </div>

              </div>
            </div>
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

      <ShipDialog
        open={isShipDialogOpen}
        onOpenChange={setIsShipDialogOpen}
        onConfirm={handleShipConfirm}
        isLoading={shipDelivery.isPending}
        initialTrackingNumber={displayDelivery?.tracking_number}
      />

      <DeliverDialog
        open={isDeliverDialogOpen}
        onOpenChange={setIsDeliverDialogOpen}
        onConfirm={handleDeliverConfirm}
        isLoading={deliverDelivery.isPending}
        initialReceiverName={displayDelivery?.receiver_name}
      />
    </>
  );
}
