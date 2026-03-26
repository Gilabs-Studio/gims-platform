import { useMemo, useState } from "react";

import { useUserPermission } from "@/hooks/use-user-permission";

import { useCustomerInvoiceDPs } from "../../customer-invoice-down-payments/hooks/use-customer-invoice-dp";
import { useInvoices } from "../../invoice/hooks/use-invoices";

export type InvoiceLinkedTab = "invoices" | "dp";

interface UseInvoiceLinkedDialogParams {
  open: boolean;
  salesOrderId: string;
}

export function useInvoiceLinkedDialog({ open, salesOrderId }: UseInvoiceLinkedDialogParams) {
  const canViewInvoice = useUserPermission("customer_invoice.read");
  const canViewDP = useUserPermission("customer_invoice.read");

  const [activeTab, setActiveTab] = useState<InvoiceLinkedTab>("invoices");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoiceForPayments, setSelectedInvoiceForPayments] = useState<{ id: string; code: string } | null>(
    null,
  );

  const { data: invoiceData, isLoading: isInvoiceLoading } = useInvoices(
    { sales_order_id: salesOrderId, per_page: 20 },
    { enabled: open && !!salesOrderId && canViewInvoice && activeTab === "invoices" },
  );

  const { data: dpData, isLoading: isDPLoading } = useCustomerInvoiceDPs(
    { sales_order_id: salesOrderId, per_page: 20 },
    { enabled: open && !!salesOrderId && canViewDP && activeTab === "dp" },
  );

  const invoices = useMemo(() => invoiceData?.data ?? [], [invoiceData?.data]);
  const dpInvoices = useMemo(() => dpData?.data ?? [], [dpData?.data]);

  const dpCodes = useMemo(() => new Set(dpInvoices.map((dp) => dp.code)), [dpInvoices]);
  const visibleInvoices = useMemo(() => invoices.filter((invoice) => !dpCodes.has(invoice.code)), [invoices, dpCodes]);

  const totalDPAmount = useMemo(
    () => dpInvoices.reduce((sum, dp) => sum + (dp.amount ?? 0), 0),
    [dpInvoices],
  );
  const totalInvoiceAmount = useMemo(
    () => visibleInvoices.reduce((sum, invoice) => sum + (invoice.amount ?? 0), 0),
    [visibleInvoices],
  );

  const hasNoPermission = !canViewInvoice && !canViewDP;

  const openInvoiceDetail = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setDetailOpen(true);
  };

  const openPaymentDialog = (invoiceId: string, invoiceCode: string) => {
    setSelectedInvoiceForPayments({ id: invoiceId, code: invoiceCode });
    setIsPaymentOpen(true);
  };

  const isPaymentStatus = (status?: string): boolean => {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "waiting_payment" || normalized === "partial" || normalized === "paid";
  };

  return {
    canViewInvoice,
    canViewDP,
    activeTab,
    setActiveTab,
    hasNoPermission,
    visibleInvoices,
    dpInvoices,
    isInvoiceLoading,
    isDPLoading,
    totalDPAmount,
    totalInvoiceAmount,
    selectedInvoiceId,
    detailOpen,
    setDetailOpen,
    selectedDPId,
    setSelectedDPId,
    isPaymentOpen,
    setIsPaymentOpen,
    selectedInvoiceForPayments,
    setSelectedInvoiceForPayments,
    openInvoiceDetail,
    openPaymentDialog,
    isPaymentStatus,
  } as const;
}
