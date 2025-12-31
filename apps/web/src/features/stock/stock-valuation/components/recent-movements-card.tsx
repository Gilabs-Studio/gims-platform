"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { StockValuation } from "../types";
import { cn } from "@/lib/utils";

interface RecentMovementsCardProps {
  readonly movements?: StockValuation[];
  readonly isLoading?: boolean;
  readonly onViewAll?: () => void;
}

export function RecentMovementsCard({ movements, isLoading, onViewAll }: RecentMovementsCardProps) {
  const t = useTranslations("stockValuations.recentMovements");

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-8 w-20 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentMovements = movements?.slice(0, 8) ?? [];

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {t("viewAll")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {recentMovements.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="space-y-4">
            {recentMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Product Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={movement.product?.image_url}
                    alt={movement.product?.name ?? "Product"}
                  />
                  <AvatarFallback className="text-xs">
                    {movement.product?.code?.slice(0, 2).toUpperCase() ?? "PR"}
                  </AvatarFallback>
                </Avatar>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {movement.product?.name ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {movement.warehouse?.name ?? "-"}
                  </p>
                </div>

                {/* Movement Type Badge */}
                <Badge
                  variant={movement.movement_type === "IN" ? "default" : "destructive"}
                  className={cn(
                    "shrink-0",
                    movement.movement_type === "IN"
                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                  )}
                >
                  {movement.movement_type === "IN" ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {movement.quantity?.toLocaleString() ?? 0}
                </Badge>

                {/* Value */}
                <div className="text-right shrink-0 min-w-20">
                  <p className="font-medium text-sm">
                    {formatCurrency(movement.total_cost ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {movement.created_at
                      ? new Date(movement.created_at).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
