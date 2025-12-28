"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { SupplierInvoice } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface FinancialTabProps {
  readonly invoice: SupplierInvoice;
}

export function FinancialTab({ invoice }: FinancialTabProps) {
  const tDetail = useTranslations("supplierInvoices.detail");

  return (
    <TabsContent value="financial" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {tDetail("financial.title")}
          </CardTitle>
          <CardDescription>Financial breakdown and summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.subtotal")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(invoice.sub_total ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxRate")}
              </span>
              <span className="text-sm font-medium">{invoice.tax_rate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxAmount")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(invoice.tax_amount ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.deliveryCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(invoice.delivery_cost ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.otherCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(invoice.other_cost ?? 0)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold">{tDetail("financial.totalAmount")}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(invoice.amount ?? 0)}
              </span>
            </div>
            {invoice.remaining_amount !== undefined && invoice.remaining_amount > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tDetail("financial.remainingAmount")}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(invoice.remaining_amount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}




