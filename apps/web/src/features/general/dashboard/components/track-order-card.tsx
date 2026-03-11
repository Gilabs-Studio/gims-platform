"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { DeliveryStatusData, InvoiceRow } from "../types";

type InvoiceStatus = "unpaid" | "paid" | "overdue";
type BadgeVariant = "info" | "success" | "destructive";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { variant: BadgeVariant; label: string }
> = {
  unpaid: { variant: "info", label: "Unpaid" },
  paid: { variant: "success", label: "Paid" },
  overdue: { variant: "destructive", label: "Overdue" },
};

interface TrackOrderCardProps {
  readonly deliveryStatus?: DeliveryStatusData;
  readonly recentInvoices?: InvoiceRow[];
  readonly isLoading?: boolean;
}

export function TrackOrderCard({
  deliveryStatus,
  recentInvoices,
  isLoading,
}: TrackOrderCardProps) {
  const t = useTranslations("dashboard");
  const [filter, setFilter] = useState("");

  const total = deliveryStatus?.total ?? 0;
  const pending = deliveryStatus?.pending ?? 0;
  const inTransit = deliveryStatus?.in_transit ?? 0;
  const delivered = deliveryStatus?.delivered ?? 0;

  const pct = (val: number) => (total > 0 ? (val / total) * 100 : 0);

  const counters = [
    {
      key: "new",
      label: t("trackOrders.newOrder"),
      value: pending,
      pct: pct(pending),
      bgClass: "bg-blue-100 dark:bg-blue-950",
      indicatorClass: "bg-blue-400",
      trendUp: true,
    },
    {
      key: "progress",
      label: t("trackOrders.onProgress"),
      value: inTransit,
      pct: pct(inTransit),
      bgClass: "bg-teal-100 dark:bg-teal-950",
      indicatorClass: "bg-teal-400",
      trendUp: false,
    },
    {
      key: "completed",
      label: t("trackOrders.completed"),
      value: delivered,
      pct: pct(delivered),
      bgClass: "bg-green-100 dark:bg-green-950",
      indicatorClass: "bg-green-400",
      trendUp: true,
    },
    {
      key: "return",
      label: t("trackOrders.return"),
      value: 0,
      pct: 0,
      bgClass: "bg-orange-100 dark:bg-orange-950",
      indicatorClass: "bg-orange-400",
      trendUp: false,
    },
  ];

  const filteredInvoices = (recentInvoices ?? []).filter(
    (inv) =>
      !filter ||
      inv.company.toLowerCase().includes(filter.toLowerCase()) ||
      inv.id.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t("trackOrders.title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("trackOrders.subtitle")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden lg:inline">{t("trackOrders.export")}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status counters */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counters.map((counter) => (
            <div key={counter.key} className="space-y-2">
              <div className="text-2xl font-bold lg:text-3xl">
                {isLoading ? (
                  <div className="h-7 w-12 animate-pulse rounded bg-muted" />
                ) : (
                  counter.value
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {counter.label}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs ${
                    counter.trendUp ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {counter.trendUp ? (
                    <ArrowUp className="size-3" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="size-3" aria-hidden="true" />
                  )}
                </span>
              </div>
              <Progress
                value={counter.pct}
                className={counter.bgClass}
                indicatorClassName={counter.indicatorClass}
              />
            </div>
          ))}
        </div>

        {/* Filter + table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("trackOrders.filterOrders")}
              className="max-w-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {filteredInvoices.length === 0 && !isLoading ? (
            <div className="flex h-24 items-center justify-center rounded-md border">
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="relative w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium whitespace-nowrap text-muted-foreground">
                        {t("trackOrders.id")}
                      </th>
                      <th className="h-10 px-4 text-left font-medium whitespace-nowrap text-muted-foreground">
                        {t("trackOrders.customerName")}
                      </th>
                      <th className="h-10 px-4 text-left font-medium whitespace-nowrap text-muted-foreground">
                        {t("trackOrders.issueDate")}
                      </th>
                      <th className="h-10 px-4 text-left font-medium whitespace-nowrap text-muted-foreground">
                        {t("trackOrders.amount")}
                      </th>
                      <th className="h-10 px-4 text-left font-medium whitespace-nowrap text-muted-foreground">
                        {t("trackOrders.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td colSpan={5} className="p-4">
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredInvoices.slice(0, 8).map((inv) => {
                        const cfg = STATUS_CONFIG[inv.status as InvoiceStatus] ?? {
                          variant: "info" as BadgeVariant,
                          label: inv.status,
                        };
                        return (
                          <tr
                            key={inv.id}
                            className="border-b transition-colors last:border-0 hover:bg-muted/50"
                          >
                            <td className="p-4 font-mono text-xs whitespace-nowrap">
                              {inv.id.slice(0, 8)}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {inv.company}
                            </td>
                            <td className="p-4 whitespace-nowrap text-muted-foreground">
                              {inv.issue_date}
                            </td>
                            <td className="p-4 whitespace-nowrap font-medium">
                              {inv.value_formatted}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <Badge
                                variant={cfg.variant}
                                className="rounded-full capitalize"
                              >
                                {cfg.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
