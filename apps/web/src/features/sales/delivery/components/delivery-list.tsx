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
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Package, Truck, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useDeliveryOrders, useDeleteDeliveryOrder, useUpdateDeliveryOrderStatus, useShipDeliveryOrder, useDeliverDeliveryOrder } from "../hooks/use-deliveries";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { DeliveryForm } from "./delivery-form";
import { DeliveryDetailModal } from "./delivery-detail-modal";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import type { DeliveryOrder, DeliveryOrderStatus } from "../types";
import type { SalesOrder, SalesOrderSummary } from "../../order/types";
import { formatCurrency } from "@/lib/utils";

export function DeliveryList() {
  const t = useTranslations("delivery");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DeliveryOrderStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryOrder | null>(null);
  const [viewingDelivery, setViewingDelivery] = useState<DeliveryOrder | null>(null);
  const [viewingSalesOrder, setViewingSalesOrder] = useState<SalesOrder | SalesOrderSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDeliveryOrders({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("delivery_order.create");
  const canUpdate = useUserPermission("delivery_order.update");
  const canDelete = useUserPermission("delivery_order.delete");
  const canView = useUserPermission("delivery_order.read");

  const deleteDelivery = useDeleteDeliveryOrder();
  const updateStatus = useUpdateDeliveryOrderStatus();
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

  const handleShip = async (id: string) => {
    const trackingNumber = prompt(t("trackingNumber") + ":");
    if (!trackingNumber) return;
    try {
      await shipDelivery.mutateAsync({
        id,
        data: { tracking_number: trackingNumber },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDeliver = async (id: string) => {
    // TODO: Implement signature capture in Sprint 9
    const signature = prompt(t("common.enterSignature") + ":");
    if (!signature) return;
    try {
      await deliverDelivery.mutateAsync({
        id,
        data: { receiver_signature: signature },
      });
      toast.success(t("statusUpdated"));
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
      case "prepared":
        return (
          <Badge variant="default" className="bg-yellow-600">
            <Package className="h-3 w-3 mr-1" />
            {t("status.prepared")}
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="default" className="bg-purple-600">
            <Truck className="h-3 w-3 mr-1" />
            {t("status.shipped")}
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="default" className="bg-green-600">
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
                    {delivery.sales_order ? (
                      <button
                        onClick={() => setViewingSalesOrder(delivery.sales_order!)}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {delivery.sales_order.code}
                      </button>
                    ) : (
                      "-"
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
                            <DropdownMenuItem onClick={() => handlePrepare(delivery.id)} className="cursor-pointer">
                              <Package className="h-4 w-4 mr-2" />
                              {t("actions.prepare")}
                            </DropdownMenuItem>
                          )}
                          {canShip && delivery.status === "prepared" && (
                            <DropdownMenuItem onClick={() => handleShip(delivery.id)} className="cursor-pointer">
                              <Truck className="h-4 w-4 mr-2" />
                              {t("actions.ship")}
                            </DropdownMenuItem>
                          )}
                          {canDeliver && delivery.status === "shipped" && (
                            <DropdownMenuItem onClick={() => handleDeliver(delivery.id)} className="cursor-pointer">
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

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
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

      {viewingSalesOrder && (
        <OrderDetailModal
          open={!!viewingSalesOrder}
          onClose={() => setViewingSalesOrder(null)}
          order={viewingSalesOrder}
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
    </div>
  );
}
