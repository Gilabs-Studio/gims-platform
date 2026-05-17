"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Minus,
  Plus,
  Phone,
  XCircle,
  Loader2,
  Zap,
  CreditCard,
  CalendarClock,
  Users,
  BadgeCheck,
  ArrowUpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { authService, type SubscriptionPlanConfig } from "@/features/auth/services/auth-service";
import { useOutletLimit } from "@/features/master-data/outlet/hooks/use-outlet-limit";
import {
  billingService,
  type BillingChangeAction,
  type BillingChangeResponse,
  type TenantSubscription,
} from "../../services/billing-service";
import { paymentHistoryService } from "../../services/payment-history-service";

const MAX_SELF_SERVICE_SEAT_LIMIT = 999;

// ─── Local types ──────────────────────────────────────────────────────────────

type BillingPeriod = "monthly" | "yearly";

interface BundlePlan {
  id: string;
  name: string;
  tagline: string;
  perUserMonthly: number;
  badge?: string;
  modules: string[];
  highlight?: boolean;
  cta?: "select" | "contact";
}

type ComparisonCellValue = string | "check" | "minus";
interface BundleComparisonRow {
  label: string;
  values: Record<string, ComparisonCellValue>;
}

const ENTERPRISE_CTA: BundlePlan = {
  id: "enterprise",
  name: "Enterprise",
  tagline: "Custom for your business",
  perUserMonthly: 0,
  cta: "contact",
  modules: [
    "Everything in Ultimate",
    "Unlimited users",
    "Dedicated SLA",
    "Custom integrations",
    "On-premise option",
  ],
};

