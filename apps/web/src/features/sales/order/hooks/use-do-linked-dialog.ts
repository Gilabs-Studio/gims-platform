import { useState } from "react";

import { useUserPermission } from "@/hooks/use-user-permission";

import { useDeliveryOrders } from "../../delivery/hooks/use-deliveries";

interface UseDOLinkedDialogParams {
  open: boolean;
  salesOrderId: string;
}

export function useDOLinkedDialog({ open, salesOrderId }: UseDOLinkedDialogParams) {
  const canViewDelivery = useUserPermission("delivery_order.read");

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useDeliveryOrders(
    { sales_order_id: salesOrderId, per_page: 20 },
    { enabled: open && !!salesOrderId && canViewDelivery },
  );

  const deliveryOrders = data?.data ?? [];

  const openDeliveryDetail = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setDetailOpen(true);
  };

  return {
    canViewDelivery,
    deliveryOrders,
    isLoading,
    selectedDeliveryId,
    detailOpen,
    setDetailOpen,
    openDeliveryDetail,
  } as const;
}
