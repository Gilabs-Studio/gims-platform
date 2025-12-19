"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { PurchaseRequisition } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface FinancialTabProps {
  readonly requisition: PurchaseRequisition;
}

export function FinancialTab({ requisition }: FinancialTabProps) {
  const tDetail = useTranslations("purchaseRequisitions.detail");

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
                {formatCurrency(requisition.subtotal ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxRate")}
              </span>
              <span className="text-sm font-medium">{requisition.tax_rate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.taxAmount")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(requisition.tax_amount ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.deliveryCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(requisition.delivery_cost ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {tDetail("financial.otherCost")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(requisition.other_cost ?? 0)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-base font-semibold">{tDetail("financial.totalAmount")}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(requisition.total_amount ?? 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}


