import { useState } from "react";

import { useUserPermission } from "@/hooks/use-user-permission";

import { useSalesPayments } from "./use-sales-payments";

interface UseSalesPaymentsLinkedDialogParams {
  open: boolean;
  invoiceId: string;
}

export function useSalesPaymentsLinkedDialog({ open, invoiceId }: UseSalesPaymentsLinkedDialogParams) {
  const canViewPayment = useUserPermission("sales_payment.read");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const { data, isLoading } = useSalesPayments(
    { invoice_id: invoiceId, per_page: 20 },
    { enabled: open && !!invoiceId && canViewPayment },
  );

  const payments = data?.data ?? [];

  return {
    canViewPayment,
    selectedPaymentId,
    setSelectedPaymentId,
    payments,
    isLoading,
  } as const;
}
