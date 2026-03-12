"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  useCustomerInvoiceDP,
  useCustomerInvoiceDPAuditTrail,
} from "../hooks/use-customer-invoice-dp";
import type { CustomerInvoiceDPStatus } from "../types";

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

function StatusBadge({ status, t }: { status: CustomerInvoiceDPStatus; t: ReturnType<typeof useTranslations> }) {
  switch (normalizeStatus(status)) {
    case "paid":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {t("status.paid")}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="warning" className="text-xs font-medium">
          <Clock className="h-3 w-3" />
          {t("status.unpaid")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {t("status.partial")}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3" />
          {t("status.draft")}
        </Badge>
      );
  }
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

  const { data, isLoading, isError } = useCustomerInvoiceDP(id as string, {
    enabled: !!id && open,
  });

  const { data: auditData, isLoading: auditLoading } = useCustomerInvoiceDPAuditTrail(
    id as string,
    { enabled: !!id && open },
  );

  const row = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">
                {row?.code ?? t("detail.title")}
              </DialogTitle>
              {row && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <StatusBadge status={row.status as CustomerInvoiceDPStatus} t={t} />
                  {row.invoice_date && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(row.invoice_date)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {!id ? null : isLoading ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !data?.success ? (
          <div className="text-center py-8 text-destructive">{t("detail.failed")}</div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="audit-trail" className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                {t("tabs.auditTrail")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-5 py-4">
              {/* Key Information */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-44">{t("columns.code")}</TableCell>
                      <TableCell className="font-mono font-semibold">{row?.code}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-44">{t("fields.status")}</TableCell>
                      <TableCell>
                        <StatusBadge status={row?.status as CustomerInvoiceDPStatus} t={t} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("fields.invoiceDate")}</TableCell>
                      <TableCell>{formatDate(row?.invoice_date)}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("fields.dueDate")}</TableCell>
                      <TableCell>
                        {row?.due_date ? (
                          formatDate(row?.due_date)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("fields.salesOrder")}</TableCell>
                      <TableCell className="font-mono">{row?.sales_order?.code ?? "-"}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("columns.customer")}</TableCell>
                      <TableCell>
                        {row?.sales_order?.customer_name ?? (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {row?.related_invoice_code && (
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("columns.relatedInvoiceCode")}
                        </TableCell>
                        <TableCell className="font-mono">{row?.related_invoice_code}</TableCell>
                        <TableCell className="bg-muted/50" />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 text-center space-y-1 bg-primary/5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                    {t("fields.amount")}
                  </p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {formatCurrency(row?.amount ?? 0)}
                  </p>
                </div>
                <div className="border rounded-lg p-4 text-center space-y-1 bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                    {t("columns.remainingAmount")}
                  </p>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(row?.remaining_amount ?? row?.amount ?? 0)}
                  </p>
                </div>
              </div>

              {row?.notes && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t("fields.notes")}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/30 p-3 border">
                    {row?.notes}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit-trail" className="py-4">
              {auditLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !auditData?.success || !auditData.data?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t("auditTrail.empty")}</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("auditTrail.columns.action")}</TableHead>
                        <TableHead>{t("auditTrail.columns.user")}</TableHead>
                        <TableHead>{t("auditTrail.columns.time")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.data.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                          <TableCell className="text-sm">
                            {entry.user?.name ?? entry.user?.email ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
              </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}


// removed duplicate helper functions and duplicate modal export (kept the tabbed modal above)
