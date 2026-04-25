"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentHistoryService } from "../../services/payment-history-service";
import type { PaymentTransaction, PaymentTransactionStatus } from "../../types/payment";

const STATUS_LABELS: Record<PaymentTransactionStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  canceled: "Canceled",
};

const STATUS_BADGE_VARIANT: Record<
  PaymentTransactionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  paid: "default",
  failed: "destructive",
  expired: "destructive",
  canceled: "secondary",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Credit Card",
  bank_transfer: "Bank Transfer",
  ewallet: "E-Wallet",
  invoice: "Invoice",
  dana: "DANA",
  ovo: "OVO",
  gcash: "GCash",
  coupon: "Coupon",
};

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  xendit: "Xendit",
  midtrans: "Midtrans",
  internal: "Internal",
};

export function PaymentHistory() {
  const t = useTranslations("profile");
  const [statusFilter, setStatusFilter] = useState<PaymentTransactionStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payment-history", { status: statusFilter, provider: providerFilter }],
    queryFn: () =>
      paymentHistoryService.getMyPaymentHistory({
        status: statusFilter !== "all" ? statusFilter : undefined,
        provider: providerFilter !== "all" ? providerFilter : undefined,
        page: 1,
        per_page: 50,
      }),
    staleTime: 60_000,
  });

  const totalAmount = useMemo(() => {
    return (
      payments?.reduce((sum: number, p: PaymentTransaction) => {
        if (p.status === "paid") {
          return sum + p.amount_idr;
        }
        return sum;
      }, 0) ?? 0
    );
  }, [payments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">{t("paymentHistory.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("paymentHistory.description")}
        </p>
      </div>

      {/* Summary Cards */}
      {!isLoading && payments && payments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t("paymentHistory.totalTransactions")}
            </p>
            <p className="mt-2 text-2xl font-bold">{payments.length}</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t("paymentHistory.totalPaid")}
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 sm:flex-row flex-col flex-1">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as PaymentTransactionStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("paymentHistory.allStatuses")}</SelectItem>
              <SelectItem value="paid">{STATUS_LABELS.paid}</SelectItem>
              <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
              <SelectItem value="failed">{STATUS_LABELS.failed}</SelectItem>
              <SelectItem value="expired">{STATUS_LABELS.expired}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("paymentHistory.allProviders")}</SelectItem>
              <SelectItem value="xendit">{PAYMENT_PROVIDER_LABELS.xendit}</SelectItem>
              <SelectItem value="midtrans">{PAYMENT_PROVIDER_LABELS.midtrans}</SelectItem>
              <SelectItem value="internal">{PAYMENT_PROVIDER_LABELS.internal}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap">
                {t("paymentHistory.date")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("paymentHistory.id")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("paymentHistory.paymentMethod")}
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                {t("paymentHistory.amount")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("paymentHistory.status")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("paymentHistory.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : payments && payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("paymentHistory.noTransactions")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments?.map((payment: PaymentTransaction) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(payment.created_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {payment.provider_invoice_id?.substring(0, 12) ?? payment.id.substring(0, 12)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <div>
                      <p className="font-medium">
                        {PAYMENT_METHOD_LABELS[payment.payment_method ?? ""] ?? PAYMENT_PROVIDER_LABELS[payment.provider] ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_PROVIDER_LABELS[payment.provider]}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold">
                    {formatCurrency(payment.amount_idr)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[payment.status]}>
                      {STATUS_LABELS[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {payment.receipt_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t("paymentHistory.downloadReceipt")}
                          onClick={() => window.open(payment.receipt_url, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {payment.invoice_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t("paymentHistory.viewInvoice")}
                          onClick={() => window.open(payment.invoice_url, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Help text */}
      {!isLoading && payments && payments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("paymentHistory.helpText")}
        </p>
      )}
    </div>
  );
}
