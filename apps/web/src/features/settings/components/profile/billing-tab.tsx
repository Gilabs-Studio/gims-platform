"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authService, type SubscriptionPlanConfig } from "@/features/auth/services/auth-service";
import { billingService, type TenantSubscription } from "../../services/billing-service";

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
  growthSuite: ComparisonCellValue;
  ultimateSuite: ComparisonCellValue;
  enterprise: ComparisonCellValue;
}

// ─── Static fallback data (mirrors register-form.tsx) ────────────────────────

const FALLBACK_BUNDLES: BundlePlan[] = [
  {
    id: "growth_suite",
    name: "Growth Suite",
    tagline: "POS · ERP · CRM",
    perUserMonthly: 149_000,
    modules: ["Point of Sale", "ERP (Purchase, Sales, Finance)", "CRM"],
  },
  {
    id: "ultimate_suite",
    name: "Ultimate Suite",
    tagline: "All modules included",
    perUserMonthly: 175_000,
    badge: "Most Popular",
    highlight: true,
    modules: ["Point of Sale", "ERP (Full suite)", "CRM", "HR & Payroll"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom for your business",
    perUserMonthly: 0,
    cta: "contact",
    modules: ["Everything in Ultimate", "Unlimited users", "Dedicated SLA", "Custom integrations", "On-premise option"],
  },
];

const BUNDLE_COMPARISON_ROWS: BundleComparisonRow[] = [
  { label: "Users", growthSuite: "Per seat", ultimateSuite: "Per seat", enterprise: "Unlimited users" },
  { label: "Storage", growthSuite: "100 GB", ultimateSuite: "500 GB", enterprise: "Unlimited storage" },
  { label: "Support", growthSuite: "Business hours", ultimateSuite: "Priority support", enterprise: "24/7 dedicated support" },
  { label: "Integrations", growthSuite: "Standard integrations", ultimateSuite: "Advanced integrations", enterprise: "Custom integrations" },
  { label: "Advanced analytics", growthSuite: "check", ultimateSuite: "check", enterprise: "check" },
  { label: "Public API access", growthSuite: "minus", ultimateSuite: "check", enterprise: "check" },
  { label: "Dedicated SLA", growthSuite: "minus", ultimateSuite: "minus", enterprise: "check" },
];

const CONTACT_SALES_URL = "https://wa.me/6289607700028?text=Hi%20GiLabs%2C%20I%20want%20to%20consult%20about%20the%20Enterprise%20plan.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(amount: number): string {
  if (amount === 0) return "Custom";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function effectiveMonthlyPrice(perUser: number, users: number, billing: BillingPeriod): number {
  const base = perUser * users;
  return billing === "yearly" ? Math.round(base * 0.9) : base;
}

function totalInvoice(perUser: number, users: number, billing: BillingPeriod): number {
  const monthly = effectiveMonthlyPrice(perUser, users, billing);
  return billing === "yearly" ? monthly * 12 : monthly;
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

// ─── Current plan card ────────────────────────────────────────────────────────

function CurrentPlanCard({ sub, planName }: { sub: TenantSubscription; planName: string }) {
  const nextBilling = sub.next_billing_at
    ? new Date(sub.next_billing_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const expiresAt = sub.expires_at
    ? new Date(sub.expires_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
    : null;

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
  bundles, billing, userCount, selectedBundle, currentPlanSlug,
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

            {BUNDLE_COMPARISON_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border/70 last:border-b-0">
                <th scope="row" className="px-6 py-3 text-left text-sm font-medium text-foreground">{row.label}</th>
                <td className={cn("px-6 py-3", selectedBundle === "growth_suite" && "bg-primary/5")}>{renderComparisonCell(row.growthSuite)}</td>
                <td className={cn("px-6 py-3", selectedBundle === "ultimate_suite" && "bg-primary/5")}>{renderComparisonCell(row.ultimateSuite)}</td>
                <td className="px-6 py-3">{renderComparisonCell(row.enterprise)}</td>
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
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [userCount, setUserCount] = useState(1);
  const [selectedBundle, setSelectedBundle] = useState("ultimate_suite");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => billingService.getMySubscription(),
    staleTime: 60_000,
  });

  const { data: apiPlans } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: () => authService.getSubscriptionPlans(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const bundles = useMemo<BundlePlan[]>(() => {
    if (!apiPlans?.length) return FALLBACK_BUNDLES;
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
    const enterpriseCta = FALLBACK_BUNDLES.find((b) => b.cta === "contact");
    return enterpriseCta ? [...bundlePlans, enterpriseCta] : bundlePlans;
  }, [apiPlans]);

  const modularPlans = useMemo(
    () => (apiPlans ?? []).filter((p) => p.category !== "bundle"),
    [apiPlans],
  );

  // Resolve human-readable plan name from API plans (fallback to formatted slug)
  const currentPlanName = useMemo(() => {
    if (!subscription?.plan) return null;
    const matched = (apiPlans ?? []).find((p) => p.slug === subscription.plan);
    if (matched) return matched.name;
    return subscription.plan.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, [subscription, apiPlans]);

  // The Ultimate Suite is the highest plan — no upgrade path beyond it (only enterprise contact)
  const isOnMaxPlan = subscription?.plan === "ultimate_suite" || subscription?.plan === "full_access";

  const handleUpgrade = async (targetPlanSlug?: string) => {
    const planSlug = targetPlanSlug ?? selectedBundle;
    if (!planSlug || planSlug === "enterprise") return;
    setIsUpgrading(true);
    try {
      const result = await authService.computePrice({
        plan_slug: planSlug,
        billing_period: billing,
        user_count: userCount,
      });
      void result;
      window.open(CONTACT_SALES_URL, "_blank", "noopener,noreferrer");
    } finally {
      setIsUpgrading(false);
    }
  };

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

      {subscription && modularPlans.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-base font-semibold">{t("billing.modularTitle")}</h4>
            <p className="text-sm text-muted-foreground">{t("billing.modularDescription")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {modularPlans.map((plan) => {
              const isIncluded = plan.slug === subscription.plan;
              return (
                <div key={plan.slug} className="rounded-xl border border-border/80 bg-card p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.description ?? plan.category.toUpperCase()}</p>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {formatIDR(plan.price_monthly_idr)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <Button
                    type="button"
                    variant={isIncluded ? "outline" : "default"}
                    disabled={isIncluded || isUpgrading}
                    onClick={() => handleUpgrade(plan.slug)}
                    className="mt-4 h-9 w-full"
                  >
                    {isIncluded ? t("billing.included") : t("billing.addModule")}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* If on max plan show a "best plan" notice; otherwise show upgrade table */}
      {isOnMaxPlan ? (
        <div className="flex items-start gap-4 rounded-xl border border-success/25 bg-success/5 px-5 py-5">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="font-semibold text-foreground">You&apos;re on the best plan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentPlanName} gives you access to every module. Need custom limits or a dedicated SLA?{" "}
              <a
                href={CONTACT_SALES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Contact our team.
              </a>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h4 className="text-base font-semibold">Available Plans</h4>
            <p className="text-sm text-muted-foreground">
              {t("billing.availablePlansDescription")}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <PlanUpgradeTable
                bundles={bundles}
                billing={billing}
                userCount={userCount}
                selectedBundle={selectedBundle}
                currentPlanSlug={subscription?.plan}
                onSelectBundle={setSelectedBundle}
                onBillingChange={setBilling}
                onUserCountChange={setUserCount}
                isUpgrading={isUpgrading}
                onUpgrade={handleUpgrade}
              />
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
