"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { PaymentPO, PaymentAllocation } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface AllocationsTabProps {
  readonly paymentPO: PaymentPO;
  readonly allocations: PaymentAllocation[];
}

export function AllocationsTab({ paymentPO, allocations }: AllocationsTabProps) {
  const tDetail = useTranslations("paymentPO.detail");

  return (
    <TabsContent value="allocations" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {tDetail("allocations")}
          </CardTitle>
          <CardDescription>
            {allocations.length === 0
              ? "No allocations found"
              : `${allocations.length} allocation${allocations.length > 1 ? "s" : ""} in this payment`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No allocations found
            </p>
          ) : (
            <div className="space-y-4">
              {allocations.map((allocation, index) => (
                <div
                  key={allocation.id ?? index}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base">
                        {allocation.chart_of_account?.code ?? "N/A"} -{" "}
                        {allocation.chart_of_account?.name ?? "Unknown Account"}
                      </p>
                      {allocation.chart_of_account?.type && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Type: {allocation.chart_of_account.type}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-base ml-4">
                      {formatCurrency(allocation.amount ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium">Total Allocated</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    allocations.reduce((sum, alloc) => sum + (alloc.amount ?? 0), 0)
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

