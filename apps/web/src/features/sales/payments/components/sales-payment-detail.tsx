"use client";

import { useTranslations } from "next-intl";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useSalesPayment } from "../hooks/use-sales-payments";

interface SalesPaymentDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId?: string | null;
}

function StatusBadge({ status, t }: { status?: string | null; t: ReturnType<typeof useTranslations> }) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "CONFIRMED") {
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

export function SalesPaymentDetail({ open, onClose, paymentId }: SalesPaymentDetailProps) {
  const t = useTranslations("salesPayment");

  const { data, isFetching, isError } = useSalesPayment(paymentId ?? "", {
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
      <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {detail?.invoice?.invoice_number ?? t("actions.view")}
            </DialogTitle>
            {detail && <StatusBadge status={detail.status} t={t} />}
          </div>
        </DialogHeader>

        {isFetching ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive py-4">{t("toast.failed")}</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("fields.referenceNumber")}
                </p>
                <p className="text-lg font-mono font-medium text-foreground/90">
                  {detail.reference_number ?? "-"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{formatDate(detail.payment_date)}</span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b pb-2">{t("fields.bankAccount")}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("fields.bankAccount")}</span>
                    <span className="font-medium text-right">{detail.bank_account?.name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("fields.method")}</span>
                    <span className="font-medium capitalize text-right">{detail.method?.toLowerCase() ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b pb-2">{t("overview.title")}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("overview.invoiceDate")}</span>
                    <span className="font-medium text-right">{formatDate(detail.invoice?.invoice_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("overview.dueDate")}</span>
                    <span className="font-medium text-right">{formatDate(detail.invoice?.due_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("overview.status")}</span>
                    <span className="font-medium text-right">{detail.invoice?.status ?? "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {detail.notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{t("fields.notes")}</h4>
                <div className="text-sm text-muted-foreground bg-muted/30 p-3.5 rounded-md border min-h-[80px] whitespace-pre-wrap">
                  {detail.notes}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/10 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-muted-foreground">{t("overview.amount")}</span>
                <span className="font-mono font-medium text-muted-foreground">
                  {formatCurrency(detail.invoice?.amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold">{t("fields.amount")}</span>
                <span className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(detail.amount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
