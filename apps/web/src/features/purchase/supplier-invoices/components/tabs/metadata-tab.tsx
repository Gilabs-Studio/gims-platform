"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar } from "lucide-react";
import type { SupplierInvoice } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";

interface MetadataTabProps {
  readonly invoice: SupplierInvoice;
}

export function MetadataTab({ invoice }: MetadataTabProps) {
  const tDetail = useTranslations("supplierInvoices.detail");

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
            {invoice.created_by && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  {tDetail("metadata.createdBy")}
                </span>
                <span className="text-sm font-medium">{invoice.created_by.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.createdAt")}
              </span>
              <span className="text-sm font-medium">
                {invoice.created_at
                  ? new Date(invoice.created_at).toLocaleDateString("id-ID", {
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
                {invoice.updated_at
                  ? new Date(invoice.updated_at).toLocaleDateString("id-ID", {
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




