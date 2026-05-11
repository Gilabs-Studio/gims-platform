"use client";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { SalesTargetsList } from "./sales-targets-list";
import { SalesTargetProgress } from "./sales-target-progress";
import { useSalesTargets } from "../hooks/use-sales-targets";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";

export function SalesTargetsDualUI() {
  const t = useTranslations("salesTargets");
  const { user } = useAuthStore();
  
  const readScope = user?.permissions?.["sales_target.read"] || user?.permissions?.["sales_target.*"];
  const canReadAll = readScope === "ALL";
  const canReadOwn = readScope === "OWN" || readScope === "ALL";

  // Fetch only the current year for OWN view
  const currentYear = new Date().getFullYear();
  const { data, isLoading } = useSalesTargets({
    year: canReadAll ? undefined : currentYear, // only filter by year for OWN view
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // If user has ALL permission, they are a manager/admin. Show the list.
  if (canReadAll) {
    return <SalesTargetsList />;
  }

  // If user only has OWN permission, they are a sales rep. Show their personal target.
  if (canReadOwn) {
    const target = data?.data?.[0]; // Backend automatically filters by employee_id for OWN scope
    
    if (!target) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card shadow-sm">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Target className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t("noTarget")}</h2>
          <p className="text-muted-foreground max-w-md">
            {t("noTargetDesc")}
          </p>
        </div>
      );
    }

    return <SalesTargetProgress target={target} />;
  }

  return null;
}
