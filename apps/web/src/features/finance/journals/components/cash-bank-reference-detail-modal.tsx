"use client";

import { useMemo } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

import { financeCashBankService } from "@/features/finance/cash-bank/services/finance-cash-bank-service";
import { financePaymentsService } from "@/features/finance/payments/services/finance-payments-service";
import { formatCurrency } from "@/lib/utils";

import type { UnifiedJournalRow } from "./journal-table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: UnifiedJournalRow | null;
};

type ReferenceDetail = {
  code: string;
  date: string;
  amount: number;
  relatedParty: string;
  status: string;
  sourceType: "PAY" | "CB" | "TRF";
  description: string;
};

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getReferenceTypeLabel(value?: string | null): "PAY" | "CB" | "TRF" {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("PAY")) return "PAY";
  if (normalized.includes("TRF") || normalized.includes("TRANSFER")) return "TRF";
  return "CB";
}

export function CashBankReferenceDetailModal({ open, onOpenChange, row }: Props) {
  const referenceID = row?.referenceId ?? "";
  const sourceType = getReferenceTypeLabel(row?.referenceType);

  const paymentQuery = useQuery({
    queryKey: ["cash-bank-reference", "payment", referenceID],
    queryFn: async () => {
      const response = await financePaymentsService.getById(referenceID);
      return response.data;
    },
    enabled: open && !!referenceID && sourceType === "PAY",
  });

  const cashBankQuery = useQuery({
    queryKey: ["cash-bank-reference", "cash-bank", referenceID],
    queryFn: async () => {
      const response = await financeCashBankService.getById(referenceID);
      return response.data;
    },
    enabled: open && !!referenceID && sourceType !== "PAY",
  });

  const isLoading = paymentQuery.isLoading || cashBankQuery.isLoading;
  const isError = paymentQuery.isError || cashBankQuery.isError;

  const detail = useMemo<ReferenceDetail | null>(() => {
    if (!row) return null;

    if (sourceType === "PAY") {
      const payment = paymentQuery.data;
      if (!payment) return null;

      const paymentLike = payment as {
        id: string;
        payment_date?: string;
        total_amount: number;
        status: string;
        description?: string;
        bank_account?: { account_holder?: string; name?: string } | null;
      };

      return {
        code: row.referenceCode ?? `PAY-${paymentLike.id.slice(0, 8).toUpperCase()}`,
        date: safeDate(paymentLike.payment_date),
        amount: paymentLike.total_amount ?? 0,
        relatedParty:
          paymentLike.bank_account?.account_holder ??
          paymentLike.bank_account?.name ??
          "-",
        status: paymentLike.status ?? "-",
        sourceType,
        description: paymentLike.description ?? "-",
      };
    }

    const cashBank = cashBankQuery.data;
    if (!cashBank) return null;

    const cashBankLike = cashBank as {
      id: string;
      transaction_date?: string;
      total_amount: number;
      status: string;
      description?: string;
      bank_account?: { account_holder?: string; name?: string } | null;
    };

    return {
      code: row.referenceCode ?? `${sourceType}-${cashBankLike.id.slice(0, 8).toUpperCase()}`,
      date: safeDate(cashBankLike.transaction_date),
      amount: cashBankLike.total_amount ?? 0,
      relatedParty:
        cashBankLike.bank_account?.account_holder ??
        cashBankLike.bank_account?.name ??
        "-",
      status: cashBankLike.status ?? "-",
      sourceType,
      description: cashBankLike.description ?? "-",
    };
  }, [cashBankQuery.data, paymentQuery.data, row, sourceType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Source Transaction Detail</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="text-sm text-destructive">Failed to load reference detail.</div>
        ) : !detail ? (
          <div className="text-sm text-muted-foreground">No detail available.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Code</div>
                <div className="text-sm font-mono font-medium">{detail.code}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Source</div>
                <div className="text-sm font-medium">
                  <Badge variant="outline" className="font-mono text-xs">
                    {detail.sourceType}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Date</div>
                <div className="text-sm font-medium">{detail.date}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="text-sm font-medium tabular-nums">{formatCurrency(detail.amount)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Related Party</div>
                <div className="text-sm font-medium">{detail.relatedParty}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-sm font-medium uppercase">{detail.status}</div>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm">{detail.description}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
