"use client";

// TODO(restrict-api-by-plan): Subscription plan names are displayed here for visibility,
// but the platform currently grants full access regardless of plan tier.
// Future: implement plan-based route/feature gating in middleware and sidebar navigation
// so users on e.g. "pos_essential" cannot access ERP or HR modules.
// Backend tracking: see planPriceIDR() in auth_usecase.go and the subscription_gate_middleware.go stub.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageMotion } from "@/components/motion/page-motion";
import { systemAdminService } from "../services/system-admin-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Infinity } from "lucide-react";
import type { Subscription, SubscriptionStatus } from "../types";

const PLAN_LABELS: Record<string, string> = {
  pos_essential: "POS Essential",
  pos_growth: "POS Growth",
  pos_enterprise: "POS Enterprise",
  erp_core: "ERP Core",
  erp_pro: "ERP Pro",
  erp_enterprise: "ERP Enterprise",
  crm_basic: "CRM Basic",
  crm_growth: "CRM Growth",
  crm_enterprise: "CRM Enterprise",
  hr_basic: "HR Basic",
  hr_growth: "HR Growth",
  hr_enterprise: "HR Enterprise",
  full_access: "Full Access",
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trial: "outline",
  expired: "destructive",
  cancelled: "secondary",
};

export function SubscriptionList() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [tenantSearch, setTenantSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sys-subscriptions", { status: statusFilter !== "all" ? statusFilter : undefined }],
    queryFn: () =>
      systemAdminService.getSubscriptions({
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  const subscriptions = (data?.data ?? []).filter((s: Subscription) =>
    tenantSearch
      ? (s.tenant_name ?? s.tenant_id).toLowerCase().includes(tenantSearch.toLowerCase())
      : true,
  );

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load subscriptions.
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            View and monitor active tenant subscriptions across all plans.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by tenant..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as SubscriptionStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {data?.data && (
            <span className="text-sm text-muted-foreground">
              {subscriptions.length} result{subscriptions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Coupon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub: Subscription) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.tenant_name ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {sub.tenant_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PLAN_LABELS[sub.plan] ?? sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {BILLING_LABELS[sub.billing_period] ?? sub.billing_period}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[sub.status] ?? "secondary"}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.starts_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sub.expires_at ? (
                        new Date(sub.expires_at).toLocaleDateString()
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-muted-foreground"
                          title="Lifetime subscription"
                        >
                          <Infinity className="h-3.5 w-3.5" />
                          <span className="text-xs">Lifetime</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.coupon_code ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageMotion>
  );
}