const CONTACT_SALES_URL = "https://wa.me/6289607700028?text=Hi%20SalesView%2C%20I%20want%20to%20consult%20about%20the%20Enterprise%20plan.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(amount: number): string {
  if (amount === 0) return "Custom";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatSignedIDR(amount: number): string {
  const formatted = formatCurrencyIDR(Math.abs(amount));
  if (amount > 0) {
    return `+${formatted}`;
  }
  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

function effectiveMonthlyPrice(perUser: number, users: number, billing: BillingPeriod): number {
  const base = perUser * users;
  return billing === "yearly" ? Math.round(base * 0.9) : base;
}

function totalInvoice(perUser: number, users: number, billing: BillingPeriod): number {
  const monthly = effectiveMonthlyPrice(perUser, users, billing);
  return billing === "yearly" ? monthly * 12 : monthly;
}

function estimateCycleTotal(plan: SubscriptionPlanConfig | undefined, billingPeriod: string | undefined, seatCount: number): number {
  if (!plan) {
    return 0;
  }
  const period = billingPeriod === "yearly" ? "yearly" : "monthly";
  const safeSeats = Math.max(1, seatCount);
  if (plan.billing_type === "flat") {
    return period === "yearly" ? plan.price_yearly_idr : plan.price_monthly_idr;
  }
  const unitPrice = period === "yearly" ? plan.price_yearly_idr : plan.price_monthly_idr;
  return unitPrice * safeSeats;
}

function resolveInvoiceURL(result: BillingChangeResponse): string | null {
  const raw = result.xendit_payload?.invoice_url;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function statusBadgeClass(status: TenantSubscription["status"]): string {
  switch (status) {
    case "active": return "bg-success/15 text-success";
    case "trial": return "bg-primary/15 text-primary";
    case "expired": return "bg-destructive/15 text-destructive";
    case "cancelled": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function normalizeFeatureName(value: string): string {
  return value.trim().toLowerCase();
}

function buildBundleComparisonRows(
  bundles: BundlePlan[],
  labels: {
    users: string;
    perSeat: string;
    unlimitedUsers: string;
  },
): BundleComparisonRow[] {
  if (!bundles.length) {
    return [];
  }

  const rows: BundleComparisonRow[] = [
    {
      label: labels.users,
      values: Object.fromEntries(
        bundles.map((bundle) => [
          bundle.id,
          bundle.cta === "contact" ? labels.unlimitedUsers : labels.perSeat,
        ]),
      ),
    },
  ];

  const uniqueFeatures: string[] = [];
  for (const bundle of bundles) {
    for (const feature of bundle.modules) {
      const featureName = feature.trim();
      if (!featureName) {
        continue;
      }
      if (!uniqueFeatures.some((existing) => normalizeFeatureName(existing) === normalizeFeatureName(featureName))) {
        uniqueFeatures.push(featureName);
      }
    }
  }

  for (const feature of uniqueFeatures) {
    rows.push({
      label: feature,
      values: Object.fromEntries(
        bundles.map((bundle) => {
          const included = bundle.modules.some(
            (moduleName) => normalizeFeatureName(moduleName) === normalizeFeatureName(feature),
          );
          return [bundle.id, included ? "check" : "minus"];
        }),
      ),
    });
  }

  return rows;
}

// ─── Current plan card ────────────────────────────────────────────────────────

function CurrentPlanCard({ sub, planName }: { sub: TenantSubscription; planName: string }) {
  const nextBilling = sub.next_billing_at
    ? new Date(sub.next_billing_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const expiresAt = sub.expires_at
    ? new Date(sub.expires_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
    : "Lifetime";

  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Plan</p>
          <p className="mt-1 text-xl font-semibold">{planName}</p>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">{sub.billing_period} billing</p>
        </div>
        <span className={cn("rounded-lg px-3 py-1 text-xs font-semibold capitalize", statusBadgeClass(sub.status))}>
          {sub.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border/60 pt-4 text-sm">
        <div className="flex items-start gap-2">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Amount Paid</p>
            <p className="font-medium">{formatIDR(sub.amount_paid_idr)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Seat Count</p>
            <p className="font-medium">{sub.user_count} users</p>
          </div>
        </div>
        {nextBilling && (
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Next Billing</p>
              <p className="font-medium">{nextBilling}</p>
            </div>
          </div>
        )}
        {expiresAt && (
          <div className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="font-medium">{expiresAt}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Plan upgrade table (mirrors register-form step 2) ───────────────────────

interface PlanTableProps {
  bundles: BundlePlan[];
  comparisonRows: BundleComparisonRow[];
  billing: BillingPeriod;
  userCount: number;
  selectedBundle: string;
  currentPlanSlug?: string;
  onSelectBundle: (id: string) => void;
  onBillingChange: (p: BillingPeriod) => void;
  onUserCountChange: (n: number) => void;
  isUpgrading: boolean;
  onUpgrade: () => void;
}

function renderComparisonCell(value: ComparisonCellValue) {
  if (value === "check") return <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />;
  if (value === "minus") return <XCircle className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />;
  return <span className="text-sm text-foreground">{value}</span>;
}

function PlanUpgradeTable({
  bundles, comparisonRows, billing, userCount, selectedBundle, currentPlanSlug,
  onSelectBundle, onBillingChange, onUserCountChange, isUpgrading, onUpgrade,
}: PlanTableProps) {
  const ultimatePlan = bundles.find((b) => b.id === "ultimate_suite");
  void ultimatePlan; // referenced implicitly via the table render

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => onBillingChange("monthly")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onBillingChange("yearly")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors",
              billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Yearly
            <span className="rounded-lg bg-success/15 px-2 py-0.5 text-success">Save 10%</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Users</span>
          <div className="flex items-center rounded-lg border border-border/70">
            <button
              type="button"
              onClick={() => onUserCountChange(Math.max(1, userCount - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Decrease users"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={1}
              max={500}
              value={userCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 500) onUserCountChange(v);
              }}
              className="h-9 w-14 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Number of users"
            />
            <button
              type="button"
              onClick={() => onUserCountChange(Math.min(500, userCount + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Increase users"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-border/80">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Features</th>
              {bundles.map((b) => {
                const isSelected = selectedBundle === b.id;
                return (
                  <th
                    key={b.id}
                    className={cn(
                      "px-6 py-4 text-left",
                      isSelected && b.cta !== "contact" && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{b.name}</p>
                      {b.badge && (
                        <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {b.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.tagline}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/70">
              <th scope="row" className="px-6 py-4 text-left text-sm font-medium text-foreground">Price</th>
              {bundles.map((b) => {
                const isSelected = selectedBundle === b.id;
                if (b.cta === "contact") {
                  return (
                    <td key={b.id} className={cn("px-6 py-4 align-top", isSelected && "bg-primary/5")}>
                      <p className="text-xl font-semibold text-foreground">Custom</p>
                      <p className="mt-1 text-xs text-muted-foreground">Talk with our team for volume pricing</p>
                    </td>
                  );
                }
                const effectiveMonthly = effectiveMonthlyPrice(b.perUserMonthly, userCount, billing);
                const baseMonthly = b.perUserMonthly * userCount;
                return (
                  <td key={b.id} className={cn("px-6 py-4 align-top", isSelected && "bg-primary/5")}>
                    {billing === "yearly" ? (
                      <div>
                        <p className="text-xs text-muted-foreground line-through">{formatIDR(baseMonthly)}/mo</p>
                        <p className="text-xl font-semibold text-foreground">
                          {formatIDR(effectiveMonthly)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                        </p>
                        <p className="mt-1 text-xs text-success">Billed annually</p>
                      </div>
                    ) : (
                      <p className="text-xl font-semibold text-foreground">
                        {formatIDR(effectiveMonthly)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                    )}
                  </td>
                );
              })}
            </tr>

            {comparisonRows.map((row) => (
              <tr key={row.label} className="border-b border-border/70 last:border-b-0">
                <th scope="row" className="px-6 py-3 text-left text-sm font-medium text-foreground">{row.label}</th>
                {bundles.map((bundle) => (
                  <td key={`${row.label}-${bundle.id}`} className={cn("px-6 py-3", selectedBundle === bundle.id && "bg-primary/5")}>
                    {renderComparisonCell(row.values[bundle.id] ?? "minus")}
                  </td>
                ))}
              </tr>
            ))}

            <tr>
              <td className="px-6 py-4" />
              {bundles.map((b) => {
                const isSelected = selectedBundle === b.id;
                const isCurrent = b.id === currentPlanSlug;
                return (
                  <td key={b.id} className={cn("px-6 py-4", isSelected && b.cta !== "contact" && "bg-primary/5")}>
                    {b.cta === "contact" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(CONTACT_SALES_URL, "_blank", "noopener,noreferrer")}
                        className="h-10 w-full"
                      >
                        <Phone className="mr-1 h-4 w-4" />
                        Contact Sales
                      </Button>
                    ) : isCurrent ? (
                      <Button type="button" variant="outline" disabled className="h-10 w-full">
                        <BadgeCheck className="mr-1 h-4 w-4" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onSelectBundle(b.id)}
                        className="h-10 w-full"
                      >
                        {isSelected ? "Selected" : `Choose ${b.name}`}
                      </Button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {selectedBundle && selectedBundle !== currentPlanSlug && selectedBundle !== "enterprise" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">
                Upgrade to {bundles.find((b) => b.id === selectedBundle)?.name}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Total invoice:{" "}
                {formatIDR(
                  totalInvoice(bundles.find((b) => b.id === selectedBundle)?.perUserMonthly ?? 0, userCount, billing),
                )}{" "}
                ({billing})
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-10 shrink-0"
            disabled={isUpgrading}
            onClick={onUpgrade}
          >
            {isUpgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isUpgrading ? "Redirecting..." : "Upgrade Plan"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingTab() {
  const t = useTranslations("profile");
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  // seatCount: dedicated seat tab input — independent from plan pricing
  const [seatCountDraft, setSeatCountDraft] = useState<number | null>(null);
  // planUserCount: user count for plan comparison pricing only
  const [planUserCountDraft, setPlanUserCountDraft] = useState<number | null>(null);
  const [outletCountDraft, setOutletCountDraft] = useState<number | null>(null);
  const [selectedBundleState, setSelectedBundleState] = useState("ultimate_suite");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [activeBillingTabState, setActiveBillingTabState] = useState<"seat" | "plan" | "manage_outlet">("seat");
  const [isSeatDowngradeDialogOpen, setIsSeatDowngradeDialogOpen] = useState(false);
  const [pendingSeatDowngradeTarget, setPendingSeatDowngradeTarget] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const requestedBillingTab = useMemo<"seat" | "plan" | "manage_outlet" | null>(() => {
    const requestedTab = searchParams.get("billing_tab");
    return requestedTab === "plan" || requestedTab === "seat" || requestedTab === "manage_outlet" ? requestedTab : null;
  }, [searchParams]);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => billingService.getMySubscription(),
    staleTime: 60_000,
  });
  const { data: outletLimit } = useOutletLimit();

  const isSubscriptionSuspended = subscription?.status === "suspended";

  const {
    data: pendingXenditPayments,
    refetch: refetchPendingXenditPayments,
    isFetching: pendingInvoiceFetching,
  } = useQuery({
    queryKey: ["pending-xendit-invoices"],
    queryFn: () =>
      paymentHistoryService.getMyPaymentHistory({
        status: "pending",
        provider: "xendit",
        page: 1,
        per_page: 20,
      }),
    enabled: Boolean(isSubscriptionSuspended),
    staleTime: 30_000,
  });

  const { data: apiPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: () => authService.getSubscriptionPlans(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const billingChangeMutation = useMutation({
    mutationFn: (payload: {
      action: BillingChangeAction;
      target: string;
      action_date: string;
      idempotency_key: string;
    }) => billingService.changeSubscription(payload),
    onSuccess: async (result) => {
      const nextCycleAmount = result.billing_change?.new_amount_per_cycle ?? 0;
      const dueNow = result.user_notification?.amount_due_now ?? 0;
      const isDowngrade = (result.billing_change?.new_amount_per_cycle ?? 0) < (result.billing_change?.old_amount_per_cycle ?? 0);
      toast.success(
        `${result.user_notification?.title ?? "Billing updated"}${result.user_notification?.message ? ` ${result.user_notification.message}` : ""} Due now: ${formatIDR(dueNow)}. Next cycle: ${formatIDR(nextCycleAmount)}.${isDowngrade ? " No refund for the current cycle." : ""}`,
      );
      const invoiceURL = resolveInvoiceURL(result);
      if (invoiceURL) {
        window.open(invoiceURL, "_blank", "noopener,noreferrer");
      }
      await queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-history"] });
    },
    onError: () => {
      toast.error("Failed to update billing. Please try again.");
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: async () => {
      toast.success(t("billing.cancelSubscriptionSuccess"));
      await queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: () => {
      toast.error(t("billing.cancelSubscriptionError"));
    },
  });

  const bundles = useMemo<BundlePlan[]>(() => {
    if (!apiPlans?.length) {
      return [];
    }
    const bundlePlans = (apiPlans as SubscriptionPlanConfig[])
      .filter((p) => p.category === "bundle")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map<BundlePlan>((p) => ({
        id: p.slug,
        name: p.name,
        tagline: p.description ?? p.name,
        perUserMonthly: p.price_monthly_idr,
        badge: p.is_highlighted ? "Most Popular" : undefined,
        highlight: p.is_highlighted,
        modules: p.features ?? p.module_slugs ?? [],
      }));
    if (!bundlePlans.length) {
      return [];
    }
    return [...bundlePlans, ENTERPRISE_CTA];
  }, [apiPlans]);

  const hasBundlePlans = bundles.some((bundle) => bundle.cta !== "contact");

  const comparisonRows = useMemo(
    () =>
      buildBundleComparisonRows(bundles, {
        users: t("billing.comparisonUsers"),
        perSeat: t("billing.comparisonPerSeat"),
        unlimitedUsers: t("billing.comparisonUnlimitedUsers"),
      }),
    [bundles, t],
  );

  const modularPlans = useMemo(
    () => (apiPlans ?? []).filter((p) => p.category !== "bundle"),
    [apiPlans],
  );

  // Resolve human-readable plan name from API plans (fallback to formatted slug)
  const currentPlanName = useMemo(() => {
    if (!subscription?.plan) return null;
    const resolvedPlanSlug = subscription.plan === "full_access" ? "ultimate_suite" : subscription.plan;
    const matched = (apiPlans ?? []).find((p) => p.slug === resolvedPlanSlug);
    if (matched) return matched.name;
    return resolvedPlanSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, [subscription, apiPlans]);

  // The Ultimate Suite is the highest plan — no upgrade path beyond it (only enterprise contact)
  const isOnMaxPlan = subscription?.plan === "ultimate_suite" || subscription?.plan === "full_access";

  const currentSeatLimit = subscription?.seat_limit ?? subscription?.user_count ?? 1;
  const currentOutletLimit = Math.max(1, subscription?.outlet_limit ?? outletLimit?.max ?? 1);
  const currentOutletUsage = Math.max(0, outletLimit?.current ?? 0);
  const outletCount = outletCountDraft ?? currentOutletLimit;
  const isSeatLimitAtMax = currentSeatLimit >= MAX_SELF_SERVICE_SEAT_LIMIT;
  const activeUsers = subscription?.active_users ?? 0;
  const seatMinimum = Math.max(1, activeUsers);
  const seatCount = seatCountDraft ?? currentSeatLimit;
  const planUserCount = planUserCountDraft ?? currentSeatLimit;
  const activeBillingTab = requestedBillingTab ?? activeBillingTabState;
  const selectedBundle = useMemo(() => {
    if (bundles.some((bundle) => bundle.id === selectedBundleState)) {
      return selectedBundleState;
    }
    return bundles.find((bundle) => bundle.cta !== "contact")?.id ?? selectedBundleState;
  }, [bundles, selectedBundleState]);
  const requiredAdditionalSeats = Math.max(0, seatCount - currentSeatLimit);
  const resolvedPlanSlug = subscription?.plan === "full_access" ? "ultimate_suite" : subscription?.plan;
  const currentPlanConfig = useMemo(
    () => (apiPlans ?? []).find((p) => p.slug === resolvedPlanSlug),
    [apiPlans, resolvedPlanSlug],
  );
  const estimatedCurrentCycle = useMemo(
    () => estimateCycleTotal(currentPlanConfig, subscription?.billing_period, currentSeatLimit),
    [currentPlanConfig, subscription?.billing_period, currentSeatLimit],
  );
  const estimatedNextCycle = useMemo(
    () => estimateCycleTotal(currentPlanConfig, subscription?.billing_period, seatCount),
    [currentPlanConfig, subscription?.billing_period, seatCount],
  );
  const estimatedNextCycleDelta = estimatedNextCycle - estimatedCurrentCycle;
  const seatChangeDelta = seatCount - currentSeatLimit;
  const isSeatDowngradeRequest = seatChangeDelta < 0;
  const seatChangeAbsolute = Math.abs(seatChangeDelta);
  const outletChangeDelta = Math.max(0, outletCount - currentOutletLimit);
  const outletAddonUnitPrice = useMemo(() => {
    if (!currentPlanConfig) {
      return 500_000;
    }
    return subscription?.billing_period === "yearly"
      ? (currentPlanConfig.outlet_addon_yearly_idr ?? 6_000_000)
      : (currentPlanConfig.outlet_addon_monthly_idr ?? 500_000);
  }, [currentPlanConfig, subscription?.billing_period]);
  const outletTotalDueNow = outletChangeDelta * outletAddonUnitPrice;
  const outletCapacityPercent = Math.min(
    100,
    Math.round((currentOutletUsage / Math.max(1, currentOutletLimit)) * 100),
  );

  const submitBillingChange = useCallback(async (action: BillingChangeAction, target: string) => {
    const actionDate = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `${subscription?.id ?? "sub"}-${action}-${actionDate}-${target}`;
    await billingChangeMutation.mutateAsync({
      action,
      target,
      action_date: actionDate,
      idempotency_key: idempotencyKey,
    });
  }, [subscription?.id, billingChangeMutation]);

  const handlePlanUpgrade = useCallback(async (targetPlanSlug?: string) => {
    const planSlug = targetPlanSlug ?? selectedBundle;
    if (!planSlug || planSlug === "enterprise") return;
    if (!subscription) {
      toast.error("No active subscription found.");
      return;
    }
    setIsUpgrading(true);
    try {
      const action: BillingChangeAction = targetPlanSlug ? "add_module" : "upgrade_plan";
      await submitBillingChange(action, planSlug);
    } finally {
      setIsUpgrading(false);
    }
  }, [selectedBundle, subscription, submitBillingChange]);

  const handleSeatUpdate = useCallback(async (newLimit: number) => {
    if (!subscription) return;
    if (newLimit === currentSeatLimit) {
      return;
    }
    if (newLimit > MAX_SELF_SERVICE_SEAT_LIMIT) {
      toast.error(t("billing.maxSeatReachedDescription", { max: MAX_SELF_SERVICE_SEAT_LIMIT }));
      return;
    }
    if (newLimit < activeUsers) {
      toast.error(t("billing.downgradeSeatBlocked", { count: activeUsers }));
      return;
    }
    setIsUpgrading(true);
    try {
      const action: BillingChangeAction = newLimit < currentSeatLimit ? "downgrade" : "add_seat";
      await submitBillingChange(action, String(newLimit));
    } finally {
      setIsUpgrading(false);
    }
  }, [subscription, currentSeatLimit, activeUsers, submitBillingChange, t]);

  const handleSeatSubmit = useCallback(() => {
    if (!subscription || seatCount === currentSeatLimit) {
      return;
    }
    if (seatCount < currentSeatLimit) {
      if (seatCount < activeUsers) {
        toast.error(t("billing.downgradeSeatBlocked", { count: activeUsers }));
        return;
      }
      setPendingSeatDowngradeTarget(seatCount);
      setIsSeatDowngradeDialogOpen(true);
      return;
    }
    void handleSeatUpdate(seatCount);
  }, [subscription, seatCount, currentSeatLimit, activeUsers, handleSeatUpdate, t]);

  const handleOutletSubmit = useCallback(() => {
    if (!subscription || outletCount === currentOutletLimit) {
      return;
    }
    if (outletCount < 1) {
      return;
    }
    if (outletCount < currentOutletLimit) {
      toast.error(t("billing.manageOutletMinHint", { count: currentOutletLimit }));
      return;
    }
    void (async () => {
      setIsUpgrading(true);
      try {
        await submitBillingChange("add_outlet", String(outletCount));
      } finally {
        setIsUpgrading(false);
      }
    })();
  }, [subscription, outletCount, currentOutletLimit, submitBillingChange, t]);

  const confirmSeatDowngrade = useCallback(async () => {
    if (pendingSeatDowngradeTarget == null) {
      return;
    }
    const target = pendingSeatDowngradeTarget;
    setIsSeatDowngradeDialogOpen(false);
    setPendingSeatDowngradeTarget(null);
    await handleSeatUpdate(target);
  }, [pendingSeatDowngradeTarget, handleSeatUpdate]);

  const latestPendingXenditInvoiceUrl = useMemo(() => {
    if (!pendingXenditPayments?.length) {
      return null;
    }
    const sorted = [...pendingXenditPayments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const pendingWithInvoice = sorted.find((payment) => typeof payment.invoice_url === "string" && payment.invoice_url.length > 0);
    return pendingWithInvoice?.invoice_url ?? null;
  }, [pendingXenditPayments]);

  const openPaymentHistoryTab = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("tab", "payment-history");
    nextUrl.searchParams.delete("billing_tab");
    window.location.assign(nextUrl.toString());
  }, []);

  const openPendingXenditInvoice = useCallback(async () => {
    const openInvoice = (invoiceUrl: string | null) => {
      if (!invoiceUrl) {
        return false;
      }
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
      return true;
    };

    if (openInvoice(latestPendingXenditInvoiceUrl)) {
      return;
    }

    const refreshed = await refetchPendingXenditPayments();
    const refreshedPending = refreshed.data ?? [];
    const refreshedInvoice = [...refreshedPending]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find((payment) => typeof payment.invoice_url === "string" && payment.invoice_url.length > 0)
      ?.invoice_url ?? null;

    if (openInvoice(refreshedInvoice)) {
      return;
    }

    toast.info(t("billing.noPendingInvoice"));
    openPaymentHistoryTab();
  }, [latestPendingXenditInvoiceUrl, openPaymentHistoryTab, refetchPendingXenditPayments, t]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold">{t("billing.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("billing.description")}
        </p>
      </div>

      {/* Current subscription card */}
      {subLoading ? (
        <div className="rounded-xl border border-border/80 bg-card p-6 animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      ) : subscription ? (
        <CurrentPlanCard sub={subscription} planName={currentPlanName ?? subscription.plan} />
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("billing.noSubscription")}</p>
        </div>
      )}

      {/* Cancel subscription — only visible for active/trial non-lifetime subscriptions */}
      {subscription &&
        (subscription.status === "active" || subscription.status === "trial") &&
        subscription.billing_period !== "lifetime" && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4">
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t("billing.cancelSubscriptionTitle")}</p>
              <p className="mt-0.5 text-muted-foreground">
                {t("billing.cancelSubscriptionDescription", {
                  date: subscription.expires_at
                    ? new Date(subscription.expires_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
                    : t("billing.endOfBillingPeriod"),
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              {t("billing.cancelSubscriptionAction")}
            </Button>
          </div>
        )}

      {subscription && (
        <Tabs value={activeBillingTab} onValueChange={(tab) => setActiveBillingTabState(tab as "seat" | "plan" | "manage_outlet")} className="space-y-6">
          <TabsList className="h-10">
            <TabsTrigger value="seat" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              {t("billing.seatTab")}
            </TabsTrigger>
            <TabsTrigger value="manage_outlet" className="gap-2">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t("billing.manageOutletTab")}
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              {t("billing.planTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seat" className="space-y-6">
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold">
                    {isSubscriptionSuspended
                      ? t("billing.resumeTitle")
                      : t("billing.seatTitle")}
                  </h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {isSubscriptionSuspended
                      ? t("billing.resumeDescription")
                      : t("billing.seatDescription", {
                          plan: currentPlanName ?? subscription.plan,
                        })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{t("billing.activeUsers", { count: activeUsers })}</span>
                  <span>/</span>
                  <span>{t("billing.seatCount", { count: currentSeatLimit })}</span>
                </div>
              </div>

              <div className="mb-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("billing.capacityUsed")}</span>
                  <span>{Math.round((activeUsers / Math.max(1, currentSeatLimit)) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((activeUsers / Math.max(1, currentSeatLimit)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {isSubscriptionSuspended ? (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("billing.seatCount", { count: currentSeatLimit })} - {t("billing.resumeDescription")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="h-9"
                      disabled={pendingInvoiceFetching}
                      onClick={openPendingXenditInvoice}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {pendingInvoiceFetching ? t("billing.checkingInvoice") : t("billing.payViaXendit")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(CONTACT_SALES_URL, "_blank", "noopener,noreferrer")}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      {t("billing.contactTeam")}
                    </Button>
                    {!latestPendingXenditInvoiceUrl && (
                      <p className="text-xs text-muted-foreground">{t("billing.noPendingInvoice")}</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-5 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {isSeatDowngradeRequest ? t("billing.seatDowngradeEstimateTitle") : t("billing.seatEstimateTitle")}
                    </p>
                    {isSeatDowngradeRequest ? (
                      <>
                        <p className="mt-1 text-muted-foreground">
                          {t("billing.seatNeedToReduce", { count: seatChangeAbsolute })}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {t("billing.nextCycleDecrease", { amount: formatCurrencyIDR(Math.abs(estimatedNextCycleDelta)) })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-muted-foreground">
                          {t("billing.seatNeedToAdd", { count: requiredAdditionalSeats })}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {t("billing.nextCycleTotal", { amount: formatIDR(estimatedNextCycle) })}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {t("billing.nextCycleIncrease", { amount: formatSignedIDR(estimatedNextCycleDelta) })}
                        </p>
                      </>
                    )}
                    <p className="mt-1 text-muted-foreground">
                      {t("billing.seatUpdateAfterPayment")}
                    </p>
                  </div>

                  {isSeatDowngradeRequest && (
                    <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                      <p className="font-medium text-foreground">{t("billing.downgradePricingTitle")}</p>
                      <p className="mt-1 text-muted-foreground">{t("billing.downgradePricingDescription")}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("billing.newSeatCount")}</label>
                      <div className="flex items-center rounded-lg border border-border/70">
                        <button
                          type="button"
                          onClick={() => setSeatCountDraft((v) => Math.max(seatMinimum, (v ?? currentSeatLimit) - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={t("billing.decreaseSeat")}
                          disabled={isSeatLimitAtMax}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={seatMinimum}
                          max={MAX_SELF_SERVICE_SEAT_LIMIT}
                          value={seatCount}
                          onChange={(e) => {
                            const next = parseInt(e.target.value, 10);
                            if (!Number.isNaN(next) && next >= seatMinimum && next <= MAX_SELF_SERVICE_SEAT_LIMIT) {
                              setSeatCountDraft(next);
                            }
                          }}
                          className="h-9 w-16 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={t("billing.newSeatCount")}
                          disabled={isSeatLimitAtMax}
                        />
                        <button
                          type="button"
                          onClick={() => setSeatCountDraft((v) => Math.min(MAX_SELF_SERVICE_SEAT_LIMIT, (v ?? currentSeatLimit) + 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={t("billing.increaseSeat")}
                          disabled={isSeatLimitAtMax}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="h-9"
                      variant={isSeatDowngradeRequest ? "destructive" : "default"}
                      disabled={
                        isUpgrading ||
                        seatCount === currentSeatLimit ||
                        seatCount < activeUsers ||
                        (seatCount > currentSeatLimit && isSeatLimitAtMax)
                      }
                      onClick={handleSeatSubmit}
                    >
                      {isUpgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isUpgrading
                        ? t("billing.processing")
                        : isSeatDowngradeRequest
                          ? t("billing.downgradeSeatToCount", { count: seatCount })
                          : t("billing.addSeatToCount", { count: seatCount })}
                    </Button>
                    {seatCount < activeUsers ? (
                      <p className="text-xs text-muted-foreground">{t("billing.downgradeSeatHint", { count: activeUsers })}</p>
                    ) : isSeatLimitAtMax && seatCount > currentSeatLimit ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("billing.maxSeatReachedDescription", { max: MAX_SELF_SERVICE_SEAT_LIMIT })}</span>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => window.open(CONTACT_SALES_URL, "_blank", "noopener,noreferrer")}
                        >
                          {t("billing.contactTeam")}
                        </Button>
                      </div>
                    ) : (
                      seatCount === currentSeatLimit && (
                        <p className="text-xs text-muted-foreground">{t("billing.seatMustExceed", { count: currentSeatLimit })}</p>
                      )
                    )}
                  </div>
                  <AlertDialog
                    open={isSeatDowngradeDialogOpen}
                    onOpenChange={(open) => {
                      setIsSeatDowngradeDialogOpen(open);
                      if (!open) {
                        setPendingSeatDowngradeTarget(null);
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("billing.downgradeSeatConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("billing.downgradeSeatConfirmDescription", {
                            count: pendingSeatDowngradeTarget ?? seatCount,
                            active: activeUsers,
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpgrading}>{t("billing.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            void confirmSeatDowngrade();
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isUpgrading}
                        >
                          {isUpgrading ? t("billing.processing") : t("billing.downgradeConfirmAction")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            {modularPlans.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-semibold">{t("billing.modularTitle")}</h4>
                  <p className="text-xs text-muted-foreground">{t("billing.modularSeatInfo")}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {modularPlans.map((plan) => {
                    const isIncluded = plan.slug === subscription.plan;
                    return (
                      <div
                        key={plan.slug}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-4",
                          isIncluded ? "border-primary/30 bg-primary/5" : "border-border/70 bg-card",
                        )}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.description ?? plan.category.toUpperCase()}</p>
                        </div>
                        {isIncluded ? (
                          <Badge variant="active" className="shrink-0">
                            {t("billing.activeSeatBadge", { count: currentSeatLimit })}
                          </Badge>
                        ) : (
                          <Badge variant="inactive" className="shrink-0">
                            {t("billing.inactive")}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            {plansLoading ? (
              <div className="rounded-xl border border-border/80 bg-card p-6 animate-pulse space-y-3">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            ) : !hasBundlePlans ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-6 py-8">
                <p className="text-sm font-medium text-foreground">{t("billing.pricingUnavailableTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("billing.pricingUnavailableDescription")}</p>
              </div>
            ) : isOnMaxPlan ? (
              <div className="flex items-start gap-4 rounded-xl border border-success/25 bg-success/5 px-5 py-5">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="font-semibold text-foreground">{t("billing.bestPlanTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("billing.bestPlanDescription", { plan: currentPlanName ?? subscription.plan })}{" "}
                    <a
                      href={CONTACT_SALES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {t("billing.contactTeam")}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="plans"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <PlanUpgradeTable
                    bundles={bundles}
                    comparisonRows={comparisonRows}
                    billing={billing}
                    userCount={planUserCount}
                    selectedBundle={selectedBundle}
                    currentPlanSlug={subscription?.plan}
                    onSelectBundle={setSelectedBundleState}
                    onBillingChange={setBilling}
                    onUserCountChange={setPlanUserCountDraft}
                    isUpgrading={isUpgrading}
                    onUpgrade={handlePlanUpgrade}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="manage_outlet" className="space-y-6">
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-semibold">{t("billing.manageOutletTitle")}</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("billing.manageOutletDescription")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4" />
                  <span
                    className={cn(
                      currentOutletUsage >= currentOutletLimit ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {t("billing.outletUsage", { current: currentOutletUsage, max: currentOutletLimit })}
                  </span>
                </div>
              </div>

              <div className="mb-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("billing.capacityUsed")}</span>
                  <span
                    className={cn(
                      currentOutletUsage >= currentOutletLimit ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {`${currentOutletUsage}/${currentOutletLimit}`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${outletCapacityPercent}%` }}
                  />
                </div>
              </div>

              <div className="mb-5 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">{t("billing.manageOutletEstimateTitle")}</p>
                <p className="mt-1 text-muted-foreground">
                  {t("billing.manageOutletNeedToAdd", { count: outletChangeDelta || 1 })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {t("billing.manageOutletPricingHint", {
                    amount: formatCurrencyIDR(outletAddonUnitPrice),
                    period: t("billing.oneTimePaymentPeriod"),
                  })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {t("billing.manageOutletTotalDueNow", { amount: formatCurrencyIDR(outletTotalDueNow) })}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("billing.manageOutletNewCount")}</label>
                  <div className="flex items-center rounded-lg border border-border/70">
                    <button
                      type="button"
                      onClick={() => setOutletCountDraft((v) => Math.max(1, (v ?? currentOutletLimit) - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t("billing.decreaseOutlet")}
                      disabled={outletCount <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={outletCount}
                      onChange={(e) => {
                        const next = parseInt(e.target.value, 10);
                        if (!Number.isNaN(next) && next >= 1 && next <= 999) {
                          setOutletCountDraft(next);
                        }
                      }}
                      className="h-9 w-16 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      aria-label={t("billing.manageOutletNewCount")}
                    />
                    <button
                      type="button"
                      onClick={() => setOutletCountDraft((v) => Math.min(999, (v ?? currentOutletLimit) + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted"
                      aria-label={t("billing.increaseOutlet")}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-9"
                  variant="default"
                  disabled={isUpgrading || outletCount === currentOutletLimit || outletCount < currentOutletLimit}
                  onClick={handleOutletSubmit}
                >
                  {isUpgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpgrading
                    ? t("billing.processing")
                    : t("billing.manageOutletAddToCount", { count: outletCount })}
                </Button>

                {outletCount === currentOutletLimit && (
                  <p className="text-xs text-muted-foreground">{t("billing.manageOutletMinHint", { count: currentOutletLimit })}</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Cancel subscription confirmation */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billing.cancelSubscriptionDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {t("billing.cancelSubscriptionDialogDescription", {
                    date: subscription?.expires_at
                      ? new Date(subscription.expires_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
                      : t("billing.endOfBillingPeriod"),
                  })}
                </p>
                <p>{t("billing.cancelSubscriptionDialogWarning")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelSubscriptionMutation.isPending}>
              {t("billing.keepSubscription")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void cancelSubscriptionMutation.mutateAsync(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {cancelSubscriptionMutation.isPending ? t("billing.cancellingSubscription") : t("billing.confirmCancelSubscription")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
