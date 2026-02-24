import { useState } from "react";
import { useUserPermission } from "@/hooks/use-user-permission";

/**
 * Extracts dialog state and permission logic from OrderDetailModal / OrderList.
 * Each entity reference (employee, product, quotation) is stored by ID only —
 * the corresponding detail modal fetches full data on demand.
 */
export function useOrderDetail() {
  const canViewEmployee = useUserPermission("employee.read");
  const canViewProduct = useUserPermission("product.read");
  const canViewSalesQuotation = useUserPermission("sales_quotation.read");

  // Employee (sales rep) detail dialog
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Product detail dialog
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Sales quotation detail dialog
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);

  const openEmployee = (employeeId?: string) => {
    if (!employeeId || !canViewEmployee) return;
    setSelectedEmployeeId(employeeId);
    setIsEmployeeOpen(true);
  };

  const openProduct = (productId?: string) => {
    if (!productId || !canViewProduct) return;
    setSelectedProductId(productId);
    setIsProductOpen(true);
  };

  const openQuotation = (quotationId?: string) => {
    if (!quotationId || !canViewSalesQuotation) return;
    setSelectedQuotationId(quotationId);
    setIsQuotationOpen(true);
  };

  return {
    canViewEmployee,
    canViewProduct,
    canViewSalesQuotation,
    isEmployeeOpen,
    setIsEmployeeOpen,
    selectedEmployeeId,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    isQuotationOpen,
    setIsQuotationOpen,
    selectedQuotationId,
    openEmployee,
    openProduct,
    openQuotation,
  } as const;
}
