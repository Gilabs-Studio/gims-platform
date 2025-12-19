"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Building2, Package, Calendar, User, MapPin, Clock } from "lucide-react";
import type { PurchaseOrder } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface OverviewTabProps {
  readonly order: PurchaseOrder;
}

export function OverviewTab({ order }: OverviewTabProps) {
  const tDetail = useTranslations("purchaseOrders.detail");

  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("basicInfo.title")}
          </CardTitle>
          <CardDescription>Basic purchase order information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.code")}
              </label>
              <p className="text-sm font-medium">{order.code}</p>
            </div>
            {order.supplier && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {tDetail("basicInfo.supplier")}
                </label>
                <p className="text-sm font-medium">{order.supplier.name ?? order.supplier.code}</p>
              </div>
            )}
            {order.business_unit && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {tDetail("basicInfo.businessUnit")}
                </label>
                <p className="text-sm font-medium">{order.business_unit.name}</p>
              </div>
            )}
            {order.payment_terms && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {tDetail("basicInfo.paymentTerms")}
                </label>
                <p className="text-sm font-medium">{order.payment_terms.name}</p>
              </div>
            )}
            {order.order_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.orderDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(order.order_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {order.due_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.dueDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(order.due_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tDetail("basicInfo.status")}
              </label>
              <p className="text-sm font-medium">{order.status}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Package className="h-3 w-3" />
                {tDetail("basicInfo.statusReceipts")}
              </label>
              <p className="text-sm font-medium">{order.status_receipts ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {tDetail("basicInfo.statusInvoices")}
              </label>
              <p className="text-sm font-medium">{order.status_invoices ?? "-"}</p>
            </div>
            {order.created_by && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {tDetail("basicInfo.createdBy")}
                </label>
                <p className="text-sm font-medium">{order.created_by.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(order.address || order.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {tDetail("notes.title")}
            </CardTitle>
            <CardDescription>Additional notes and delivery address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.address && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("notes.address")}
                </label>
                <p className="text-sm font-medium">{order.address}</p>
              </div>
            )}
            {order.notes && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("notes.notes")}
                </label>
                <p className="text-sm font-medium whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

