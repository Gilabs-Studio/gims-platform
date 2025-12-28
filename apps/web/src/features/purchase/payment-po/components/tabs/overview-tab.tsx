"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CreditCard, DollarSign, Calendar, Building2 } from "lucide-react";
import type { PaymentPO } from "../../types";
import { useTranslations } from "next-intl";
import { TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OverviewTabProps {
  readonly paymentPO: PaymentPO;
}

export function OverviewTab({ paymentPO }: OverviewTabProps) {
  const tDetail = useTranslations("paymentPO.detail");

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return (
          <Badge variant="outline" className="text-xs">
            {tDetail("cash")}
          </Badge>
        );
      case "BANK":
        return (
          <Badge variant="outline" className="text-xs">
            <CreditCard className="h-3 w-3 mr-1.5" />
            {tDetail("bank")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <TabsContent value="overview" className="space-y-6 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tDetail("basicInfo.title")}
          </CardTitle>
          <CardDescription>Basic payment PO information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                ID
              </label>
              <p className="text-sm font-medium">#{paymentPO.id}</p>
            </div>
            {paymentPO.invoice && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {tDetail("invoice")}
                </label>
                <p className="text-sm font-medium">{paymentPO.invoice.invoice_number}</p>
              </div>
            )}
            {paymentPO.payment_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tDetail("paymentDate")}
                </label>
                <p className="text-sm font-medium">
                  {new Date(paymentPO.payment_date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tDetail("method")}
              </label>
              <div className="mt-1">{getMethodBadge(paymentPO.method)}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {tDetail("amount")}
              </label>
              <p className="text-sm font-medium">{formatCurrency(paymentPO.amount ?? 0)}</p>
            </div>
            {paymentPO.bank_account && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {tDetail("bankAccount")}
                </label>
                <p className="text-sm font-medium">{paymentPO.bank_account.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {paymentPO.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {tDetail("invoice")}
            </CardTitle>
            <CardDescription>Invoice information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentPO.invoice.invoice_date && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    {tDetail("invoiceDate")}
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(paymentPO.invoice.invoice_date).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              {paymentPO.invoice.due_date && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    {tDetail("dueDate")}
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(paymentPO.invoice.due_date).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("invoiceAmount")}
                </label>
                <p className="text-sm font-medium">
                  {formatCurrency(paymentPO.invoice.amount ?? 0)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("invoiceStatus")}
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    {paymentPO.invoice.status}
                  </Badge>
                </div>
              </div>
            </div>
            {paymentPO.invoice.purchase_order && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Purchase Order
                </label>
                <p className="text-sm font-medium">{paymentPO.invoice.purchase_order.code}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {paymentPO.bank_account && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {tDetail("bankAccount")}
            </CardTitle>
            <CardDescription>Bank account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                {tDetail("bankAccount")}
              </label>
              <p className="text-sm font-medium">{paymentPO.bank_account.name}</p>
            </div>
            {paymentPO.bank_account.account_number && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("accountNumber")}
                </label>
                <p className="text-sm font-medium">{paymentPO.bank_account.account_number}</p>
              </div>
            )}
            {paymentPO.bank_account.account_holder && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  Account Holder
                </label>
                <p className="text-sm font-medium">{paymentPO.bank_account.account_holder}</p>
              </div>
            )}
            {paymentPO.bank_account.currency && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  {tDetail("currency")}
                </label>
                <p className="text-sm font-medium">{paymentPO.bank_account.currency}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {paymentPO.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {tDetail("notes")}
            </CardTitle>
            <CardDescription>Additional notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium whitespace-pre-wrap">{paymentPO.notes}</p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

