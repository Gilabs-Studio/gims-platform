"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar } from "lucide-react";
import type { PaymentPO } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface MetadataTabProps {
  readonly paymentPO: PaymentPO;
}

export function MetadataTab({ paymentPO }: MetadataTabProps) {
  const tDetail = useTranslations("paymentPO.detail");

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
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.createdAt")}
              </span>
              <span className="text-sm font-medium">
                {paymentPO.created_at
                  ? new Date(paymentPO.created_at).toLocaleDateString("id-ID", {
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
                {paymentPO.updated_at
                  ? new Date(paymentPO.updated_at).toLocaleDateString("id-ID", {
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

