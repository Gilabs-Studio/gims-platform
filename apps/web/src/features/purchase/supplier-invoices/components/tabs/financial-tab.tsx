"use client";

import { useMemo } from "react";
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

  // Memoize financial values to prevent recalculation
  const financialValues = useMemo(() => ({
    subTotal: invoice.sub_total ?? 0,
    taxRate: invoice.tax_rate ?? 0,
    taxAmount: invoice.tax_amount ?? 0,
    deliveryCost: invoice.delivery_cost ?? 0,
    otherCost: invoice.other_cost ?? 0,
    amount: invoice.amount ?? 0,
    remainingAmount: invoice.remaining_amount,
  }), [
    invoice.sub_total,
    invoice.tax_rate,
    invoice.tax_amount,
    invoice.delivery_cost,
    invoice.other_cost,
    invoice.amount,
    invoice.remaining_amount,
  ]);

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
                {formatCurrency(financialValues.subTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxRate")}
              </span>
              <span className="text-sm font-medium">{financialValues.taxRate}%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxAmount")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(financialValues.taxAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.deliveryCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(financialValues.deliveryCost)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.otherCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(financialValues.otherCost)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold">{tDetail("financial.totalAmount")}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(financialValues.amount)}
              </span>
            </div>
            {financialValues.remainingAmount !== undefined && financialValues.remainingAmount > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tDetail("financial.remainingAmount")}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(financialValues.remainingAmount)}
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




