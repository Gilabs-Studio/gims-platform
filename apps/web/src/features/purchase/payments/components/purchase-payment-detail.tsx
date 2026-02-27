"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { usePurchasePayment } from "../hooks/use-purchase-payments";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatMoney(value: number | null | undefined): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safe);
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toUpperCase();
}

interface PurchasePaymentDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId?: string | null;
}

export function PurchasePaymentDetail({ open, onClose, paymentId }: PurchasePaymentDetailProps) {
  const t = useTranslations("purchasePayment");

  const { data, isFetching, isError } = usePurchasePayment(paymentId ?? "", {
    enabled: open && !!paymentId,
  });

  const detail = data?.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.view")}</DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-72" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive">{t("toast.failed")}</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-muted-foreground">{t("fields.invoice")}</div>
                <div className="font-medium">{detail.invoice?.code} {detail.invoice?.invoice_number ? `(${detail.invoice?.invoice_number})` : ""}</div>
              </div>
              <Badge variant={normalizeStatus(detail.status) === "CONFIRMED" ? "default" : "secondary"}>
                {normalizeStatus(detail.status) === "CONFIRMED" ? t("status.confirmed") : t("status.pending")}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-muted-foreground">{t("fields.bankAccount")}</div>
                <div className="font-medium">{detail.bank_account?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("fields.paymentDate")}</div>
                <div className="font-medium">{safeDate(detail.payment_date)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("fields.amount")}</div>
                <div className="font-medium">{formatMoney(detail.amount)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("fields.method")}</div>
                <div className="font-medium">{detail.method}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("fields.referenceNumber")}</div>
                <div className="font-medium">{detail.reference_number ?? "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("fields.notes")}</div>
                <div className="font-medium">{detail.notes ?? "-"}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
