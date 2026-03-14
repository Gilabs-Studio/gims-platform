"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  Users,
  TrendingDown,
  Calculator,
  Plus,
  RefreshCw,
  Target,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useFinanceSalaryStats } from "../hooks/use-finance-salary";
import { useUserPermission } from "@/hooks/use-user-permission";

interface SalaryHeaderProps {
  readonly className?: string;
  readonly onCreateClick: () => void;
  readonly onRefreshClick: () => void;
  readonly isRefreshing?: boolean;
}

export function SalaryHeader({
  className,
  onCreateClick,
  onRefreshClick,
  isRefreshing = false,
}: SalaryHeaderProps) {
  const t = useTranslations("financeSalary");
  const canCreate = useUserPermission("salary.create");

  const { data: statsData, isLoading: statsLoading } = useFinanceSalaryStats();
  const stats = statsData?.data;

  const statCards = useMemo(() => {
    if (!stats) return null;
    return [
      {
        label: t("stats.total"),
        value: stats.total.toLocaleString(),
        icon: Users,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        label: t("stats.active"),
        value: stats.active.toLocaleString(),
        icon: Target,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        label: t("stats.draft"),
        value: stats.draft.toLocaleString(),
        icon: Calculator,
        color: "text-muted-foreground",
        bg: "bg-muted/10",
      },
      {
        label: t("stats.inactive"),
        value: stats.inactive.toLocaleString(),
        icon: TrendingDown,
        color: "text-destructive",
        bg: "bg-destructive/10",
      },
    ];
  }, [stats, t]);

  const rangeStats = useMemo(() => {
    if (!stats) return null;
    return [
      {
        label: t("stats.average"),
        value: stats.average_salary,
        icon: Calculator,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        label: t("stats.min"),
        value: stats.min_salary,
        icon: Minus,
        color: "text-secondary-foreground",
        bg: "bg-secondary/20",
      },
      {
        label: t("stats.max"),
        value: stats.max_salary,
        icon: DollarSign,
        color: "text-accent-foreground",
        bg: "bg-accent/20",
      },
    ];
  }, [stats, t]);

  return (
    <div className={className}>
      {/* Title + Actions */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground opacity-50 text-sm sm:text-base">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshClick}
            disabled={isRefreshing}
            className="w-full sm:w-auto cursor-pointer"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{t("actions.refresh")}</span>
          </Button>

          {canCreate && (
            <Button
              variant="default"
              size="sm"
              onClick={onCreateClick}
              className="w-full sm:w-auto cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>{t("actions.add")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-6">
        {statsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Section - Salary Overview */}
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">
                {t("stats.overview")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grow">
                {statCards?.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border p-4 bg-card h-full flex flex-col justify-center"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {card.label}
                        </p>
                        <p className={`text-2xl font-bold ${card.color}`}>
                          {card.value}
                        </p>
                      </div>
                      <div
                        className={`h-8 w-8 rounded-full ${card.bg} flex items-center justify-center`}
                      >
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section - Salary Statistics */}
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4">
                {t("stats.salaryStats")}
              </h3>
              <div className="flex flex-col justify-between grow rounded-lg border p-4 bg-card">
                {rangeStats?.map((item, idx) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between py-2 ${
                      idx < (rangeStats?.length ?? 0) - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {item.label}
                        </p>
                        <p className={`text-2xl font-bold ${item.color}`}>
                          {formatCurrency(item.value)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
