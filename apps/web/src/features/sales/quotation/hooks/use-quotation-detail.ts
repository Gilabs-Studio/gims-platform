import { useState } from "react";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { Employee } from "../types";

export function useQuotationDetail() {
  const t = useTranslations("quotation");

  // Permission checks
  const canViewEmployee = useUserPermission("employee.read");
  const canViewProduct = useUserPermission("product.read");

  // Employee (sales rep) detail dialog
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Product detail dialog — store id only, the modal fetches full data
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const openEmployee = (employee?: Employee) => {
    if (!employee || !canViewEmployee) return;
    setSelectedEmployee(employee);
    setIsEmployeeOpen(true);
  };

  const openProduct = (productId?: string) => {
    if (!productId || !canViewProduct) return;
    setSelectedProductId(productId);
    setIsProductOpen(true);
  };

  const formatWhatsAppLink = (phone?: string, code?: string) => {
    if (!phone) return "#";
    const digits = phone.replace(/[^0-9+]/g, "");
    const normalized = digits.startsWith("+") ? digits.replace("+", "") : digits;
    const greeting = t("whatsapp.greeting");
    const text = encodeURIComponent(`${greeting} ${code ?? ""}`.trim());
    return `https://wa.me/${normalized}?text=${text}`;
  };

  return {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen,
    setIsEmployeeOpen,
    selectedEmployee,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    openEmployee,
    openProduct,
    formatWhatsAppLink,
  } as const;
}
