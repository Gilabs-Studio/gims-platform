"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import { SalesPaymentDetail } from "@/features/sales/payments/components/sales-payment-detail";
import { salesPaymentsService } from "@/features/sales/payments/services/sales-payments-service";
import { salesPaymentKeys } from "@/features/sales/payments/hooks/use-sales-payments";
import { Badge } from "@/components/ui/badge";

interface SalesPaymentsLinkedDialogProps {
  invoiceCode: string;
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesPaymentsLinkedDialog({ invoiceCode, invoiceId, open, onOpenChange }: SalesPaymentsLinkedDialogProps) {
  const t = useTranslations("salesPayment");
  const canViewPayment = useUserPermission("sales_payment.read");

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: salesPaymentKeys.list({ invoice_id: invoiceId, per_page: 100 }),
    queryFn: () => salesPaymentsService.list({ invoice_id: invoiceId, per_page: 100 }),
    enabled: open && !!invoiceId && canViewPayment,
  });

  const payments = data?.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {t("title")} — {invoiceCode}
            </DialogTitle>
          </DialogHeader>

          {!canViewPayment ? (
            <div className="p-6 text-center">
              <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view payments."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fields.code") ?? "Payment #"}</TableHead>
                      <TableHead>{t("fields.paymentDate") ?? "Date"}</TableHead>
                      <TableHead>{t("fields.status") ?? "Status"}</TableHead>
                      <TableHead className="text-right">{t("fields.amount") ?? "Amount"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          {t("notFound") || "No payments found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1.5"
                              onClick={() => setSelectedPaymentId(payment.id)}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              {payment.id.split("-")[0]}
                            </button>
                          </TableCell>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell>
                            
                        {payment.status === "PENDING" ? (
                          <Badge variant="warning" className="text-xs font-medium">
                            {t("status.pending")}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-xs font-medium">
                            {t("status.confirmed")}
                          </Badge>
                        )}

                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedPaymentId && (
        <SalesPaymentDetail
          open={!!selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
          paymentId={selectedPaymentId}
        />
      )}
    </>
  );
}
