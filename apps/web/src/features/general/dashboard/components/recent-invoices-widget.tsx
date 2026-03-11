"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InvoiceRow } from "../types";

interface RecentInvoicesWidgetProps {
  readonly data?: InvoiceRow[];
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  unpaid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export function RecentInvoicesWidget({ data }: RecentInvoicesWidgetProps) {
  const t = useTranslations("dashboard");
  const invoices = data ?? [];

  return (
    <Card>
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
                  <Badge
                    variant="outline"
                    className={STATUS_STYLES[inv.status] ?? ""}
                  >
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
