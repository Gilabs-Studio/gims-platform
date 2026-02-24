"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Package, Truck, CheckCircle2, XCircle, FileText, Send } from "lucide-react";
import { useDeliveryOrders, useDeleteDeliveryOrder, useUpdateDeliveryOrderStatus, useApproveDeliveryOrder, useShipDeliveryOrder, useDeliverDeliveryOrder } from "../hooks/use-deliveries";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { DeliveryForm } from "./delivery-form";
import { DeliveryDetailModal } from "./delivery-detail-modal";

import { ShipDialog } from "./ship-dialog";
import { DeliverDialog } from "./deliver-dialog";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import type { DeliveryOrder, DeliveryOrderStatus } from "../types";
import type { SalesOrder } from "../../order/types";
import { formatCurrency } from "@/lib/utils";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function DeliveryList() {
  const t = useTranslations("delivery");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<DeliveryOrderStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryOrder | null>(null);
  const [viewingDelivery, setViewingDelivery] = useState<DeliveryOrder | null>(null);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(null);
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [shipDeliveryId, setShipDeliveryId] = useState<string | null>(null);
  const [deliverDeliveryId, setDeliverDeliveryId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDeliveryOrders({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // ... (existing code)

  const handleShip = (id: string) => {
    setShipDeliveryId(id);
  };

  const handleShipConfirm = async (trackingNumber: string) => {
    if (!shipDeliveryId) return;
    try {
      await shipDelivery.mutateAsync({
        id: shipDeliveryId,
        data: { tracking_number: trackingNumber },
      });
      toast.success(t("statusUpdated"));
      setShipDeliveryId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const canCreate = useUserPermission("delivery_order.create");
  const canUpdate = useUserPermission("delivery_order.update");
  const canDelete = useUserPermission("delivery_order.delete");
  const canView = useUserPermission("delivery_order.read");
  const canApprove = useUserPermission("delivery_order.approve");
  const canViewSalesOrder = useUserPermission("sales_order.read");

  const deleteDelivery = useDeleteDeliveryOrder();
  const updateStatus = useUpdateDeliveryOrderStatus();
  const approveDelivery = useApproveDeliveryOrder();
  const shipDelivery = useShipDeliveryOrder();
  const deliverDelivery = useDeliverDeliveryOrder();
  const deliveries = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const canShip = useUserPermission("delivery_order.ship");
  const canDeliver = useUserPermission("delivery_order.deliver");

  const handleEdit = (delivery: DeliveryOrder) => {
    setEditingDelivery(delivery);
    setIsFormOpen(true);
  };

  const handleView = (delivery: DeliveryOrder) => {
    setViewingDelivery(delivery);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteDelivery.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDelivery(null);
  };

  const handleStatusChange = async (
    id: string,
    status: DeliveryOrderStatus,
    cancellationReason?: string,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status, cancellation_reason: cancellationReason },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handlePrepare = async (id: string) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status: "prepared" },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  // handleShip moved above to set state

  const handleDeliver = (id: string) => {
    setDeliverDeliveryId(id);
  };

  const handleDeliverConfirm = async ({ signatureUrl, receiverName }: { signatureUrl: string; receiverName: string }) => {
    if (!deliverDeliveryId) return;
    try {
      await deliverDelivery.mutateAsync({
        id: deliverDeliveryId,
        data: { 
          receiver_signature: signatureUrl,
          receiver_name: receiverName,
        },
      });
      toast.success(t("statusUpdated"));
      setDeliverDeliveryId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: DeliveryOrderStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="info">
            <Send className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
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
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.delivered")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as DeliveryOrderStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="sent">{t("status.pending")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
            <SelectItem value="prepared">{t("status.prepared")}</SelectItem>
            <SelectItem value="shipped">{t("status.shipped")}</SelectItem>
            <SelectItem value="delivered">{t("status.delivered")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("deliveryDate")}</TableHead>
              <TableHead>{t("salesOrder")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("trackingNumber")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                </TableRow>
              ))
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(delivery)}>
                    {delivery.code}
                  </TableCell>
                  <TableCell>
                    {delivery.delivery_date
                      ? new Date(delivery.delivery_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {delivery.sales_order && canViewSalesOrder ? (
                      <button
                        onClick={() => {
                          setSelectedSalesOrderId(delivery.sales_order!.id);
                          setIsSalesOrderOpen(true);
                        }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {delivery.sales_order.code}
                      </button>
                    ) : (
                      <span>{delivery.sales_order?.code ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                  <TableCell>{delivery.tracking_number || "-"}</TableCell>
                  <TableCell>
                    {(canUpdate || canDelete || canView) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem onClick={() => handleView(delivery)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && delivery.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(delivery)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && delivery.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(delivery.id, "sent")}
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.send")}
                            </DropdownMenuItem>
                          )}
                          {delivery.status === "sent" && (
                            <>
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() => approveDelivery.mutateAsync(delivery.id).then(() => toast.success(t("statusUpdated"))).catch(() => toast.error(t("common.error")))}
                                  className="cursor-pointer text-green-600 focus:text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(delivery.id, "rejected")}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {canUpdate && delivery.status === "approved" && (
                            <DropdownMenuItem onClick={() => handlePrepare(delivery.id)} className="cursor-pointer text-blue-600 focus:text-blue-600">
                              <Package className="h-4 w-4 mr-2" />
                              {t("actions.prepare")}
                            </DropdownMenuItem>
                          )}
                          {canShip && delivery.status === "prepared" && (
                            <DropdownMenuItem onClick={() => handleShip(delivery.id)} className="cursor-pointer text-blue-600 focus:text-blue-600">
                              <Truck className="h-4 w-4 mr-2" />
                              {t("actions.ship")}
                            </DropdownMenuItem>
                          )}
                          {canDeliver && delivery.status === "shipped" && (
                            <DropdownMenuItem onClick={() => handleDeliver(delivery.id)} className="cursor-pointer text-green-600 focus:text-green-600">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.deliver")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && delivery.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(delivery.id)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {canCreate && (
        <DeliveryForm
          open={isFormOpen}
          onClose={handleFormClose}
          delivery={editingDelivery}
        />
      )}

      {canView && viewingDelivery && (
        <DeliveryDetailModal
          open={!!viewingDelivery}
          onClose={() => setViewingDelivery(null)}
          delivery={viewingDelivery}
        />
      )}

      {selectedSalesOrderId && (
        <OrderDetailModal
          open={isSalesOrderOpen}
          onClose={() => setIsSalesOrderOpen(false)}
          order={{ id: selectedSalesOrderId } as unknown as SalesOrder}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.delivery")}
          isLoading={deleteDelivery.isPending}
        />
      )}

      <ShipDialog
        open={!!shipDeliveryId}
        onOpenChange={(open) => !open && setShipDeliveryId(null)}
        onConfirm={handleShipConfirm}
        isLoading={shipDelivery.isPending}
        initialTrackingNumber={deliveries.find(d => d.id === shipDeliveryId)?.tracking_number}
      />

      <DeliverDialog
        open={!!deliverDeliveryId}
        onOpenChange={(open) => !open && setDeliverDeliveryId(null)}
        onConfirm={handleDeliverConfirm}
        isLoading={deliverDelivery.isPending}
        initialReceiverName={deliveries.find(d => d.id === deliverDeliveryId)?.receiver_name}
      />
    </div>
  );
}
