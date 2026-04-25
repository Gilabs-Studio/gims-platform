"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageMotion } from "@/components/motion/page-motion";
import { systemAdminService } from "../services/system-admin-service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Search, Infinity, Coins, Users, ReceiptText, CalendarClock } from "lucide-react";
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

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

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

  const summary = useMemo(() => {
    const revenue = subscriptions.reduce((total, sub) => total + (sub.amount_paid_idr ?? 0), 0);
    const paidCount = subscriptions.filter((sub) => (sub.amount_paid_idr ?? 0) > 0).length;
    const average = paidCount > 0 ? revenue / paidCount : 0;
    const expiringSoon = subscriptions.filter((sub) => {
      if (!sub.next_billing_at) return false;
      const dueDate = new Date(sub.next_billing_at);
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 14);
      return dueDate <= horizon;
    }).length;

    return { revenue, paidCount, average, expiringSoon };
  }, [subscriptions]);

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
      <div className="space-y-8">
        <div className="rounded-2xl border border-border/70 bg-linear-to-br from-background via-background to-muted/20 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <ReceiptText className="h-3.5 w-3.5 text-emerald-600" />
                Revenue and billing audit
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Subscriptions</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                A compact billing view for support, debugging, and quick revenue checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {subscriptions.length} visible
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {currencyFormatter.format(summary.revenue)} revenue
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">{currencyFormatter.format(summary.revenue)}</div>
              <Coins className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">{summary.paidCount}</div>
              <Users className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Ticket</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">{currencyFormatter.format(summary.average)}</div>
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">{summary.expiringSoon}</div>
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
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
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Payment Ref</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Coupon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub: Subscription) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="space-y-0.5">
                        <div>{sub.tenant_name ?? sub.tenant_id}</div>
                        <div className="font-mono text-xs text-muted-foreground">{sub.tenant_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full">
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
                    <TableCell className="text-sm font-medium">
                      {sub.amount_paid_idr ? currencyFormatter.format(sub.amount_paid_idr) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.next_billing_at ? new Date(sub.next_billing_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.xendit_payment_id ?? "—"}
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
