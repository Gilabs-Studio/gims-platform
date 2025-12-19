"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Building2, Package, Calendar, User, MapPin } from "lucide-react";
import type { PurchaseRequisition } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface OverviewTabProps {
  readonly requisition: PurchaseRequisition;
}

export function OverviewTab({ requisition }: OverviewTabProps) {
  const tDetail = useTranslations("purchaseRequisitions.detail");

  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("basicInfo.title")}
          </CardTitle>
          <CardDescription>Basic purchase requisition information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("basicInfo.code")}
              </label>
              <p className="text-sm font-medium">{requisition.code}</p>
            </div>
            {requisition.supplier && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {tDetail("basicInfo.supplier")}
                </label>
                <p className="text-sm font-medium">{requisition.supplier.name}</p>
              </div>
            )}
            {requisition.business_unit && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {tDetail("basicInfo.businessUnit")}
                </label>
                <p className="text-sm font-medium">{requisition.business_unit.name}</p>
              </div>
            )}
            {requisition.payment_terms && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {tDetail("basicInfo.paymentTerms")}
                </label>
                <p className="text-sm font-medium">
                  {requisition.payment_terms.name} ({requisition.payment_terms.days} days)
                </p>
              </div>
            )}
            {requisition.request_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("basicInfo.requestDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(requisition.request_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {requisition.user && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {tDetail("basicInfo.requestedBy")}
                </label>
                <p className="text-sm font-medium">{requisition.user.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(requisition.address || requisition.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {tDetail("notes.title")}
            </CardTitle>
            <CardDescription>Additional notes and delivery address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requisition.address && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("notes.address")}
                </label>
                <p className="text-sm font-medium">{requisition.address}</p>
              </div>
            )}
            {requisition.notes && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("notes.notes")}
                </label>
                <p className="text-sm font-medium whitespace-pre-wrap">{requisition.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}


