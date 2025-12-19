"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { PurchaseOrder } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface FinancialTabProps {
  readonly order: PurchaseOrder;
}

export function FinancialTab({ order }: FinancialTabProps) {
  const tDetail = useTranslations("purchaseOrders.detail");

  // Calculate subtotal from items if not provided
  const subtotal = order.items?.reduce((sum, item) => sum + (item.subtotal ?? 0), 0) ?? 0;
  const taxRate = order.tax_rate ?? 0;
  const taxAmount = subtotal * (taxRate / 100);
  const deliveryCost = order.delivery_cost ?? 0;
  const otherCost = order.other_cost ?? 0;
  const totalAmount = order.total_amount ?? (subtotal + taxAmount + deliveryCost + otherCost);

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
                {formatCurrency(subtotal)}
              </span>
            </div>
            {taxRate > 0 && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tDetail("financial.taxRate")}
                  </span>
                  <span className="text-sm font-medium">{taxRate}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tDetail("financial.taxAmount")}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
              </>
            )}
            {deliveryCost > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  {tDetail("financial.deliveryCost")}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(deliveryCost)}
                </span>
              </div>
            )}
            {otherCost > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  {tDetail("financial.otherCost")}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(otherCost)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold">{tDetail("financial.totalAmount")}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

