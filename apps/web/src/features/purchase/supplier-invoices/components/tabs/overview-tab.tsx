"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Building2, Calendar } from "lucide-react";
import type { SupplierInvoice } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface OverviewTabProps {
  readonly invoice: SupplierInvoice;
}

export function OverviewTab({ invoice }: OverviewTabProps) {
  const tDetail = useTranslations("supplierInvoices.detail");

  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("basicInfo.title")}
          </CardTitle>
          <CardDescription>Basic supplier invoice information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.code")}
              </label>
              <p className="text-sm font-medium">{invoice.code}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.invoiceNumber")}
              </label>
              <p className="text-sm font-medium">{invoice.invoice_number ?? "-"}</p>
            </div>
            {invoice.purchase_order && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {tDetail("basicInfo.purchaseOrder")}
                </label>
                <p className="text-sm font-medium">{invoice.purchase_order.code}</p>
              </div>
            )}
            {invoice.purchase_order?.supplier && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {tDetail("basicInfo.supplier")}
                </label>
                <p className="text-sm font-medium">{invoice.purchase_order.supplier.name}</p>
              </div>
            )}
            {invoice.payment_terms && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {tDetail("basicInfo.paymentTerms")}
                </label>
                <p className="text-sm font-medium">{invoice.payment_terms.name}</p>
              </div>
            )}
            {invoice.invoice_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.invoiceDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(invoice.invoice_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {invoice.due_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.dueDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(invoice.due_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {tDetail("notes.title")}
            </CardTitle>
            <CardDescription>Additional notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}




