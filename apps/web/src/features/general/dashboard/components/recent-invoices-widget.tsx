"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InvoiceRow } from "../types";

interface RecentInvoicesWidgetProps {
  readonly data?: InvoiceRow[];
}

type BadgeVariant = "success" | "warning" | "destructive";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  paid: "success",
  unpaid: "warning",
  overdue: "destructive",
};

export function RecentInvoicesWidget({ data }: RecentInvoicesWidgetProps) {
  const t = useTranslations("dashboard");
  const invoices = data ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("widgets.recent_invoices.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex h-36 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 8).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.contact} &middot; {inv.issue_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {inv.value_formatted}
                  </span>
                  <Badge variant={STATUS_VARIANT[inv.status] ?? "warning"}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
