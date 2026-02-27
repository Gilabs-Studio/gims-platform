"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hash,
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        <CheckCircle2 className="h-3 w-3" />
        {t("status.confirmed")}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="text-xs font-medium">
      <Clock className="h-3 w-3" />
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
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{t("actions.view")}</DialogTitle>
            {detail && <StatusBadge status={detail.status} t={t} />}
          </div>
        </DialogHeader>

        {isFetching ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive py-4">{t("toast.failed")}</div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Invoice Header */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">
                  {detail.invoice?.invoice_number ?? "-"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {detail.invoice?.code ?? ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                  <Calendar className="h-3 w-3" />
                  {formatDate(detail.payment_date)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Info */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <CreditCard className="h-4 w-4" />
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
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.referenceNumber")}</span>
                    <span className="col-span-2 font-mono font-medium text-primary">
                      {detail.reference_number ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Reference */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <Hash className="h-4 w-4" />
                  {t("overview.title")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("overview.invoiceDate")}</span>
                    <span className="col-span-2 font-medium">{formatDate(detail.invoice?.invoice_date)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("overview.dueDate")}</span>
                    <span className="col-span-2 font-medium">{formatDate(detail.invoice?.due_date)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("overview.status")}</span>
                    <span className="col-span-2 font-medium">{detail.invoice?.status ?? "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    {t("overview.amount")}
                  </p>
                  <p className="text-lg text-muted-foreground font-mono">
                    {formatCurrency(detail.invoice?.amount ?? 0)}
                  </p>
                </div>
                <div className="p-4 text-center space-y-1 bg-primary/5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    {t("fields.amount")}
                  </p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {formatCurrency(detail.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {detail.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4" />
                    {t("fields.notes")}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/30 p-3 border">
                    {detail.notes}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
