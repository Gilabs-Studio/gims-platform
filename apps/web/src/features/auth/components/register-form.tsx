"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Minus,
  Plus,
  Zap,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/routing";
import { authService } from "../services/auth-service";
import { useAuthStore } from "../stores/use-auth-store";
import { cn } from "@/lib/utils";

// ─── Pricing data ─────────────────────────────────────────────────────────────

type BillingPeriod = "monthly" | "yearly";
type PlanTab = "bundle" | "modular";

interface BundlePlan {
  id: string;
  name: string;
  tagline: string;
  perUserMonthly: number;
  badge?: string;
  modules: string[];
  highlight?: boolean;
  cta?: "select" | "contact";
  comingSoon?: boolean;
}

interface ModularPlan {
  id: string;
  name: string;
  category: string;
  perUserMonthly: number;
  badge?: string;
  features: string[];
  comingSoon?: boolean;
}

// Bundle plans — per user/month. Bundles are always cheaper per user than
// combining the equivalent modular plans (decoy effect).
const BUNDLES: BundlePlan[] = [
  {
    id: "growth_suite",
    name: "Growth Suite",
    tagline: "POS · ERP · CRM",
    perUserMonthly: 149_000,
    comingSoon: true,
    modules: ["Point of Sale", "ERP (Purchase, Sales, Finance)", "CRM"],
  },
  {
    id: "ultimate_suite",
    name: "Ultimate Suite",
    tagline: "All modules included",
    perUserMonthly: 175_000,
    badge: "Most Popular",
    highlight: true,
    modules: [
      "Point of Sale",
      "ERP (Full suite)",
      "CRM",
      "HR & Payroll",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom for your business",
    perUserMonthly: 0, // Contact Sales
    cta: "contact",
    modules: [
      "Everything in Ultimate",
      "Unlimited users",
      "Dedicated SLA",
      "Custom integrations",
      "On-premise option",
    ],
  },
];

const MODULAR_PLANS: ModularPlan[] = [
  { id: "pos_growth", name: "POS Modular", category: "POS", perUserMonthly: 199_000, comingSoon: true, features: ["Multi-outlet cashier", "Loyalty programs", "Advanced sales reports"] },
  { id: "erp_pro", name: "ERP Modular", category: "ERP", perUserMonthly: 399_000, comingSoon: true, features: ["Purchase and sales", "Finance and accounting", "Inventory operations"] },
  { id: "crm_growth", name: "CRM Modular", category: "CRM", perUserMonthly: 149_000, comingSoon: true, features: ["Pipeline automation", "Custom fields", "Customer activity timeline"] },
  { id: "hr_growth", name: "HR Modular", category: "HR", perUserMonthly: 79_000, comingSoon: true, features: ["Payroll processing", "Attendance tracking", "Performance reviews"] },
];

const CONTACT_SALES_WHATSAPP_URL = "https://wa.me/6289607700028?text=Hi%20GiLabs%2C%20I%20want%20to%20consult%20about%20the%20Enterprise%20plan.";

type ComparisonCellValue = string | "check" | "minus";

interface BundleComparisonRow {
  label: string;
  growthSuite: ComparisonCellValue;
  ultimateSuite: ComparisonCellValue;
  enterprise: ComparisonCellValue;
}

const BUNDLE_COMPARISON_ROWS: BundleComparisonRow[] = [
  {
    label: "Users",
    growthSuite: "Per seat",
    ultimateSuite: "Per seat",
    enterprise: "Unlimited users",
  },
  {
    label: "Storage",
    growthSuite: "100 GB",
    ultimateSuite: "500 GB",
    enterprise: "Unlimited storage",
  },
  {
    label: "Support",
    growthSuite: "Business hours",
    ultimateSuite: "Priority support",
    enterprise: "24/7 dedicated support",
  },
  {
    label: "Integrations",
    growthSuite: "Standard integrations",
    ultimateSuite: "Advanced integrations",
    enterprise: "Custom integrations",
  },
  {
    label: "Advanced analytics",
    growthSuite: "check",
    ultimateSuite: "check",
    enterprise: "check",
  },
  {
    label: "Public API access",
    growthSuite: "minus",
    ultimateSuite: "check",
    enterprise: "check",
  },
  {
    label: "Dedicated SLA",
    growthSuite: "minus",
    ultimateSuite: "minus",
    enterprise: "check",
  },
];

function formatIDR(amount: number): string {
  if (amount === 0) return "Custom";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function effectiveMonthlyPrice(perUser: number, users: number, billing: BillingPeriod): number {
  const base = perUser * users;
  return billing === "yearly" ? Math.round(base * 0.9) : base;
}

function totalInvoice(perUser: number, users: number, billing: BillingPeriod): number {
  const monthly = effectiveMonthlyPrice(perUser, users, billing);
  return billing === "yearly" ? monthly * 12 : monthly;
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface AccountValues {
  name: string;
  email: string;
  password: string;
  company: string;
}

type AccountErrors = Partial<AccountValues> & { general?: string };

interface CouponState {
  isChecking: boolean;
  isValid: boolean | null;
  message: string | null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "block h-1.5 rounded-lg transition-all duration-300",
            i < current ? "w-4 bg-foreground" : i === current ? "w-4 bg-foreground" : "w-1.5 bg-border",
          )}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const { setUser, setSessionVerified } = useAuthStore();

  // ── Step 1: account ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState<AccountValues>({
    name: "",
    email: "",
    password: "",
    company: "",
  });
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // ── Step 2: plan ─────────────────────────────────────────────────────────────
  const [planTab, setPlanTab] = useState<PlanTab>("bundle");
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [userCount, setUserCount] = useState(1);
  const [selectedBundle, setSelectedBundle] = useState<string>("ultimate_suite");
  const [selectedModular, setSelectedModular] = useState<string>("pos_growth");
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<CouponState>({
    isChecking: false,
    isValid: null,
    message: null,
  });

  // ── Submission ────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Step 1 validation ─────────────────────────────────────────────────────────
  const validateAccount = (): boolean => {
    const errs: AccountErrors = {};
    if (!account.name.trim()) errs.name = t("errors.nameRequired");
    if (!account.email.trim()) {
      errs.email = t("errors.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
      errs.email = t("errors.emailInvalid");
    }
    if (!account.password) {
      errs.password = t("errors.passwordRequired");
    } else if (account.password.length < 8) {
      errs.password = t("errors.passwordTooShort");
    }
    setAccountErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (validateAccount()) setStep(2);
  };

  // ── Coupon validation ─────────────────────────────────────────────────────────
  const handleCheckCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponState({ isChecking: true, isValid: null, message: null });
    try {
      const result = await authService.validateCoupon(code, account.email.trim() || undefined);
      const data = result.data;
      if (data?.valid) {
        setCouponState({
          isChecking: false,
          isValid: true,
          message: data.description
            ? `${data.description} — ${data.duration_days ?? "?"} ${t("daysAccess")}`
            : t("couponValid"),
        });
      } else {
        const reasonMap: Record<string, string> = {
          not_found: t("couponReasons.not_found"),
          inactive: t("couponReasons.inactive"),
          expired: t("couponReasons.expired"),
          exhausted: t("couponReasons.exhausted"),
          already_used_by_email: t("couponReasons.already_used_by_email"),
        };
        setCouponState({
          isChecking: false,
          isValid: false,
          message: reasonMap[data?.reason ?? ""] ?? t("couponInvalidOrExpired"),
        });
      }
    } catch {
      setCouponState({ isChecking: false, isValid: false, message: t("couponValidateFailed") });
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planTab === "bundle" && selectedBundle === "enterprise") return; // Contact Sales only
    if (planTab === "bundle" && selectedBundle === "growth_suite") return;
    if (planTab === "modular") return;

    setIsLoading(true);
    setSubmitError(null);

    try {
      const csrf = await authService.prefetchCSRFToken();

      const basePayload = {
        name: account.name,
        email: account.email,
        password: account.password,
        company_name: account.company.trim() || undefined,
      };

      const payload = {
        ...basePayload,
        plan: selectedBundle,
        billing_period: billing,
        user_count: userCount,
        ...(couponState.isValid ? { coupon: couponCode.trim().toUpperCase() } : {}),
      };

      const response = await authService.register(payload, csrf);

      if (response.success && response.data) {
        const data = response.data as Record<string, unknown>;
        if (typeof data === "object" && data !== null && "user" in data) {
          setUser(data.user as Parameters<typeof setUser>[0]);
          setSessionVerified(true);
          useAuthStore.setState({ error: null });
          router.replace("/dashboard");
          return;
        }
        const inv = data as { invoice_url?: string };
        if (inv.invoice_url) {
          window.location.href = inv.invoice_url;
          return;
        }
      }
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })?.response?.data?.error?.code;
      const message = (err as { response?: { data?: { error?: { message?: string } } }; message?: string })?.response?.data?.error?.message
        ?? (err as { message?: string })?.message
        ?? "Registration failed. Please try again.";

      if (code === "EMAIL_ALREADY_TAKEN") {
        setStep(1);
        setAccountErrors({ email: "This email is already registered" });
      } else if (code === "COUPON_ALREADY_USED") {
        setCouponState({ isChecking: false, isValid: false, message: "This coupon has already been used with your email" });
      } else if (code === "COUPON_INVALID") {
        setCouponState({ isChecking: false, isValid: false, message: "Coupon is no longer valid" });
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────────
  const selectedBundlePlan = BUNDLES.find((b) => b.id === selectedBundle) ?? BUNDLES[1];
  const selectedModularPlan = MODULAR_PLANS.find((p) => p.id === selectedModular)!;
  const discountActive = planTab === "bundle" && selectedBundle !== "enterprise" && couponState.isValid === true;

  // Decoy banner: show if modular plan costs more than ultimate_suite for same users
  const ultimateCost = effectiveMonthlyPrice(175_000, userCount, billing);
  const modularCost = effectiveMonthlyPrice(selectedModularPlan.perUserMonthly, userCount, billing);
  const showDecoySuggestion = planTab === "modular" && modularCost >= ultimateCost;

  const submitLabel = (): string => {
    if (planTab === "modular") return t("comingSoon");
    if (planTab === "bundle" && selectedBundle === "enterprise") return t("contactSales");
    const total = planTab === "bundle"
      ? totalInvoice(selectedBundlePlan.perUserMonthly, userCount, billing)
      : totalInvoice(selectedModularPlan.perUserMonthly, userCount, billing);
    return t("pay", { amount: formatIDR(discountActive ? 0 : total) });
  };

  const openContactSalesWhatsApp = () => {
    if (typeof window !== "undefined") {
      window.open(CONTACT_SALES_WHATSAPP_URL, "_blank", "noopener,noreferrer");
    }
  };

  const renderComparisonCell = (value: ComparisonCellValue) => {
    if (value === "check") {
      return <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />;
    }
    if (value === "minus") {
      return <XCircle className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />;
    }
    return <span className="text-sm text-foreground">{value}</span>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className={cn("w-full transition-[max-width] duration-300", step === 2 ? "max-w-5xl" : "max-w-lg")}>

        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold tracking-tight">{t("brandName")}</span>
          <span className="ml-1 text-xs font-medium text-muted-foreground">{t("brandBy")}</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Account ─────────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <StepDots current={0} total={2} />
                  <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("title")}</h1>
                  <p className="text-sm text-muted-foreground">{t("description")}</p>
                </div>

                <div className="space-y-4">
                  {accountErrors.general && (
                    <p className="text-sm text-destructive">{accountErrors.general}</p>
                  )}

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium">{t("nameLabel")}</label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder={t("namePlaceholder")}
                      value={account.name}
                      onChange={(e) => {
                        setAccount((p) => ({ ...p, name: e.target.value }));
                        if (accountErrors.name) setAccountErrors((p) => ({ ...p, name: undefined }));
                      }}
                      aria-invalid={!!accountErrors.name}
                      className="h-11"
                    />
                    {accountErrors.name && <p className="text-xs text-destructive">{accountErrors.name}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium">{t("emailLabel")}</label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      value={account.email}
                      onChange={(e) => {
                        setAccount((p) => ({ ...p, email: e.target.value }));
                        if (accountErrors.email) setAccountErrors((p) => ({ ...p, email: undefined }));
                      }}
                      aria-invalid={!!accountErrors.email}
                      className="h-11"
                    />
                    {accountErrors.email && <p className="text-xs text-destructive">{accountErrors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium">{t("passwordLabel")}</label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("passwordPlaceholder")}
                        value={account.password}
                        onChange={(e) => {
                          setAccount((p) => ({ ...p, password: e.target.value }));
                          if (accountErrors.password) setAccountErrors((p) => ({ ...p, password: undefined }));
                        }}
                        aria-invalid={!!accountErrors.password}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {accountErrors.password && <p className="text-xs text-destructive">{accountErrors.password}</p>}
                  </div>

                  {/* Company (optional) */}
                  <div className="space-y-1.5">
                    <label htmlFor="company" className="text-sm font-medium">
                      {t("companyLabel")}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("companyOptional")}</span>
                    </label>
                    <Input
                      id="company"
                      type="text"
                      autoComplete="organization"
                      placeholder={t("companyPlaceholder")}
                      value={account.company}
                      onChange={(e) => setAccount((p) => ({ ...p, company: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleContinue}
                  className="h-11 w-full font-medium"
                >
                  {t("continue")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("alreadyHaveAccount")}{" "}
                  <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                    {t("signIn")}
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: Plan ─────────────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <StepDots current={1} total={2} />
                  <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("planTitle")}</h1>
                  <p className="text-sm text-muted-foreground">{t("planDescription")}</p>
                </div>

                {/* Plan mode tabs */}
                <div className="flex rounded-xl border border-border/70 p-1 text-sm">
                  {(["bundle", "modular"] as PlanTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        if (tab === "modular") return;
                        setPlanTab(tab);
                      }}
                      className={cn(
                        "flex-1 rounded-lg py-1.5 font-medium transition-colors",
                        tab === "modular" && "cursor-not-allowed opacity-60",
                        planTab === tab
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      disabled={tab === "modular"}
                    >
                      {tab === "bundle" ? t("tabs.bundle") : t("tabs.modular")}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">

                  {/* ── Bundle tab ───────────────────────────────────────────── */}
                  {planTab === "bundle" && (
                    <motion.div
                      key="bundle"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-border/70 p-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setBilling("monthly")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 font-medium transition-colors",
                              billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            onClick={() => setBilling("yearly")}
                            className={cn(
                              "flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors",
                              billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Yearly
                            <span className="rounded-lg bg-success/15 px-2 py-0.5 text-success">{t("save10")}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Users</span>
                          <div className="flex items-center rounded-lg border border-border/70">
                            <button
                              type="button"
                              onClick={() => setUserCount((n) => Math.max(1, n - 1))}
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
                                if (!isNaN(v) && v >= 1 && v <= 500) setUserCount(v);
                              }}
                              className="h-9 w-14 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label="Number of users"
                            />
                            <button
                              type="button"
                              onClick={() => setUserCount((n) => Math.min(500, n + 1))}
                              className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted"
                              aria-label="Increase users"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="coupon" className="text-sm font-medium">{t("discountLabel")}</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="coupon"
                              type="text"
                              autoComplete="off"
                              placeholder={t("discountPlaceholder")}
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value.toUpperCase());
                                if (couponState.isValid !== null) {
                                  setCouponState({ isChecking: false, isValid: null, message: null });
                                }
                              }}
                              className="h-11 pr-9 uppercase tracking-widest"
                              maxLength={64}
                            />
                            {couponCode.trim() && (
                              <span className="absolute inset-y-0 right-3 flex items-center">
                                {couponState.isChecking ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : couponState.isValid === true ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : couponState.isValid === false ? (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                ) : null}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={couponState.isChecking || !couponCode.trim()}
                            onClick={handleCheckCoupon}
                            className="h-11 shrink-0"
                          >
                            {couponState.isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : t("validate")}
                          </Button>
                        </div>
                        {couponState.isValid === true && (
                          <p className="text-xs text-emerald-600">{couponState.message ?? t("discountApplied")}</p>
                        )}
                        {couponState.isValid === false && (
                          <p className="text-xs text-destructive">{couponState.message ?? t("couponInvalidOrExpired")}</p>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-border/80">
                        <table className="w-full min-w-max border-collapse">
                          <thead>
                            <tr className="border-b border-border/80">
                              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t("features")}</th>
                              {BUNDLES.map((b) => {
                                const isSelected = selectedBundle === b.id;
                                return (
                                  <th
                                    key={b.id}
                                    className={cn(
                                      "px-6 py-4 text-left",
                                      b.comingSoon && "blur-[1px] opacity-45",
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
                              {BUNDLES.map((b) => {
                                const isSelected = selectedBundle === b.id;
                                if (b.cta === "contact") {
                                  return (
                                    <td
                                      key={b.id}
                                      className={cn("px-6 py-4 align-top", isSelected && "bg-primary/5")}
                                    >
                                      <p className="text-xl font-semibold text-foreground">Custom</p>
                                      <p className="mt-1 text-xs text-muted-foreground">Talk with our team for volume pricing</p>
                                    </td>
                                  );
                                }

                                const baseMonthly = b.perUserMonthly * userCount;
                                const effectiveMonthly = effectiveMonthlyPrice(b.perUserMonthly, userCount, billing);
                                const discountedMonthly = discountActive ? 0 : effectiveMonthly;

                                return (
                                  <td
                                    key={b.id}
                                    className={cn("px-6 py-4 align-top", b.comingSoon && "blur-[1px] opacity-45", isSelected && "bg-primary/5")}
                                  >
                                    {billing === "yearly" ? (
                                      <div>
                                        <p className="text-xs text-muted-foreground line-through">{formatIDR(baseMonthly)}/mo</p>
                                        <p className="text-xl font-semibold text-foreground">
                                          {discountActive ? (
                                            <>
                                              <span className="mr-2 text-sm font-normal text-muted-foreground line-through">{formatIDR(effectiveMonthly)}</span>
                                              {formatIDR(discountedMonthly)}
                                            </>
                                          ) : formatIDR(discountedMonthly)}
                                          <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                                        </p>
                                        <p className="mt-1 text-xs text-success">{t("billedAnnually")}</p>
                                      </div>
                                    ) : (
                                      <p className="text-xl font-semibold text-foreground">
                                        {discountActive ? (
                                          <>
                                            <span className="mr-2 text-sm font-normal text-muted-foreground line-through">{formatIDR(effectiveMonthly)}</span>
                                            {formatIDR(discountedMonthly)}
                                          </>
                                        ) : formatIDR(discountedMonthly)}
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
                              {BUNDLES.map((b) => {
                                const isSelected = selectedBundle === b.id;
                                return (
                                  <td key={b.id} className={cn("px-6 py-4", isSelected && b.cta !== "contact" && "bg-primary/5")}>
                                    {b.comingSoon ? (
                                      <p className="text-center text-xs text-muted-foreground">{t("comingSoon")}</p>
                                    ) : b.cta === "contact" ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={openContactSalesWhatsApp}
                                        className="h-10 w-full"
                                      >
                                        <Phone className="mr-1 h-4 w-4" />
                                        {t("contactSales")}
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => {
                                          if (b.comingSoon) return;
                                          setSelectedBundle(b.id);
                                        }}
                                        className="h-10 w-full"
                                      >
                                        {isSelected ? t("selected") : t("chooseBundle", { name: b.name.replace(" Suite", "") })}
                                      </Button>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Modular tab ──────────────────────────────────────────── */}
                  {planTab === "modular" && (
                    <motion.div
                      key="modular"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-border/70 p-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setBilling("monthly")}
                            className={cn("rounded-lg px-3 py-1.5 font-medium transition-colors", billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                          >{t("monthly")}</button>
                          <button
                            type="button"
                            onClick={() => setBilling("yearly")}
                            className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors", billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                          >
                            {t("yearly")}
                            <span className="rounded-lg bg-success/15 px-2 py-0.5 text-success">{t("save10")}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{t("usersLabel")}</span>
                          <div className="flex items-center rounded-lg border border-border/70">
                            <button type="button" onClick={() => setUserCount((n) => Math.max(1, n - 1))} className="flex h-9 w-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted" aria-label={t("decreaseUsers")}><Minus className="h-3 w-3" /></button>
                            <input type="number" min={1} max={500} value={userCount} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= 500) setUserCount(v); }} className="h-9 w-14 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" aria-label={t("usersAria")} />
                            <button type="button" onClick={() => setUserCount((n) => Math.min(500, n + 1))} className="flex h-9 w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted" aria-label={t("increaseUsers")}><Plus className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </div>

                      {showDecoySuggestion && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
                        >
                          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="text-xs">
                            <p className="font-semibold text-foreground">Bundle value is significantly better</p>
                            <p className="mt-0.5 text-muted-foreground">
                              Ultimate Suite is {formatIDR(ultimateCost)}/mo for all modules, while this modular option is {formatIDR(modularCost)}/mo.
                              <button
                                type="button"
                                onClick={() => { setPlanTab("bundle"); setSelectedBundle("ultimate_suite"); }}
                                className="ml-1 font-semibold text-primary underline underline-offset-2"
                              >
                                {t("chooseBundle", { name: "Ultimate Suite" })}
                              </button>
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {MODULAR_PLANS.map((p) => {
                          const isSelected = selectedModular === p.id;
                          const monthly = effectiveMonthlyPrice(p.perUserMonthly, userCount, billing);
                          const baseMonthly = p.perUserMonthly * userCount;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (p.comingSoon) return;
                                setSelectedModular(p.id);
                              }}
                              className={cn(
                                "relative flex min-h-64 flex-col rounded-lg border p-4 text-left transition-all",
                                p.comingSoon && "cursor-not-allowed blur-[1px] opacity-45",
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border/80 bg-card hover:border-primary/40",
                              )}
                            >
                              {isSelected && (
                                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.category}</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{p.name}</p>
                              <div className="mt-3">
                                {billing === "yearly" && (
                                  <p className="text-xs text-muted-foreground line-through">{formatIDR(baseMonthly)}/mo</p>
                                )}
                                <p className="text-lg font-semibold text-foreground">
                                  {formatIDR(monthly)}
                                  <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                                </p>
                              </div>
                              <ul className="mt-3 space-y-1">
                                {p.features.map((f) => (
                                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Check className="h-3 w-3 shrink-0 text-primary" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-auto pt-3 text-xs text-muted-foreground">
                                Total invoice: {formatIDR(totalInvoice(p.perUserMonthly, userCount, billing))}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-center text-xs text-muted-foreground">{t("comingSoon")}</p>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Error */}
                {submitError && (
                  <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {submitError}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    className="h-11 w-12 shrink-0"
                    aria-label={t("back")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isLoading ||
                      planTab === "modular" ||
                      (planTab === "bundle" && (selectedBundle === "enterprise" || selectedBundle === "growth_suite"))
                    }
                    className="h-11 flex-1 font-medium"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : discountActive ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-normal text-primary-foreground/80 line-through">
                          {t("pay", { amount: formatIDR(totalInvoice(selectedBundlePlan.perUserMonthly, userCount, billing)) })}
                        </span>
                        <span>{t("pay", { amount: formatIDR(0) })}</span>
                      </span>
                    ) : (
                      submitLabel()
                    )}
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  {t("alreadyHaveAccount")}{" "}
                  <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                    {t("signIn")}
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
