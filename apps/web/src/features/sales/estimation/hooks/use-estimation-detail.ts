import { useState } from "react";
import { useUserPermission } from "@/hooks/use-user-permission";

/**
 * Extracts dialog state and permission logic from EstimationDetailModal / EstimationList.
 * Each entity reference (employee, product) is stored by ID only —
 * the corresponding detail modal fetches full data on demand.
 */
export function useEstimationDetail() {
  const canViewEmployee = useUserPermission("employee.read");
  const canViewProduct = useUserPermission("product.read");

  // Employee (sales rep) detail dialog
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Product detail dialog
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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

  return {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen,
    setIsEmployeeOpen,
    selectedEmployeeId,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    openEmployee,
    openProduct,
  } as const;
}
