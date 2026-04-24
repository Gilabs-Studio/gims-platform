"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
}

interface ModularPlan {
  id: string;
  name: string;
  category: string;
  perUserMonthly: number;
  badge?: string;
  features: string[];
}

// Enterprise plan — non-purchasable, always displayed as a CTA.
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
  targetPlanSlug?: string;     // set when coupon has scope=tier_specific
  discountType?: string;       // "trial" | "percent" | "amount"
  discountValue?: number;      // % or IDR reduction
  maxUsers?: number;           // limit on user count
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
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);

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

  // ── Subscription plans (fetched from API, falls back to static data) ──────────
  const { data: apiPlans } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: () => authService.getSubscriptionPlans(),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  });

  const dynamicBundles = useMemo<BundlePlan[]>(() => {
    const bundlePlans = (apiPlans ?? [])
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
    // Always append the non-purchasable Enterprise CTA at the end
    return [...bundlePlans, ENTERPRISE_CTA];
  }, [apiPlans]);

  const dynamicModular = useMemo<ModularPlan[]>(() => {
    return (apiPlans ?? [])
      .filter((p) => p.category !== "bundle")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map<ModularPlan>((p) => ({
        id: p.slug,
        name: p.name,
        category: p.category.toUpperCase(),
        perUserMonthly: p.price_monthly_idr,
        features: p.features ?? [],
      }));
  }, [apiPlans]);

  // Modular tab is enabled once plans are loaded and at least one non-bundle plan exists.
  const hasModularPlans = dynamicModular.length > 0;

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

  const handleContinue = async () => {
    if (!validateAccount()) return;

    setIsCheckingAccount(true);
    setAccountErrors((p) => ({ ...p, general: undefined }));

    try {
      const availability = await authService.checkAvailability({
        email: account.email.trim(),
        company_name: account.company.trim() || undefined,
      });

      const errs: AccountErrors = {};
      if (!availability.email) errs.email = t("errors.emailTaken");
      if (!availability.company_name) errs.company = t("errors.companyTaken");

      if (Object.keys(errs).length > 0) {
        setAccountErrors((p) => ({ ...p, ...errs }));
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error("Availability check failed:", err);
      // Fail gracefully and allow user to continue if check fails?
      // Or show a general error.
      setAccountErrors((p) => ({ ...p, general: "Unable to verify account availability. Please try again." }));
    } finally {
      setIsCheckingAccount(false);
    }
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
        const newState: CouponState = {
          isChecking: false,
          isValid: true,
          message: data.description
            ? `${data.description} — ${data.duration_days ?? "?"} ${t("daysAccess")}`
            : t("couponValid"),
          discountType: data.discount_type,
          discountValue: data.discount_value,
          maxUsers: data.max_users,
        };
        // When coupon is locked to a specific plan, auto-switch to that plan.
        if (data.scope === "tier_specific" && data.target_plan_slug) {
          newState.targetPlanSlug = data.target_plan_slug;
          // Switch to modular tab and select the locked plan.
          setPlanTab("modular");
          setSelectedModular(data.target_plan_slug);
        }
        setCouponState(newState);
        
        // Cek if current userCount already exceeds maxUsers
        if (newState.maxUsers && newState.maxUsers > 0 && userCount > newState.maxUsers) {
          setUserCount(newState.maxUsers);
        }
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
    } catch (err) {
      console.error("Coupon check failed:", err);
      setCouponState({ isChecking: false, isValid: false, message: t("couponValidateFailed") });
    }
  };

  const applyCouponDiscount = (baseAmount: number): number => {
    if (!couponState.isValid) return baseAmount;
    if (couponState.discountType === "trial") return 0;
    
    if (couponState.discountType === "percent" && couponState.discountValue) {
      return Math.round(baseAmount * (1 - couponState.discountValue / 100));
    }
    
    if (couponState.discountType === "amount" && couponState.discountValue) {
      return Math.max(0, baseAmount - couponState.discountValue);
    }
    
    return baseAmount;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planTab === "bundle" && selectedBundle === "enterprise") return; // Contact Sales only

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
        // When a coupon is locked to a specific plan, use that plan slug regardless of tab selection.
        plan: couponState.targetPlanSlug ?? (planTab === "bundle" ? selectedBundle : selectedModular),
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
  const selectedBundlePlan = dynamicBundles.find((b) => b.id === selectedBundle) ?? dynamicBundles.find((b) => b.id !== "enterprise") ?? dynamicBundles[0];
  const selectedModularPlan = dynamicModular.find((p) => p.id === selectedModular) ?? dynamicModular[0] ?? { id: "", name: "", category: "", perUserMonthly: 0, features: [] as string[] };
  const discountActive = planTab === "bundle" && selectedBundle !== "enterprise" && couponState.isValid === true;

  // Decoy banner: show if modular plan costs more than ultimate_suite for same users
  const ultimatePlan = dynamicBundles.find((b) => b.id === "ultimate_suite");
  const ultimateCost = effectiveMonthlyPrice(ultimatePlan?.perUserMonthly ?? 175_000, userCount, billing);
  const modularCost = effectiveMonthlyPrice(selectedModularPlan.perUserMonthly, userCount, billing);
  const showDecoySuggestion = planTab === "modular" && modularCost >= ultimateCost;

  const submitLabel = (): string => {
    if (planTab === "bundle" && selectedBundle === "enterprise") return t("contactSales");
    if (!selectedBundlePlan || !selectedModularPlan) return t("pay", { amount: formatIDR(0) });
    
    const baseTotal = planTab === "bundle"
      ? totalInvoice(selectedBundlePlan.perUserMonthly, userCount, billing)
      : totalInvoice(selectedModularPlan.perUserMonthly, userCount, billing);
      
    const finalTotal = applyCouponDiscount(baseTotal);
    
    return t("pay", { amount: formatIDR(finalTotal) });
  };

  const effectiveMaxUsers = useMemo(() => {
    const apiMax = 500;
    if (couponState.isValid && couponState.maxUsers && couponState.maxUsers > 0) {
      return Math.min(apiMax, couponState.maxUsers);
    }
    return apiMax;
  }, [couponState.isValid, couponState.maxUsers]);

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
                      onChange={(e) => {
                        setAccount((p) => ({ ...p, company: e.target.value }));
                        if (accountErrors.company) setAccountErrors((p) => ({ ...p, company: undefined }));
                      }}
                      aria-invalid={!!accountErrors.company}
                      className="h-11"
                    />
                    {accountErrors.company && <p className="text-xs text-destructive">{accountErrors.company}</p>}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleContinue}
                  className="h-11 w-full font-medium"
                  disabled={isCheckingAccount}
                >
                  {isCheckingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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

                {/* ── Tier-locked coupon view: show a single plan card ─────────── */}
                {couponState.isValid && couponState.targetPlanSlug ? (() => {
                  const lockedPlan = dynamicModular.find((p) => p.id === couponState.targetPlanSlug)
                    ?? { id: couponState.targetPlanSlug, name: couponState.targetPlanSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), category: "", perUserMonthly: 0, features: [] };
                  const isTrial = couponState.discountType === "trial";
                  const originalMonthly = effectiveMonthlyPrice(lockedPlan.perUserMonthly, userCount, billing);
                  let finalMonthly = originalMonthly;
                  if (couponState.discountType === "percent" && couponState.discountValue) {
                    finalMonthly = Math.round(originalMonthly * (1 - couponState.discountValue / 100));
                  } else if (couponState.discountType === "amount" && couponState.discountValue) {
                    finalMonthly = Math.max(0, originalMonthly - couponState.discountValue);
                  } else if (isTrial) {
                    finalMonthly = 0;
                  }
                  const hasDiscount = finalMonthly < originalMonthly;
                  return (
                    <motion.div
                      key="locked-plan"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Left: plan info */}
                        <div className="flex-1 p-6 space-y-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-widest text-primary">{lockedPlan.category || "Modular Plan"}</p>
                            <h2 className="mt-1 text-xl font-bold text-foreground">{lockedPlan.name}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{couponState.message}</p>
                          </div>
                          {lockedPlan.features.length > 0 && (
                            <ul className="space-y-1.5">
                              {lockedPlan.features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm">
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[11px] text-muted-foreground italic">
                            All subscriptions come with a 30-day money-back guarantee. Cancel anytime.
                          </p>
                        </div>
                        {/* Right: pricing + controls */}
                        <div className="sm:w-56 border-t sm:border-t-0 sm:border-l border-border/60 p-6 flex flex-col gap-4">
                          {/* Billing toggle */}
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <button type="button" onClick={() => setBilling("monthly")}
                              className={cn("px-2 py-1 rounded font-medium transition-colors", billing === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                              Monthly
                            </button>
                            <button
                              type="button"
                              className={cn("relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                billing === "yearly" ? "bg-primary" : "bg-muted")}
                              role="switch"
                              aria-checked={billing === "yearly"}
                              onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                            >
                              <span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                billing === "yearly" ? "translate-x-4" : "translate-x-0")} />
                            </button>
                            <button type="button" onClick={() => setBilling("yearly")}
                              className={cn("px-2 py-1 rounded font-medium transition-colors", billing === "yearly" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                              Annual
                            </button>
                          </div>
                          {/* Price */}
                          <div className="text-center">
                            {isTrial ? (
                              <div>
                                <p className="text-3xl font-bold text-foreground">Free</p>
                                <p className="text-xs text-muted-foreground mt-1">30-day trial</p>
                              </div>
                            ) : hasDiscount ? (
                              <div>
                                <p className="text-sm text-muted-foreground line-through">{formatIDR(originalMonthly)}<span className="text-xs">/mo</span></p>
                                <p className="text-3xl font-bold text-foreground">{formatIDR(finalMonthly)}</p>
                                <p className="text-xs text-muted-foreground">/month</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-3xl font-bold text-foreground">{formatIDR(originalMonthly)}</p>
                                <p className="text-xs text-muted-foreground">/month</p>
                              </div>
                            )}
                          </div>
                          {/* User count */}
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => setUserCount((n) => Math.max(1, n - 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-12 text-center text-sm font-medium">{userCount} user{userCount > 1 ? "s" : ""}</span>
                             <button type="button" onClick={() => setUserCount((n) => Math.min(effectiveMaxUsers, n + 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          {/* CTA */}
                          <Button
                            type="submit"
                            className="w-full h-11 font-semibold"
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isTrial ? "Start Free Trial" : `Start ${lockedPlan.name}`}
                          </Button>
                          {/* Coupon code input (compact) */}
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <Input
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
                                className="h-8 text-xs uppercase tracking-widest"
                                maxLength={64}
                              />
                              <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0"
                                disabled={couponState.isChecking || !couponCode.trim()}
                                onClick={handleCheckCoupon}>
                                {couponState.isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : t("validate")}
                              </Button>
                            </div>
                            {couponState.isValid === true && (
                              <p className="text-[10px] text-emerald-600">{couponState.message}</p>
                            )}
                            {/* isValid false cannot occur here; state resets before user sees this view */}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })() : (
                <>
                {/* Plan mode tabs */}
                <div className="flex rounded-xl border border-border/70 p-1 text-sm">
                  {(["bundle", "modular"] as PlanTab[]).map((tab) => {
                    const isDisabled = tab === "modular" && !hasModularPlans;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => { if (!isDisabled) setPlanTab(tab); }}
                        className={cn(
                          "flex-1 rounded-lg py-1.5 font-medium transition-colors",
                          isDisabled && "cursor-not-allowed opacity-40",
                          planTab === tab
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        disabled={isDisabled}
                      >
                        {tab === "bundle" ? t("tabs.bundle") : t("tabs.modular")}
                      </button>
                    );
                  })}
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
                              max={effectiveMaxUsers}
                              value={userCount}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 1 && v <= effectiveMaxUsers) setUserCount(v);
                              }}
                              className="h-9 w-14 border-x bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label="Number of users"
                            />
                            <button
                              type="button"
                              onClick={() => setUserCount((n) => Math.min(effectiveMaxUsers, n + 1))}
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
                                  // Clear coupon state and any plan lock when the code is edited.
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
                              {dynamicBundles.map((b) => {
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
                              {dynamicBundles.map((b) => {
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
                                    className={cn("px-6 py-4 align-top", isSelected && "bg-primary/5")}
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
                              {dynamicBundles.map((b) => {
                                const isSelected = selectedBundle === b.id;
                                return (
                                  <td key={b.id} className={cn("px-6 py-4", isSelected && b.cta !== "contact" && "bg-primary/5")}>
                                    {b.cta === "contact" ? (
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
                                        onClick={() => setSelectedBundle(b.id)}
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
                        {dynamicModular.map((p) => {
                          const isSelected = selectedModular === p.id;
                          const monthly = effectiveMonthlyPrice(p.perUserMonthly, userCount, billing);
                          const baseMonthly = p.perUserMonthly * userCount;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedModular(p.id)}
                              className={cn(
                                "relative flex min-h-64 flex-col rounded-lg border p-4 text-left transition-all",
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
                    </motion.div>
                  )}

                </AnimatePresence>

                </> // end normal plan selection
                )} {/* end: coupon-locked vs full plan selection */}

                {/* Error */}
                {submitError && (
                  <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                    {submitError}
                  </p>
                )}

                {/* Actions — Back button always visible; submit only shown in normal mode (locked plan has its own CTA) */}
                {!(couponState.isValid && couponState.targetPlanSlug) && (
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
                      (planTab === "bundle" && selectedBundle === "enterprise")
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
                )} {/* end: normal plan actions */}

                {/* Back button shown separately in locked plan mode */}
                {couponState.isValid && couponState.targetPlanSlug && (
                  <div className="flex justify-start pt-1">
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
                  </div>
                )}

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
