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
import { formatCurrency } from "@/lib/utils";
import { useCustomerInvoiceDP } from "../hooks/use-customer-invoice-dp";

function statusLabel(t: ReturnType<typeof useTranslations>, status: string) {
  return t(`status.${status.toLowerCase()}`);
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

export function CustomerInvoiceDPDetailModal({
  open,
  onOpenChange,
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
}) {
  const t = useTranslations("customerInvoiceDP");
  const tCommon = useTranslations("common");

  const { data, isLoading, isError } = useCustomerInvoiceDP(id as string, {
    enabled: !!id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>
        {!id ? null : isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !data?.success ? (
          <div className="text-center py-8 text-destructive">
            {t("detail.failed")}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">{t("columns.code")}</div>
              <div className="font-semibold text-lg">{data.data.code}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("fields.salesOrder")}
                </div>
                <div className="font-medium">
                  {data.data.sales_order?.code ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("fields.amount")}</div>
                <div className="font-medium">{formatCurrency(data.data.amount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("fields.invoiceDate")}
                </div>
                <div className="font-medium">{safeDate(data.data.invoice_date)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("fields.dueDate")}</div>
                <div className="font-medium">{safeDate(data.data.due_date)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("fields.status")}</div>
                <div className="font-medium">
                  <Badge
                    variant={
                      normalizeStatus(data.data.status) === "paid"
                        ? "success"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {statusLabel(t, data.data.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {data.data.notes ? (
              <div>
                <div className="text-sm text-muted-foreground">{t("fields.notes")}</div>
                <div className="whitespace-pre-wrap text-sm">{data.data.notes}</div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
