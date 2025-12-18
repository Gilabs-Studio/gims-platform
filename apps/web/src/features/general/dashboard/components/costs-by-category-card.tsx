"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { CostsByCategoryItem } from "../types";

interface CostsByCategoryCardProps {
  readonly data?: CostsByCategoryItem[];
}

export function CostsByCategoryCard({ data }: CostsByCategoryCardProps) {
  const t = useTranslations("dashboard.costsByCategory");
  const items = data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total for percentage calculation
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Single progress bar with colored segments from items */}
          <div className="space-y-2">
            <div className="relative h-2 mb-8 w-full overflow-hidden rounded-full bg-muted">
              {items.map((item, index) => {
                const amount = item.amount ?? 0;
                const percentage = item.percentage ?? (total > 0 ? (amount / total) * 100 : 0);
                const color = item.color ?? "#3b82f6";
                
                // Calculate left offset (sum of all previous percentages)
                const leftOffset = items
                  .slice(0, index)
                  .reduce((sum, prevItem) => {
                    const prevAmount = prevItem.amount ?? 0;
                    const prevPercentage = prevItem.percentage ?? (total > 0 ? (prevAmount / total) * 100 : 0);
                    return sum + prevPercentage;
                  }, 0);
                
                if (percentage > 0) {
                  return (
                    <div
                      key={index}
                      className="absolute top-0 h-full"
                      style={{
                        left: `${leftOffset}%`,
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* List of categories below */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const category = item.category ?? "Unknown";
              const amount = item.amount ?? 0;
              const amountFormatted = item.amount_formatted ?? "0";
              const percentage = item.percentage ?? (total > 0 ? (amount / total) * 100 : 0);
              const color = item.color ?? "#3b82f6";

              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{amountFormatted}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

