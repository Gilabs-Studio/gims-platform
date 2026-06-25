"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
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
import { cn } from "@/lib/utils";
import { usePOSSettlementPayouts } from "@/features/pos/terminal/hooks/use-pos";
import { matchChannelLogo } from "./payment-settings";
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

const PAYOUT_STATUS_BADGE_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "outline" | "destructive" | "secondary"
> = {
  PENDING: "outline",
  ACCEPTED: "info",
  REQUESTED: "warning",
  SUCCEEDED: "success",
  FAILED: "destructive",
  CANCELLED: "secondary",
  REVERSED: "destructive",
};

export function PaymentHistory() {
  const t = useTranslations("profile");
  const [historyType, setHistoryType] = useState<"billing" | "withdrawal">("billing");
  
  // Billing States
  const [statusFilter, setStatusFilter] = useState<PaymentTransactionStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const { data: payments, isLoading: isBillingLoading } = useQuery({
    queryKey: ["payment-history", { status: statusFilter, provider: providerFilter }],
    queryFn: () =>
      paymentHistoryService.getMyPaymentHistory({
        status: statusFilter !== "all" ? statusFilter : undefined,
        provider: providerFilter !== "all" ? providerFilter : undefined,
        page: 1,
        per_page: 50,
      }),
    staleTime: 60_000,
    enabled: historyType === "billing",
  });

  // Withdrawal States
  const { data: payoutsResponse, isLoading: isPayoutLoading } = usePOSSettlementPayouts({
    enabled: historyType === "withdrawal",
  });
  const payouts = useMemo(() => payoutsResponse?.data ?? [], [payoutsResponse?.data]);

  const totalBillingAmount = useMemo(() => {
    return (
      payments?.reduce((sum: number, p: PaymentTransaction) => {
        if (p.status === "paid") {
          return sum + p.amount_idr;
        }
        return sum;
      }, 0) ?? 0
    );
  }, [payments]);

  const totalPayoutAmount = useMemo(() => {
    return (
      payouts.reduce((sum: number, p) => {
        if (p.status === "SUCCEEDED") {
          return sum + p.amount;
        }
        return sum;
      }, 0) ?? 0
    );
  }, [payouts]);

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

  const isCurrentLoading = historyType === "billing" ? isBillingLoading : isPayoutLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">{t("paymentHistory.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("paymentHistory.description")}
        </p>
      </div>

      {/* Sub-tabs switcher */}
      <div className="flex border-b border-border/40 gap-6 mb-2">
        <button
          type="button"
          onClick={() => setHistoryType("billing")}
          className={cn(
            "pb-3 pt-2 font-medium text-[14px] cursor-pointer border-b-2 transition-all duration-300 hover:text-foreground",
            historyType === "billing"
              ? "border-foreground text-foreground font-semibold border-b-2"
              : "border-transparent text-muted-foreground"
          )}
        >
          {t("paymentHistory.tabBilling")}
        </button>
        <button
          type="button"
          onClick={() => setHistoryType("withdrawal")}
          className={cn(
            "pb-3 pt-2 font-medium text-[14px] cursor-pointer border-b-2 transition-all duration-300 hover:text-foreground",
            historyType === "withdrawal"
              ? "border-foreground text-foreground font-semibold border-b-2"
              : "border-transparent text-muted-foreground"
          )}
        >
          {t("paymentHistory.tabWithdrawal")}
        </button>
      </div>

      {/* Summary Cards */}
      {!isCurrentLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {historyType === "billing" && payments && payments.length > 0 && (
            <>
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
                  {formatCurrency(totalBillingAmount)}
                </p>
              </div>
            </>
          )}
          {historyType === "withdrawal" && payouts && payouts.length > 0 && (
            <>
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {t("paymentHistory.totalTransactions")}
                </p>
                <p className="mt-2 text-2xl font-bold">{payouts.length}</p>
              </div>
              <div className="rounded-lg border border-border/80 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {t("paymentHistory.totalPaid")}
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalPayoutAmount)}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filters (Billing only) */}
      {historyType === "billing" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2 sm:flex-row flex-col flex-1">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PaymentTransactionStatus | "all")}
            >
              <SelectTrigger className="w-full sm:w-40 cursor-pointer">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("paymentHistory.allStatuses")}</SelectItem>
                <SelectItem value="paid" className="cursor-pointer">{STATUS_LABELS.paid}</SelectItem>
                <SelectItem value="pending" className="cursor-pointer">{STATUS_LABELS.pending}</SelectItem>
                <SelectItem value="failed" className="cursor-pointer">{STATUS_LABELS.failed}</SelectItem>
                <SelectItem value="expired" className="cursor-pointer">{STATUS_LABELS.expired}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-40 cursor-pointer">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t("paymentHistory.allProviders")}</SelectItem>
                <SelectItem value="xendit" className="cursor-pointer">{PAYMENT_PROVIDER_LABELS.xendit}</SelectItem>
                <SelectItem value="midtrans" className="cursor-pointer">{PAYMENT_PROVIDER_LABELS.midtrans}</SelectItem>
                <SelectItem value="internal" className="cursor-pointer">{PAYMENT_PROVIDER_LABELS.internal}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80">
        {historyType === "billing" ? (
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
              {isBillingLoading ? (
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
                  <TableRow key={payment.id} className="hover:bg-muted/50 transition-all duration-300">
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
                            className="cursor-pointer"
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
                            className="cursor-pointer"
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap">
                  {t("paymentHistory.date")}
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  {t("paymentHistory.payoutId")}
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  {t("paymentHistory.channel")}
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  {t("paymentHistory.account")}
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  {t("paymentHistory.amount")}
                </TableHead>
                <TableHead className="whitespace-nowrap text-center">
                  {t("paymentHistory.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPayoutLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("paymentHistory.noWithdrawals")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => {
                  const logoPath = matchChannelLogo(payout.channel_code, payout.channel_code);
                  
                  return (
                    <TableRow key={payout.id} className="hover:bg-muted/50 transition-all duration-300">
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(payout.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {payout.reference_id.substring(0, 18)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {logoPath ? (
                            <div className="relative h-6 w-12 flex-shrink-0">
                              <Image
                                src={logoPath}
                                alt={payout.channel_code}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-xs py-0.5 px-1.5 bg-muted rounded border border-border">
                              {payout.channel_code}
                            </span>
                          )}
                          <span className="font-medium text-xs text-muted-foreground">
                            {payout.channel_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div>
                          <p className="font-semibold text-foreground text-xs">
                            {payout.account_holder_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {payout.account_number_masked}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-bold text-foreground">
                        {formatCurrency(payout.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={PAYOUT_STATUS_BADGE_VARIANT[payout.status] ?? "outline"}>
                          {t(`paymentHistory.payoutStatus.${payout.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Help text */}
      {!isCurrentLoading && historyType === "billing" && payments && payments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("paymentHistory.helpText")}
        </p>
      )}
    </div>
  );
}
