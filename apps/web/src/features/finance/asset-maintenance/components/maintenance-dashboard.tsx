"use client";

import { useTranslations } from "next-intl";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Package,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  useMaintenanceDashboard,
  useMaintenanceAlerts,
} from "../hooks/use-asset-maintenance";

export function MaintenanceDashboard() {
  const t = useTranslations("assetMaintenance");
  const { data: dashboardData, isLoading: isLoadingDashboard } =
    useMaintenanceDashboard();
  const { data: alertsData, isLoading: isLoadingAlerts } =
    useMaintenanceAlerts();

  const dashboard = dashboardData?.data;
  const alerts = alertsData?.data || [];

  if (isLoadingDashboard || isLoadingAlerts) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.stats.totalSchedules")}
          value={dashboard?.total_schedules || 0}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          title={t("dashboard.stats.activeSchedules")}
          value={dashboard?.active_schedules || 0}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <StatCard
          title={t("dashboard.stats.overdueMaintenance")}
          value={dashboard?.overdue_maintenance || 0}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="destructive"
        />
        <StatCard
          title={t("dashboard.stats.upcomingMaintenance")}
          value={dashboard?.upcoming_maintenance || 0}
          icon={<Clock className="h-4 w-4" />}
          variant="warning"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.stats.openWorkOrders")}
          value={dashboard?.open_work_orders || 0}
          icon={<Wrench className="h-4 w-4" />}
        />
        <StatCard
          title={t("dashboard.stats.inProgressWorkOrders")}
          value={dashboard?.in_progress_work_orders || 0}
          icon={<Clock className="h-4 w-4" />}
          variant="info"
        />
        <StatCard
          title={t("dashboard.stats.totalSpareParts")}
          value={dashboard?.total_spare_parts || 0}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          title={t("dashboard.stats.lowStockItems")}
          value={dashboard?.low_stock_items || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="warning"
        />
      </div>

      {/* Cost Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.stats.totalMaintenanceCost")}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(dashboard?.total_maintenance_cost || 0, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.stats.completedThisMonth")}: {dashboard?.completed_this_month || 0}
          </p>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("alerts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {t("alerts.noAlerts")}
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <AlertItem key={index} alert={alert} t={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "success" | "destructive" | "warning" | "info";
}

function StatCard({ title, value, icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "",
    success: "text-green-600",
    destructive: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={variantStyles[variant]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: {
    type: "overdue" | "upcoming" | "low_stock";
    title: string;
    description: string;
    asset_code?: string;
    asset_name?: string;
    days_overdue?: number;
    days_until_due?: number;
    spare_part_name?: string;
    current_stock?: number;
    reorder_point?: number;
  };
  t: (key: string, params?: Record<string, string | number>) => string;
}

function AlertItem({ alert, t }: AlertItemProps) {
  const getAlertBadge = () => {
    switch (alert.type) {
      case "overdue":
        return <Badge variant="destructive">{t("alerts.overdue")}</Badge>;
      case "upcoming":
        return <Badge variant="warning">{t("alerts.upcoming")}</Badge>;
      case "low_stock":
        return <Badge variant="secondary">{t("alerts.lowStock")}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {getAlertBadge()}
          <span className="font-medium">{alert.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{alert.description}</p>
        {alert.asset_code && (
          <p className="text-xs text-muted-foreground">
            {alert.asset_code} - {alert.asset_name}
          </p>
        )}
        {alert.days_overdue !== undefined && alert.days_overdue > 0 && (
          <p className="text-xs text-red-600">
            {t("alerts.daysOverdue", { days: alert.days_overdue })}
          </p>
        )}
        {alert.days_until_due !== undefined && (
          <p className="text-xs text-yellow-600">
            {t("alerts.daysUntilDue", { days: alert.days_until_due })}
          </p>
        )}
        {alert.spare_part_name && (
          <p className="text-xs text-muted-foreground">
            {alert.spare_part_name}: {alert.current_stock} / {alert.reorder_point}
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[150px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
