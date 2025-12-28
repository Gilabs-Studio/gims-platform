"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import type { SupplierInvoice, SupplierInvoiceItem } from "../../types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface ItemsTabProps {
  readonly invoice: SupplierInvoice;
  readonly items: SupplierInvoiceItem[];
}

export function ItemsTab({ invoice, items }: ItemsTabProps) {
  const tDetail = useTranslations("supplierInvoices.detail");

  return (
    <TabsContent value="items" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {tDetail("items.title")}
          </CardTitle>
          <CardDescription>
            {items.length === 0
              ? tDetail("items.empty")
              : `${items.length} item${items.length > 1 ? "s" : ""} in this invoice`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {tDetail("items.empty")}
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base">
                        {item.product?.name ?? `Product #${item.product_id}`}
                      </p>
                      {item.product?.code && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Code: {item.product.code}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-base ml-4">
                      {formatCurrency(item.sub_total ?? 0)}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">{tDetail("items.quantity")}</p>
                      <p className="font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">{tDetail("items.price")}</p>
                      <p className="font-medium">{formatCurrency(item.price ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">{tDetail("items.discount")}</p>
                      <p className="font-medium">{item.discount ?? 0}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}




