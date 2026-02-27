"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  Calendar,
  FileText,
  Hash,
  Receipt,
} from "lucide-react";

import type { SupplierInvoiceDetail as ISupplierInvoiceDetail } from "../types";
import { useSupplierInvoice } from "../hooks/use-supplier-invoices";
import { SupplierInvoiceStatusBadge } from "./supplier-invoice-status-badge";

export function SupplierInvoiceDetailView({ data }: { data: ISupplierInvoiceDetail }) {
  const t = useTranslations("supplierInvoice");

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList>
        <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
        <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6 py-4">
        {/* Header Card */}
        <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{data.invoice_number}</h3>
            <p className="text-sm text-muted-foreground font-mono">{data.code}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-1 justify-end">
              <Calendar className="h-3 w-3" />
              {formatDate(data.invoice_date)}
            </div>
            <div className="flex items-center gap-1 justify-end text-xs">
              <span>{t("fields.dueDate")}:</span>
              <span className={data.due_date ? "font-medium" : ""}>
                {formatDate(data.due_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
              <Building2 className="h-4 w-4" />
              {t("fields.purchaseOrder")}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">{t("fields.purchaseOrder")}</span>
                <span className="col-span-2 font-mono font-medium text-primary">
                  {data.purchase_order?.code ?? "-"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">{t("fields.paymentTerms")}</span>
                <span className="col-span-2 font-medium">{data.payment_terms?.name ?? "-"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
              <FileText className="h-4 w-4" />
              {t("fields.notes")}
            </h4>
            <div className="space-y-2 text-sm">
              {data.notes ? (
                <p className="text-muted-foreground">{data.notes}</p>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 flex justify-between items-center px-6 bg-muted/20">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{t("columns.amount")}</span>
            </div>
            <span className="font-mono font-bold text-xl">{formatCurrency(data.amount)}</span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="items" className="py-4">
        <div className="rounded-md border">
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
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">-</TableCell>
                </TableRow>
              ) : (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[240px] truncate">{item.product_id}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{item.discount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.sub_total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

interface SupplierInvoiceDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoiceId?: string | null;
}

export function SupplierInvoiceDetail({ open, onClose, invoiceId }: SupplierInvoiceDetailProps) {
  const t = useTranslations("supplierInvoice");
  const id = invoiceId ?? "";

  const { data, isLoading, isError } = useSupplierInvoice(id, {
    enabled: open && !!invoiceId,
  });

  const detail = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">
              {detail?.invoice_number ?? t("detail.title")}
            </DialogTitle>
            {detail && <SupplierInvoiceStatusBadge status={detail.status} />}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !detail ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <SupplierInvoiceDetailView data={detail} />
        )}
      </DialogContent>
    </Dialog>
  );
}
