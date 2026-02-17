"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import type { SupplierInvoiceDetail, SupplierInvoiceStatus } from "../types";
import { useSupplierInvoice } from "../hooks/use-supplier-invoices";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function statusVariant(status: SupplierInvoiceStatus):
  | "default"
  | "secondary"
  | "destructive"
  | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "PARTIAL":
      return "secondary";
    case "UNPAID":
      return "outline";
    case "DRAFT":
    default:
      return "secondary";
  }
}

export function SupplierInvoiceDetailView({ data }: { data: SupplierInvoiceDetail }) {
  const t = useTranslations("supplierInvoice");

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("columns.code")}</div>
            <div className="font-medium">{data.code}</div>
          </div>
          <Badge variant={statusVariant(data.status)}>{t(`status.${data.status.toLowerCase()}`)}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.purchaseOrder")}</div>
            <div className="font-medium">{data.purchase_order?.code ?? "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.paymentTerms")}</div>
            <div className="font-medium">{data.payment_terms?.name ?? "-"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.invoiceNumber")}</div>
            <div className="font-medium">{data.invoice_number}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.invoiceDate")}</div>
            <div className="font-medium">{safeDate(data.invoice_date)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.dueDate")}</div>
            <div className="font-medium">{safeDate(data.due_date)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("columns.amount")}</div>
            <div className="font-medium">{formatCurrency(data.amount)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">{t("items.title")}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("items.fields.product")}</TableHead>
                <TableHead className="text-right">{t("items.fields.quantity")}</TableHead>
                <TableHead className="text-right">{t("items.fields.price")}</TableHead>
                <TableHead className="text-right">{t("items.fields.discount")}</TableHead>
                <TableHead className="text-right">{t("items.fields.subTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[240px] truncate">{item.product_id}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right">{item.discount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.sub_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.notes ? (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("fields.notes")}</div>
            <div className="whitespace-pre-wrap">{data.notes}</div>
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}

interface SupplierInvoiceDetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoiceId?: string | null;
}

export function SupplierInvoiceDetail({ open, onClose, invoiceId }: SupplierInvoiceDetailDialogProps) {
  const t = useTranslations("supplierInvoice");
  const tCommon = useTranslations("common");
  const id = invoiceId ?? "";

  const { data, isLoading, isError } = useSupplierInvoice(id, {
    enabled: open && !!invoiceId,
  });

  const detail = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
        ) : (
          <SupplierInvoiceDetailView data={detail} />
        )}
      </DialogContent>
    </Dialog>
  );
}
