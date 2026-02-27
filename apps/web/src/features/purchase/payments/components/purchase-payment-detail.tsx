"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hash,
} from "lucide-react";

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

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  if (normalizeStatus(status) === "CONFIRMED") {
    return (
      <Badge variant="success" className="text-xs font-medium">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {t("status.confirmed")}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="text-xs font-medium">
      <Clock className="h-3 w-3 mr-1" />
      {t("status.pending")}
    </Badge>
  );
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
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">
              {detail?.invoice?.invoice_number ?? t("actions.view")}
            </DialogTitle>
            {detail && <StatusBadge status={detail.status} t={t} />}
          </div>
        </DialogHeader>

        {isFetching ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive">{t("toast.failed")}</div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Header Card */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{detail.invoice?.invoice_number ?? "-"}</h3>
                <p className="text-sm text-muted-foreground">{t("fields.invoice")}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="h-3 w-3" />
                  {safeDate(detail.payment_date)}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <Banknote className="h-4 w-4" />
                  {t("fields.bankAccount")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.bankAccount")}</span>
                    <span className="col-span-2 font-medium">{detail.bank_account?.name ?? "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.method")}</span>
                    <span className="col-span-2 font-medium">{detail.method}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <FileText className="h-4 w-4" />
                  {t("fields.notes")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.referenceNumber")}</span>
                    <span className="col-span-2 font-mono font-medium">{detail.reference_number ?? "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.notes")}</span>
                    <span className="col-span-2 font-medium">{detail.notes ?? "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Card */}
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="p-4 flex justify-between items-center px-6 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{t("fields.amount")}</span>
                </div>
                <span className="font-mono font-bold text-xl">{formatMoney(detail.amount)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
