"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { useSystemAdminDashboard } from "../hooks/use-tenants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Activity, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemAdminDashboard() {
  const { data, isLoading, isError } = useSystemAdminDashboard();

  if (isLoading) {
    return (
      <PageMotion>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">System Dashboard</h1>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageMotion>
    );
  }

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load dashboard data.
        </div>
      </PageMotion>
    );
  }

  const activeTenants =
    data?.tenants?.filter((t) => t.status === "active").length ?? 0;
  const trialTenants =
    data?.tenants?.filter((t) => t.status === "trial").length ?? 0;
  const suspendedTenants =
    data?.tenants?.filter((t) => t.status === "suspended").length ?? 0;

  const stats = [
    {
      label: "Total Tenants",
      value: data?.total_tenants ?? 0,
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Active",
      value: activeTenants,
      icon: Activity,
      color: "text-green-600",
    },
    {
      label: "Trial",
      value: trialTenants,
      icon: Users,
      color: "text-amber-600",
    },
    {
      label: "Suspended",
      value: suspendedTenants,
      icon: Shield,
      color: "text-destructive",
    },
  ];

  return (
    <PageMotion>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Dashboard</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Tenants */}
        {data?.tenants && data.tenants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.tenants.slice(0, 5).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {tenant.slug}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {tenant.plan}
                      </span>
                      <StatusBadge status={tenant.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageMotion>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    trial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        colorMap[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}
