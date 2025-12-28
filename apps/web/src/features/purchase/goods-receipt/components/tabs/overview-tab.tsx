"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Warehouse, ShoppingCart, Calendar, User, MapPin } from "lucide-react";
import type { GoodsReceipt } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface OverviewTabProps {
  readonly goodsReceipt: GoodsReceipt;
}

export function OverviewTab({ goodsReceipt }: OverviewTabProps) {
  const tDetail = useTranslations("goodsReceipts.detail");

  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("basicInfo.title")}
          </CardTitle>
          <CardDescription>Basic goods receipt information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.code")}
              </label>
              <p className="text-sm font-medium">{goodsReceipt.code}</p>
            </div>
            {goodsReceipt.purchase_order && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {tDetail("basicInfo.purchaseOrder")}
                </label>
                <p className="text-sm font-medium">{goodsReceipt.purchase_order.code}</p>
              </div>
            )}
            {goodsReceipt.warehouse && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Warehouse className="h-3 w-3" />
                  {tDetail("basicInfo.warehouse")}
                </label>
                <p className="text-sm font-medium">{goodsReceipt.warehouse.name}</p>
              </div>
            )}
            {goodsReceipt.receipt_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.receiptDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(goodsReceipt.receipt_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {goodsReceipt.received_by && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {tDetail("basicInfo.receivedBy")}
                </label>
                <p className="text-sm font-medium">{goodsReceipt.received_by.name}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.status")}
              </label>
              <p className="text-sm font-medium">{goodsReceipt.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {goodsReceipt.warehouse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {tDetail("warehouse.title")}
            </CardTitle>
            <CardDescription>Warehouse information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                {tDetail("warehouse.name")}
              </label>
              <p className="text-sm font-medium">{goodsReceipt.warehouse.name}</p>
            </div>
            {goodsReceipt.warehouse.address && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("warehouse.address")}
                </label>
                <p className="text-sm font-medium">{goodsReceipt.warehouse.address}</p>
              </div>
            )}
            {goodsReceipt.warehouse.city && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("warehouse.city")}
                </label>
                <p className="text-sm font-medium">
                  {goodsReceipt.warehouse.city.name}, {goodsReceipt.warehouse.city.province_name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {goodsReceipt.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {tDetail("notes.title")}
            </CardTitle>
            <CardDescription>Additional notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium whitespace-pre-wrap">{goodsReceipt.notes}</p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

