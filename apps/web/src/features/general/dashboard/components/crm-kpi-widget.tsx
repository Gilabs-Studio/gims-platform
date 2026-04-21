"use client";

import { useTranslations } from "next-intl";
import { ContactRound, UserPlus, Handshake, CalendarCheck } from "lucide-react";
import type { WidgetConfig } from "../types";
import { useDashboardWidgetOverview } from "../hooks/use-dashboard";
import { useUserPermission } from "@/hooks/use-user-permission";
import { WidgetAsyncState } from "./widget-async-state";
import { WIDGET_REGISTRY } from "../config/widget-registry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CrmKpiWidgetProps {
  readonly widget: WidgetConfig;
}

export function CrmKpiWidget({ widget }: CrmKpiWidgetProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  const canView = useUserPermission(registry?.permission ?? "");
  const { data, isLoading, isError, refetch } = useDashboardWidgetOverview(widget.type, {
    enabled: canView,
  });

  const crm = data?.crm_summary;

  if (!canView) return null;

  return (
    <WidgetAsyncState isLoading={isLoading} isError={isError} onRetry={refetch}>
      {widget.type === "crm_total_contacts" && (
        <Card className="h-full">
          <CardHeader className="space-y-1 pb-2">
            <CardDescription className="flex items-center gap-2">
              <ContactRound className="h-4 w-4" />
              {t("widgets.crm_total_contacts.title")}
            </CardDescription>
            <CardTitle className="text-2xl lg:text-3xl">{crm?.total_contacts ?? 0}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {widget.type === "crm_active_leads" && (
        <Card className="h-full">
          <CardHeader className="space-y-1 pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t("widgets.crm_active_leads.title")}
            </CardDescription>
            <CardTitle className="text-2xl lg:text-3xl">{crm?.active_leads ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {crm?.leads_this_month ?? 0} {t("widgets.crm_active_leads.thisMonth")}
            </p>
          </CardContent>
        </Card>
      )}

      {widget.type === "crm_deals_overview" && (
        <Card className="h-full">
          <CardHeader className="space-y-1 pb-2">
            <CardDescription className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              {t("widgets.crm_deals_overview.title")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0">
            <div>
              <p className="text-2xl font-bold leading-none">{crm?.deals_in_progress ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("widgets.crm_deals_overview.inProgress")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{crm?.deals_won_this_month ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("widgets.crm_deals_overview.wonThisMonth")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {widget.type === "crm_activity_summary" && (
        <Card className="h-full">
          <CardHeader className="space-y-1 pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              {t("widgets.crm_activity_summary.title")}
            </CardDescription>
            <CardTitle className="text-2xl lg:text-3xl">{crm?.activities_today ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">{t("widgets.crm_activity_summary.activitiesToday")}</p>
          </CardContent>
        </Card>
      )}
    </WidgetAsyncState>
  );
}
