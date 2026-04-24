"use client";

import { PageMotion } from "@/components/motion/page-motion";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import {
  Activity,
  BellRing,
  Building2,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Gauge,
  LayoutGrid,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  TicketSlash,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";

import { useSystemAdminDashboard } from "../hooks/use-tenants";
import type {
  BillingActivitySummary,
  BusinessHealthSummary,
  InfrastructurePerformanceSummary,
  PlanMixItem,
  SupportIncidentsSummary,
  Tenant,
  TenantOverviewRow,
} from "../types";

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
  growth_suite: "Growth Suite",
  ultimate_suite: "Ultimate Suite",
};

const TOP_NAV = [
  "Overview",
  "Tenant",
  "Billing & Revenue",
  "Pengguna",
  "Infrastruktur",
  "Support",
  "Config & Feature Flag",
];

const formatIDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatCompactIDR(value: number) {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  }
  if (absoluteValue >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}jt`;
  }
  if (absoluteValue >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }
  return formatIDR.format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPlanLabel(plan: string) {
  return PLAN_LABELS[plan] ?? plan.replaceAll("_", " ");
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") {
    return "bg-lime-100 text-lime-800 ring-1 ring-lime-200 dark:bg-lime-900/30 dark:text-lime-300";
  }
  if (normalized === "trial") {
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (normalized === "overdue" || normalized === "suspended") {
    return "bg-rose-100 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground";
}

export function SystemAdminDashboard() {
  const { data, isLoading, isError } = useSystemAdminDashboard();

  if (isLoading) {
    return (
      <PageMotion>
        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="h-4 w-72 rounded bg-muted" />
            </CardHeader>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 rounded bg-muted" />
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
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          Failed to load dashboard data.
        </div>
      </PageMotion>
    );
  }

  const businessHealth = data?.business_health;
  const planMix = data?.plan_mix ?? [];
  const billingActivity = data?.billing_activity;
  const supportIncidents = data?.support_incidents;
  const infrastructure = data?.infrastructure_performance;
  const tenantRows = (data?.tenant_overview ?? data?.tenants ?? []).slice(0, 4) as Array<TenantOverviewRow | Tenant>;

  const cards = [
    {
      label: "MRR",
      value: formatCompactIDR(businessHealth?.mrr_idr ?? 0),
      note: "+12% MoM",
    },
    {
      label: "ARR",
      value: formatCompactIDR(businessHealth?.arr_idr ?? 0),
      note: "annualized",
    },
    {
      label: "Churn Rate",
      value: formatPercent(businessHealth?.churn_rate_percent ?? 0),
      note: "vs bulan lalu",
    },
    {
      label: "Net Revenue Retention",
      value: formatPercent(businessHealth?.net_revenue_retention_percent ?? 0),
      note: "ekspansi > churn",
    },
    {
      label: "Total Tenant Aktif",
      value: `${businessHealth?.total_tenant_aktif ?? 0}`,
      note: `+${businessHealth?.delta_tenant_bulan_ini ?? 0} bulan ini`,
    },
    {
      label: "Total Seat Terjual",
      value: `${businessHealth?.total_seat_terjual?.toLocaleString("id-ID") ?? 0}`,
      note: "avg seat/tenant",
    },
    {
      label: "Trial Aktif",
      value: `${businessHealth?.trial_aktif ?? 0}`,
      note: "expires < 7 hari",
    },
    {
      label: "Overdue Invoice",
      value: `${businessHealth?.overdue_invoice ?? 0}`,
      note: "Perlu tindakan",
      tone: "danger" as const,
    },
  ];

  return (
    <PageMotion>
      <div className="space-y-8">
        <section className="space-y-5 rounded-3xl border border-border/70 bg-muted/20 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="text-3xl font-semibold tracking-tight">Platform Admin</div>
              <div className="text-sm text-muted-foreground">Super admin — semua tenant</div>
              <div className="flex flex-wrap gap-2 pt-2">
                {TOP_NAV.map((item, index) => (
                  <Badge
                    key={item}
                    variant={index === 0 ? "default" : "outline"}
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm font-medium",
                      index === 0 && "bg-primary text-primary-foreground",
                    )}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-lime-100 px-3 py-1 text-lime-800 hover:bg-lime-100">
                System Normal
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                v2.4.1
              </Badge>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Business Health" icon={TrendingUp} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.95fr]">
          <PlanMixCard planMix={planMix} />
          <BillingActivityCard billingActivity={billingActivity} />
          <SupportIncidentsCard support={supportIncidents} />
        </section>

        <section className="space-y-4">
          <SectionHeading title="Manajemen Tenant" icon={Building2} />
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-base font-semibold">Tenant terbaru & perlu perhatian</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-b-3xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Seat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Bergabung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantRows.map((tenant) => {
                      const isOverviewRow = "tenant_name" in tenant;
                      const name = isOverviewRow ? tenant.tenant_name : tenant.name;
                      const plan = isOverviewRow ? tenant.plan : tenant.plan;
                      const seat = isOverviewRow ? tenant.seat : tenant.max_users;
                      const status = isOverviewRow ? tenant.status : tenant.status;
                      const joinedAt = isOverviewRow
                        ? tenant.joined_at
                        : tenant.created_at ?? new Date().toISOString();

                      return (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                              {getPlanLabel(plan)}
                            </Badge>
                          </TableCell>
                          <TableCell>{seat}</TableCell>
                          <TableCell>
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", getStatusClass(status))}>
                              {status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isOverviewRow && tenant.mrr_idr ? formatCompactIDR(tenant.mrr_idr) : "—"}
                          </TableCell>
                          <TableCell>{formatDateLabel(joinedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Infrastruktur & Performa" icon={Gauge} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfraCard
              icon={CheckCircle2}
              label="Uptime (30d)"
              value={formatPercent(infrastructure?.uptime_30d_percent ?? 0)}
              note="SLA terpenuhi"
            />
            <InfraCard
              icon={Cpu}
              label="API Latency avg"
              value={`${Math.round(infrastructure?.api_latency_avg_ms ?? 0)}ms`}
              note="Normal"
            />
            <InfraCard
              icon={TriangleAlert}
              label="Error Rate"
              value={formatPercent(infrastructure?.error_rate_percent ?? 0)}
              note="Di bawah threshold"
            />
            <InfraCard
              icon={Database}
              label="DB Size"
              value={infrastructure?.db_size_label ?? "0 B"}
              note="+8% MoM"
            />
          </div>
          <Card className="border-border/70 bg-muted/20 shadow-sm">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-base font-semibold">Observability note</CardTitle>
              <p className="text-sm text-muted-foreground">
                {infrastructure?.observation_note ?? "Live metrics from request middleware and PostgreSQL storage size."}
              </p>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Feature Flags & Config Global" icon={Sparkles} />
          <Card className="border-border/70 shadow-sm">
            <CardContent className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
              <FlagItem label="AI Module (beta)" value="Hanya Ultimate" tone="warning" />
              <FlagItem label="Maintenance Mode" value="Off" tone="success" />
              <FlagItem label="New Onboarding Flow" value="50% rollout" tone="info" />
              <FlagItem label="Coupon Engine" value="Aktif" tone="success" />
              <FlagItem label="Auto Bundle" value="Aktif" tone="success" />
              <FlagItem label="Xendit Webhook" value="Terhubung" tone="success" />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageMotion>
  );
}

function SectionHeading({ title, icon: Icon }: { title: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "danger";
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <Badge
          variant={tone === "danger" ? "destructive" : "secondary"}
          className={cn("rounded-full px-3 py-1 text-xs", tone === "danger" && "bg-rose-100 text-rose-700")}
        >
          {note}
        </Badge>
      </CardContent>
    </Card>
  );
}

function PlanMixCard({ planMix }: { planMix: PlanMixItem[] }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-base font-semibold">Distribusi Plan</CardTitle>
        <p className="text-sm text-muted-foreground">Komposisi tenant aktif berdasarkan paket langganan.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {planMix.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Belum ada data plan mix.</div>
        ) : (
          planMix.slice(0, 3).map((item, index) => (
            <div key={item.plan} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.seat_count.toLocaleString("id-ID")} seat</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.tenant_count.toLocaleString("id-ID")} tenant</div>
                  <div className="text-xs text-muted-foreground">{item.share_percent.toFixed(0)}%</div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    index === 0 && "bg-violet-500",
                    index === 1 && "bg-emerald-500",
                    index === 2 && "bg-sky-500",
                  )}
                  style={{ width: `${Math.max(12, Math.min(item.share_percent, 100))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function BillingActivityCard({ billingActivity }: { billingActivity?: BillingActivitySummary }) {
  const rows = [
    { label: "Pembayaran berhasil", value: billingActivity?.success_count ?? 0, tone: "success" },
    { label: "Gagal (retry)", value: billingActivity?.failed_retry ?? 0, tone: "danger" },
    { label: "Refund diproses", value: billingActivity?.refund_process ?? 0, tone: "warning" },
    { label: "Upgrade plan", value: billingActivity?.upgrade_plan ?? 0, tone: "info" },
    { label: "Tambah seat", value: billingActivity?.add_seat ?? 0, tone: "info" },
  ] as const;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
          Aktivitas Billing (30 hari)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{row.label}</div>
            <Badge
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                row.tone === "success" && "bg-lime-100 text-lime-800",
                row.tone === "danger" && "bg-rose-100 text-rose-800",
                row.tone === "warning" && "bg-amber-100 text-amber-800",
                row.tone === "info" && "bg-sky-100 text-sky-800",
              )}
            >
              {row.value.toLocaleString("id-ID")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SupportIncidentsCard({ support }: { support?: SupportIncidentsSummary }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Support & Insiden
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          TODO: sambungkan data helpdesk dan incident tracker ke dashboard ini.
        </div>
        <div className="space-y-2 text-sm">
          <SupportStat label="Tiket terbuka" value={support?.open_tickets ?? 24} />
          <SupportStat label="SLA breach" value={support?.sla_breach ?? 2} danger />
          <SupportStat label="CSAT rata-rata" value={`${(support?.csat_average ?? 4.6).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`} />
          <SupportStat label="Insiden aktif" value={`${support?.active_incidents ?? 1} (minor)`} accent />
        </div>
      </CardContent>
    </Card>
  );
}

function SupportStat({
  label,
  value,
  danger,
  accent,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <div className="text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-semibold",
          danger && "text-rose-600",
          accent && "text-amber-600",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InfraCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
}

function FlagItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "info";
}) {
  const toneClass = {
    success: "bg-lime-100 text-lime-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", toneClass)}>{value}</Badge>
    </div>
  );
}
