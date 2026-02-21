"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { deliveryService } from "../../delivery/services/delivery-service";
import { deliveryKeys } from "../../delivery/hooks/use-deliveries";
import { DOStatusBadge } from "./do-status-badge";
import { DeliveryDetailModal } from "../../delivery/components/delivery-detail-modal";
import type { DeliveryOrder } from "../../delivery/types";
import { useUserPermission } from "@/hooks/use-user-permission";

interface DOLinkedDialogProps {
  salesOrderCode: string;
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DOLinkedDialog({ salesOrderCode, salesOrderId, open, onOpenChange }: DOLinkedDialogProps) {
  const t = useTranslations("delivery");
  const canViewDelivery = useUserPermission("delivery_order.read");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: deliveryKeys.list({ sales_order_id: salesOrderId, per_page: 100 }),
    queryFn: () => deliveryService.list({ sales_order_id: salesOrderId, per_page: 100 }),
    // Only fetch when the dialog is open and the user has permission
    enabled: open && !!salesOrderId && canViewDelivery,
  });

  const deliveryOrders = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {t("title")} — {salesOrderCode}
          </DialogTitle>
        </DialogHeader>

        {/* If user doesn't have permission, show inline warning instead of fetching and toasts */}
        {!canViewDelivery ? (
          <div className="p-6 text-center">
            <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view delivery orders."}</p>
          </div>
        ) : (
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("deliveryDate")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("trackingNumber") || "Tracking"}</TableHead>
                <TableHead>{t("type") || "Type"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : deliveryOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {t("notFound")}
                  </TableCell>
                </TableRow>
              ) : (
                deliveryOrders.map((do_) => (
                  <TableRow key={do_.id}>
                    <TableCell>
                      {canViewDelivery ? (
                        <button
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            setSelectedDelivery({ id: do_.id } as DeliveryOrder);
                            setDetailOpen(true);
                          }}
                        >
                          {do_.code}
                        </button>
                      ) : (
                        <span className="font-medium">{do_.code}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {do_.delivery_date
                        ? new Date(do_.delivery_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DOStatusBadge status={do_.status} className="text-xs" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {do_.tracking_number ?? "-"}
                    </TableCell>
                    <TableCell>
                      {do_.is_partial_delivery ? (
                        <span className="text-xs text-warning font-medium">{t("partial") || "Partial"}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("full") || "Full"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </DialogContent>
      <DeliveryDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        delivery={selectedDelivery}
      />
    </Dialog>
  );
}
