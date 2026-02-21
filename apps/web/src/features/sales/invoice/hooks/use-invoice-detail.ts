import { useState } from "react";
import { useUserPermission } from "@/hooks/use-user-permission";

/**
 * Extracts dialog state and permission logic from InvoiceDetailModal / InvoiceList.
 * Each entity reference (product, sales order) is stored by ID only —
 * the corresponding detail modal fetches full data on demand.
 */
export function useInvoiceDetail() {
  const canViewProduct = useUserPermission("product.read");
  const canViewSalesOrder = useUserPermission("sales_order.read");

  // Product detail dialog
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Sales order detail dialog
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(null);

  const openProduct = (productId?: string) => {
    if (!productId || !canViewProduct) return;
    setSelectedProductId(productId);
    setIsProductOpen(true);
  };

  const openSalesOrder = (salesOrderId?: string) => {
    if (!salesOrderId || !canViewSalesOrder) return;
    setSelectedSalesOrderId(salesOrderId);
    setIsSalesOrderOpen(true);
  };

  return {
    canViewProduct,
    canViewSalesOrder,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    isSalesOrderOpen,
    setIsSalesOrderOpen,
    selectedSalesOrderId,
    openProduct,
    openSalesOrder,
  } as const;
}
