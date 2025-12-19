"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar } from "lucide-react";
import type { PurchaseOrder } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface MetadataTabProps {
  readonly order: PurchaseOrder;
}

export function MetadataTab({ order }: MetadataTabProps) {
  const tDetail = useTranslations("purchaseOrders.detail");

  return (
    <TabsContent value="metadata" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("metadata.title")}
          </CardTitle>
          <CardDescription>System information and audit trail</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.created_by && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  {tDetail("metadata.createdBy")}
                </span>
                <span className="text-sm font-medium">{order.created_by.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.createdAt")}
              </span>
              <span className="text-sm font-medium">
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.updatedAt")}
              </span>
              <span className="text-sm font-medium">
                {order.updated_at
                  ? new Date(order.updated_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

