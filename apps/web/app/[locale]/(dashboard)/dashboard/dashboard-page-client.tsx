"use client";

import { useTranslations } from "next-intl";
import { useDashboard } from "@/features/general/dashboard/hooks/use-dashboard";
import { DeliveriesCard } from "@/features/general/dashboard/components/deliveries-card";
import { RevenueCostsCard } from "@/features/general/dashboard/components/revenue-costs-card";
import { BalanceCard } from "@/features/general/dashboard/components/balance-card";
import { CostsByCategoryCard } from "@/features/general/dashboard/components/costs-by-category-card";
import { InvoicesCard } from "@/features/general/dashboard/components/invoices-card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageClient() {
  const t = useTranslations("dashboard");
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("error")}
        </p>
      </div>
    );
  }

  const deliveries = data?.deliveries;
  const revenueCosts = data?.revenue_costs;
  const balance = data?.balance;
  const costsByCategory = data?.costs_by_category;
  const invoicesSummary = data?.invoices_summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Deliveries Card */}
          <DeliveriesCard data={deliveries} />

          {/* Revenue & Costs Card */}
          <RevenueCostsCard data={revenueCosts} />

          {/* Balance & Costs by Category Grid - 50/50 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BalanceCard data={balance} />
            <CostsByCategoryCard data={costsByCategory} />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1">
          <InvoicesCard summary={invoicesSummary} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    </div>
  );
}

