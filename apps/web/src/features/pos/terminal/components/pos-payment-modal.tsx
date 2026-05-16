"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { useProcessCashPayment, useInitiateDigitalPayment, usePOSPayments, useXenditConnectionStatus } from "../hooks/use-pos";
import type { POSOrder, POSConfig, POSPayment, XenditPaymentChannel, XenditChannelCategory } from "../types";
import { Loader2, CheckCircle2, XCircle, WifiOff, ArrowLeft, QrCode, Landmark, Wallet, CreditCard, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { PosLoyaltyRedeemPanel } from "@/features/loyalty/components/pos-loyalty-redeem-panel";
import { useEnrollLoyaltyMember, useLoyaltyMemberByCustomer, useLoyaltyProgram } from "@/features/loyalty/hooks/use-loyalty";
import type { LoyaltyMember, RewardConfig } from "@/features/loyalty/types";
import { useCustomers } from "@/features/master-data/customer/hooks/use-customers";
import type { Customer } from "@/features/master-data/customer/types";

interface POSPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: POSOrder;
  config?: POSConfig;
  onSuccess: (customerName?: string, customerPhone?: string, tenderAmount?: number) => void;
  onPaymentError?: () => void;
  /** Loyalty member linked to this transaction (optional) */
  loyaltyMember?: LoyaltyMember;
  /** Available rewards for the loyalty member */
  loyaltyRewards?: RewardConfig[];
  /** Start directly on payment tab without customer/reward step. */
  paymentOnly?: boolean;
  /** Prefill customer context used by payment-only mode. */
  prefillCustomer?: {
    customerMode?: "new" | "existing";
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  };
  /** Prefill selected reward for payment-only mode. */
  prefillReward?: RewardConfig | null;
}

const NUMPAD_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "⌫"];
const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

// Indonesian payment channels available via Xendit
const PAYMENT_CHANNELS: XenditPaymentChannel[] = [
  // QR Code
  { code: "QRIS", name: "QRIS", category: "QR_CODE" },
  // E-Wallets
  { code: "DANA", name: "DANA", category: "EWALLET" },
  { code: "GOPAY", name: "GoPay", category: "EWALLET" },
  { code: "OVO", name: "OVO", category: "EWALLET" },
  { code: "SHOPEEPAY", name: "ShopeePay", category: "EWALLET" },
  { code: "LINKAJA", name: "LinkAja", category: "EWALLET" },
  { code: "ASTRAPAY", name: "AstraPay", category: "EWALLET" },
  { code: "JENIUSPAY", name: "Jenius Pay", category: "EWALLET" },
  // Bank Transfer (Virtual Account)
  { code: "BCA", name: "BCA", category: "BANK_TRANSFER" },
  { code: "BNI", name: "BNI", category: "BANK_TRANSFER" },
  { code: "BRI", name: "BRI", category: "BANK_TRANSFER" },
  { code: "MANDIRI", name: "Mandiri", category: "BANK_TRANSFER" },
  { code: "PERMATA", name: "Permata", category: "BANK_TRANSFER" },
  { code: "CIMB", name: "CIMB Niaga", category: "BANK_TRANSFER" },
  { code: "BSI", name: "BSI", category: "BANK_TRANSFER" },
  // Cards
  { code: "CREDIT_CARD", name: "Credit/Debit Card", category: "CARDS" },
];

const CATEGORY_CONFIG: Record<XenditChannelCategory, { label: string; icon: typeof QrCode }> = {
  QR_CODE: { label: "QRIS", icon: QrCode },
  EWALLET: { label: "E-Wallet", icon: Wallet },
  BANK_TRANSFER: { label: "Bank Transfer", icon: Landmark },
  CARDS: { label: "Cards", icon: CreditCard },
};

function getChannelsByCategory(category: XenditChannelCategory) {
  return PAYMENT_CHANNELS.filter((ch) => ch.category === category);
}

const CHANNEL_LOGOS: Partial<Record<string, string>> = {
  QRIS: "/logo/quick-response-code-indonesia-standard-qris-seeklogo.svg",
  DANA: "/logo/Logo%20DANA%20-%20(Koleksilogo.com).svg",
  GOPAY: "/logo/Logo%20GoPay%20-%20(Koleksilogo.com).svg",
  OVO: "/logo/Logo_ovo_purple.svg",
  SHOPEEPAY: "/logo/ShopeePay%20Logo%20-%20(Koleksilogo.com).svg",
  LINKAJA: "/logo/LinkAja.svg",
  ASTRAPAY: "/logo/astra-pay-logo_svgstack_com_73131775993940.svg",
  JENIUSPAY: "/logo/jenius-seeklogo.png",
  BCA: "/logo/bca-bank-central-asia-logo-svgrepo-com.svg",
  BNI: "/logo/Bank_Negara_Indonesia_logo_(2004).svg",
  BRI: "/logo/BANK_BRI_logo_(vertical).svg",
  MANDIRI: "/logo/Bank_Mandiri_logo_2016.svg",
  PERMATA: "/logo/Permata_Bank_(2024).svg",
  CIMB: "/logo/CIMB_Niaga_logo.svg",
  BSI: "/logo/Bank_Syariah_Indonesia.svg",
};

function PaymentChannelLogo({ channel }: { channel: XenditPaymentChannel }) {
  const logoPath = CHANNEL_LOGOS[channel.code];
  if (logoPath) {
    return (
      <span className="h-9 w-16 shrink-0 rounded-md bg-white border border-border/70 flex items-center justify-center overflow-hidden shadow-sm">
        <Image
          src={logoPath}
          alt={`${channel.name} logo`}
          width={52}
          height={24}
          className="max-h-6 max-w-12 object-contain"
          unoptimized
        />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 28 20" className="h-5 w-7" aria-hidden="true">
      <rect x="1" y="1" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="14" y="13" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">
        {channel.code.slice(0, 3)}
      </text>
    </svg>
  );
}

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function normalizeRewardPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > 100) return Math.min(value / 1000, 100);
  return Math.min(value, 100);
}

function calculateRewardDiscount(baseAmount: number, reward: RewardConfig | null): number {
  if (!reward || baseAmount <= 0) return 0;
  if (reward.type === "discount_fixed") {
    return Math.max(Math.min(reward.value, baseAmount), 0);
  }
  if (reward.type === "discount_percent") {
    const pct = normalizeRewardPercent(reward.value);
    return Math.max((baseAmount * pct) / 100, 0);
  }
  return 0;
}

export function POSPaymentModal({
  open,
  onOpenChange,
  order,
  onSuccess,
  onPaymentError,
  loyaltyMember,
  loyaltyRewards = [],
  paymentOnly = false,
  prefillCustomer,
  prefillReward = null,
}: POSPaymentModalProps) {
  // Multi-step flow: customer-select → reward (if loyalty) → payment
  const [paymentFlow, setPaymentFlow] = useState<"customer-select" | "reward" | "payment">(
    paymentOnly ? "payment" : "customer-select"
  );
  const [tab, setTab] = useState<"CASH" | "DIGITAL">("CASH");
  const [tenderInput, setTenderInput] = useState<string>("");
  const [customerName, setCustomerName] = useState(prefillCustomer?.customerName ?? "");
  const [digitalPayment, setDigitalPayment] = useState<POSPayment | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<XenditPaymentChannel | null>(null);
  const [enrollLoyalty, setEnrollLoyalty] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState(prefillCustomer?.customerPhone ?? "");
  const [loyaltyEmail, setLoyaltyEmail] = useState(prefillCustomer?.customerEmail ?? "");
  const [customerMode, setCustomerMode] = useState<"new" | "existing">(prefillCustomer?.customerMode ?? "new");
  const [customerId, setCustomerId] = useState<string | undefined>(prefillCustomer?.customerId);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedReward, setSelectedReward] = useState<RewardConfig | null>(prefillReward);

  const hasCompletedDigitalPaymentRef = useRef(false);
  const autoOpenedPaymentUrlRef = useRef<string | null>(null);

  const t = useTranslations("posTerminal.payment");
  const queryClient = useQueryClient();
  const enrollMutation = useEnrollLoyaltyMember();

  // Fetch loyalty member for selected existing customer
  const { data: loyaltyMemberData, isLoading: loyaltyLoading } = useLoyaltyMemberByCustomer(
    selectedCustomer?.id ?? "",
    customerMode === "existing" && !!selectedCustomer?.id
  );

  // Derive existingLoyaltyMember directly from query data (no separate state needed).
  // Becomes null automatically when selectedCustomer is cleared or mode switches.
  const existingLoyaltyMember =
    customerMode === "existing" && selectedCustomer
      ? (loyaltyMemberData?.data ?? null)
      : null;

  // Fetch program config to get rewards when the modal selects an existing loyalty customer (no cart-level lookup)
  const { data: existingProgramData } = useLoyaltyProgram(existingLoyaltyMember?.program_id ?? "");

  // Prefer cart-level loyalty data (live lookup); fall back to modal-level (existing customer selected in Step 1)
  const effectiveMember = loyaltyMember ?? existingLoyaltyMember;
  const effectiveRewards: RewardConfig[] = loyaltyMember
    ? loyaltyRewards
    : (existingProgramData?.data?.config.rewards ?? []).filter((r) => r.is_active);
  const hasRewardOptions = !!effectiveMember && effectiveRewards.length > 0;

  const amountBeforeReward = Math.max(order.subtotal + order.tax_amount + order.service_charge, 0);
  const selectedRewardDiscount = calculateRewardDiscount(amountBeforeReward, selectedReward);
  const totalAmount = Math.max(amountBeforeReward - selectedRewardDiscount, 0);

  const customerQueryParams = useMemo(
    () => ({
      per_page: 10,
      search: customerSearch || undefined,
    }),
    [customerSearch],
  );

  const { data: customersData } = useCustomers(customerQueryParams, {
    enabled: open && customerMode === "existing",
  });
  const customers = customersData?.data ?? [];

  function resetCustomerSelection() {
    setSelectedCustomer(null);
    setCustomerId(undefined);
    setCustomerSearch("");
    setCustomerName("");
    setLoyaltyPhone("");
    setLoyaltyEmail("");
    setEnrollLoyalty(false);
    setSelectedReward(null);
  }

  function handleCustomerModeChange(mode: "new" | "existing") {
    setCustomerMode(mode);
    resetCustomerSelection();
  }

  function handleSelectExistingCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setLoyaltyPhone(customer.contact_person ?? "");
    setLoyaltyEmail(customer.email ?? "");
    setSelectedReward(null);
  }

  const buildCustomerPayload = useCallback(() => {
    if (paymentOnly) {
      return {
        customer_id: prefillCustomer?.customerId,
        customer_name: prefillCustomer?.customerName || customerName.trim() || undefined,
        customer_phone: prefillCustomer?.customerPhone || loyaltyPhone.trim() || undefined,
        customer_email: prefillCustomer?.customerEmail || loyaltyEmail.trim() || undefined,
        loyalty_member_id: effectiveMember?.id || undefined,
      };
    }

    if (customerMode === "existing") {
      if (!customerId || !selectedCustomer) {
        return null;
      }

      return {
        customer_id: customerId,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.contact_person || undefined,
        customer_email: selectedCustomer.email || undefined,
        loyalty_member_id: effectiveMember?.id || undefined,
      };
    }

    return {
      customer_name: customerName.trim() || undefined,
      customer_phone: loyaltyPhone.trim() || undefined,
      customer_email: loyaltyEmail.trim() || undefined,
    };
  }, [
    paymentOnly,
    prefillCustomer?.customerId,
    prefillCustomer?.customerName,
    prefillCustomer?.customerPhone,
    prefillCustomer?.customerEmail,
    customerMode,
    customerId,
    selectedCustomer,
    effectiveMember,
    customerName,
    loyaltyPhone,
    loyaltyEmail,
  ]);

  const { data: paymentsData } = usePOSPayments(order.id, {
    // Only fetch payments list when polling for digital payment status confirmation.
    enabled: pollingEnabled,
  });
  const { data: xenditStatusData, isLoading: xenditStatusLoading } = useXenditConnectionStatus();
  const processCash = useProcessCashPayment();
  const initiateDigital = useInitiateDigitalPayment();

  const isXenditConnected = xenditStatusData?.data?.is_connected === true;

  const tenderAmount = parseInt(tenderInput || "0", 10);
  const change = tenderAmount - totalAmount;
  const insufficientCash = tenderAmount < totalAmount;

  // Check if payment has been completed via polling
  useEffect(() => {
    if (!paymentsData?.data) return;
    if (hasCompletedDigitalPaymentRef.current) return;

    const payments = Array.isArray(paymentsData.data) ? paymentsData.data : [];
    const latestPayment = payments[0];
    if (latestPayment?.status === "PAID") {
      hasCompletedDigitalPaymentRef.current = true;
      const customerPayload = buildCustomerPayload();
      // Fire-and-forget loyalty enrollment after digital payment
      if (enrollLoyalty && customerPayload?.customer_name) {
        enrollMutation.mutateAsync({
          outlet_id: order.outlet_id,
          pos_order_id: order.id,
          customer_id: customerPayload.customer_id,
          name: customerPayload.customer_name,
          phone: customerPayload.customer_phone,
          email: customerPayload.customer_email,
        }).then(() => {
          toast.success(t("enrollSuccess"));
        }).catch(() => {
          toast.error(t("enrollError"));
        });
      }
      queryClient.invalidateQueries({ queryKey: ["pos", "catalog", order.outlet_id] });
      onSuccess(customerPayload?.customer_name, customerPayload?.customer_phone);
    }
  }, [paymentsData, onSuccess, enrollLoyalty, order.id, order.outlet_id, enrollMutation, t, buildCustomerPayload, queryClient]);

  useEffect(() => {
    const paymentUrl = digitalPayment?.payment_url?.trim() ?? "";
    const hasGatewayUrl = paymentUrl !== "";
    const hasHostedFlow = hasGatewayUrl && !digitalPayment?.qr_code && !digitalPayment?.va_number;

    if (!open || tab !== "DIGITAL" || !hasHostedFlow) return;
    if (autoOpenedPaymentUrlRef.current === paymentUrl) return;

    autoOpenedPaymentUrlRef.current = paymentUrl;
    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  }, [digitalPayment, open, tab]);

  function handleNumpad(key: string) {
    if (key === "⌫") {
      setTenderInput((prev) => prev.slice(0, -1));
    } else if (key === "000") {
      setTenderInput((prev) => (prev === "" ? "" : prev + "000"));
    } else {
      setTenderInput((prev) => (prev.length >= 10 ? prev : prev + key));
    }
  }

  async function handleCashSubmit() {
    try {
      const customerPayload = buildCustomerPayload();
      if (!customerPayload) {
        toast.error("Please select a customer first.");
        return;
      }

      await processCash.mutateAsync({
        orderId: order.id,
        data: {
          method: "CASH",
          amount: tenderAmount,
          ...customerPayload,
          loyalty_member_id: effectiveMember?.id || customerPayload.loyalty_member_id,
          loyalty_reward_id: selectedReward?.id || undefined,
        },
      });
      // Fire-and-forget loyalty enrollment after successful cash payment
      if (enrollLoyalty && customerPayload.customer_name) {
        enrollMutation.mutateAsync({
          outlet_id: order.outlet_id,
          pos_order_id: order.id,
          customer_id: customerPayload.customer_id,
          name: customerPayload.customer_name,
          phone: customerPayload.customer_phone,
          email: customerPayload.customer_email,
        }).then(() => {
          toast.success(t("enrollSuccess"));
        }).catch(() => {
          toast.error(t("enrollError"));
        });
      }
      onSuccess(customerPayload.customer_name, customerPayload.customer_phone, tenderAmount);
    } catch {
      toast.error("Payment failed. Please try again.");
      onPaymentError?.();
    }
  }

  async function handleDigitalSubmit(channel: XenditPaymentChannel) {
    try {
      const customerPayload = buildCustomerPayload();
      if (!customerPayload) {
        toast.error("Please select a customer first.");
        return;
      }

      hasCompletedDigitalPaymentRef.current = false;
      setPollingEnabled(false);
      const result = await initiateDigital.mutateAsync({
        orderId: order.id,
        data: {
          method: "DIGITAL",
          amount: totalAmount,
          ...customerPayload,
          loyalty_member_id: effectiveMember?.id || customerPayload.loyalty_member_id,
          loyalty_reward_id: selectedReward?.id || undefined,
          channel_code: channel.code,
        },
      });
      const payload = result as { data?: POSPayment };
      if (payload?.data) {
        setDigitalPayment(payload.data);
        if (payload.data.status === "PENDING") {
          setPollingEnabled(true);
        }
      }
    } catch {
      setPollingEnabled(false);
      toast.error(t("digitalError"));
      onPaymentError?.();
    }
  }

  function handleBackToChannels() {
    setSelectedChannel(null);
    setDigitalPayment(null);
    setPollingEnabled(false);
    hasCompletedDigitalPaymentRef.current = false;
    autoOpenedPaymentUrlRef.current = null;
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset semua state saat dialog ditutup
      setPaymentFlow(paymentOnly ? "payment" : "customer-select");
      setSelectedChannel(null);
      setDigitalPayment(null);
      setPollingEnabled(false);
      hasCompletedDigitalPaymentRef.current = false;
      autoOpenedPaymentUrlRef.current = null;
      setEnrollLoyalty(false);
      setLoyaltyPhone(prefillCustomer?.customerPhone ?? "");
      setLoyaltyEmail(prefillCustomer?.customerEmail ?? "");
      setCustomerMode(prefillCustomer?.customerMode ?? "new");
      setCustomerId(prefillCustomer?.customerId);
      setCustomerName(prefillCustomer?.customerName ?? "");
      resetCustomerSelection();
      setTenderInput("");
      setSelectedReward(prefillReward);
    } else {
      // Saat modal dibuka, selalu mulai sesuai mode flow.
      setPaymentFlow(paymentOnly ? "payment" : "customer-select");
      setCustomerMode(prefillCustomer?.customerMode ?? "new");
      setCustomerId(prefillCustomer?.customerId);
      setCustomerName(prefillCustomer?.customerName ?? order.customer_name ?? "");
      setLoyaltyPhone(prefillCustomer?.customerPhone ?? "");
      setLoyaltyEmail(prefillCustomer?.customerEmail ?? "");
      setSelectedReward(prefillReward);
    }
    onOpenChange(nextOpen);
  }

  function handleCustomerSelectionComplete() {
    // Route to reward step when loyalty member has active rewards, else go directly to payment
    if (hasRewardOptions) {
      setPaymentFlow("reward");
    } else {
      setPaymentFlow("payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent size="lg" className="gap-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">{t("title")}</DialogTitle>
        </DialogHeader>

        {/* Order summary */}
        <div className="rounded-lg border border-border/70 bg-linear-to-b from-background to-muted/30 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("orderLabel")} #{order.order_number}
                </p>
                {paymentFlow === "customer-select" ? (
                  <p className="text-sm text-muted-foreground hidden sm:block">{t("readyForPayment")}</p>
                ) : (
                  <p className="text-sm font-medium text-foreground hidden sm:block truncate">
                    {customerMode === "existing" && selectedCustomer
                      ? `${selectedCustomer.code} • ${selectedCustomer.name}`
                      : customerName || t("readyForPayment")}
                  </p>
                )}
              </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("amountDue")}</p>
              {(selectedRewardDiscount > 0 || order.discount_amount > 0) && (
                <p className="text-xs text-emerald-600 font-medium">
                  -{formatCurrency(selectedRewardDiscount > 0 ? selectedRewardDiscount : order.discount_amount)} loyalty
                </p>
              )}
              {selectedRewardDiscount > 0 ? (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground line-through">{formatCurrency(amountBeforeReward)}</p>
                  <p className="text-2xl font-semibold tracking-tight text-emerald-600 sm:text-3xl">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {formatCurrency(totalAmount)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 1: Customer Selection */}
        {paymentFlow === "customer-select" ? (
          <CustomerSelectionStep
            customerMode={customerMode}
            customerName={customerName}
            selectedCustomer={selectedCustomer}
            customers={customers}
            customerSearch={customerSearch}
            enrollLoyalty={enrollLoyalty}
            loyaltyPhone={loyaltyPhone}
            loyaltyEmail={loyaltyEmail}
            existingLoyaltyMember={existingLoyaltyMember}
            loyaltyLoading={loyaltyLoading}
            onCustomerModeChange={handleCustomerModeChange}
            onCustomerNameChange={setCustomerName}
            onCustomerSelect={handleSelectExistingCustomer}
            onCustomerSearchChange={setCustomerSearch}
            onEnrollLoyaltyChange={(checked) => {
              setEnrollLoyalty(checked === true);
              if (!checked) {
                setLoyaltyPhone("");
                setLoyaltyEmail("");
              }
            }}
            onPhoneChange={setLoyaltyPhone}
            onEmailChange={setLoyaltyEmail}
            onResetCustomer={resetCustomerSelection}
            onNext={handleCustomerSelectionComplete}
            nextLabel={hasRewardOptions ? t("nextToReward") : t("nextToPayment")}
            t={t}
          />
        ) : paymentFlow === "reward" ? (
          <>
            {/* Step 2: Reward Claim — select a reward before proceeding to payment */}
            {effectiveMember && (
              <PosLoyaltyRedeemPanel
                member={effectiveMember}
                availableRewards={effectiveRewards}
                orderAmount={amountBeforeReward}
                selectedRewardId={selectedReward?.id}
                onSelectReward={(reward) => setSelectedReward(reward)}
              />
            )}
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={() => setPaymentFlow("customer-select")}
              >
                {t("backToCustomer")}
              </Button>
              <Button
                className="flex-1 cursor-pointer"
                onClick={() => setPaymentFlow("payment")}
              >
                {t("rewardStep.proceed")}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Step 3: Payment Form */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="CASH">{t("tab.cash")}</TabsTrigger>
                <TabsTrigger className="flex-1" value="DIGITAL">{t("tab.digital")}</TabsTrigger>
              </TabsList>

              {/* CASH TAB */}
              <TabsContent value="CASH" className="mt-3 space-y-3">
                {/* Quick amounts — each tap ADDS to current tender */}
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        setTenderInput((prev) => {
                          const current = parseInt(prev || "0", 10);
                          return String(current + amount);
                        })
                      }
                    >
                      +{formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                {/* Exact / Reset row */}
                <div className="grid grid-cols-2 gap-1.5">
                    <Button
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => setTenderInput(String(totalAmount))}
                  >
                    {t("exact")} {formatCurrency(totalAmount)}
                  </Button>
                    <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer text-xs text-muted-foreground"
                    disabled={tenderInput === ""}
                    onClick={() => setTenderInput("")}
                  >
                    {t("reset")}
                  </Button>
                </div>

                {/* Tender input display */}
                <div className="border rounded-md px-3 py-2 text-right text-xl font-mono">
                  {tenderInput === "" ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    formatCurrency(tenderAmount)
                  )}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-1.5">
                  {NUMPAD_KEYS.map((key) => (
                    <Button
                      key={key}
                      variant={key === "⌫" ? "destructive" : "outline"}
                      className="h-11 text-base font-medium cursor-pointer"
                      onClick={() => handleNumpad(key)}
                    >
                      {key}
                    </Button>
                  ))}
                </div>

                {/* Change display */}
                {tenderInput !== "" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("change")}</span>
                    <span className={insufficientCash ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                      {insufficientCash ? `${t("short")} ${formatCurrency(Math.abs(change))}` : formatCurrency(change)}
                    </span>
                  </div>
                )}

                <Separator />

                <Button
                  className="w-full cursor-pointer"
                  size="lg"
                  disabled={insufficientCash || tenderInput === "" || processCash.isPending}
                  onClick={handleCashSubmit}
                >
                  {processCash.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t("confirmCash")}
                </Button>
              </TabsContent>

              {/* DIGITAL PAYMENT TAB */}
              <TabsContent value="DIGITAL" className="mt-4 space-y-3">
                {xenditStatusLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !isXenditConnected ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <WifiOff className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t("digitalNotAvailable")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("digitalNotAvailableDesc")}</p>
                    </div>
                  </div>
                ) : digitalPayment ? (
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer gap-1.5 text-muted-foreground -ml-2"
                      onClick={handleBackToChannels}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {t("backToChannels")}
                    </Button>
                    <DigitalPaymentDetails payment={digitalPayment} />
                  </div>
                ) : (
                  <ChannelPicker
                    isLoading={initiateDigital.isPending}
                    selectedChannel={selectedChannel}
                    onSelect={(channel) => {
                      setSelectedChannel(channel);
                      handleDigitalSubmit(channel);
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>

            {!paymentOnly && (
              <>
                {/* Back to reward step if member has rewards, otherwise back to customer selection */}
                <Separator />
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => setPaymentFlow(hasRewardOptions ? "reward" : "customer-select")}
                >
                  {t("backToCustomer")}
                </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Customer Selection Component
function CustomerSelectionStep({
  customerMode,
  customerName,
  selectedCustomer,
  customers,
  enrollLoyalty,
  loyaltyPhone,
  loyaltyEmail,
  existingLoyaltyMember,
  loyaltyLoading,
  onCustomerModeChange,
  onCustomerNameChange,
  onCustomerSelect,
  onCustomerSearchChange,
  onEnrollLoyaltyChange,
  onPhoneChange,
  onEmailChange,
  onResetCustomer,
  onNext,
  nextLabel,
  t,
}: {
  customerMode: "new" | "existing";
  customerName: string;
  selectedCustomer: Customer | null;
  customers: Customer[];
  customerSearch: string;
  enrollLoyalty: boolean;
  loyaltyPhone: string;
  loyaltyEmail: string;
  existingLoyaltyMember: LoyaltyMember | null;
  loyaltyLoading: boolean;
  onCustomerModeChange: (mode: "new" | "existing") => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerSearchChange: (search: string) => void;
  onEnrollLoyaltyChange: (checked: boolean) => void;
  onPhoneChange: (phone: string) => void;
  onEmailChange: (email: string) => void;
  onResetCustomer: () => void;
  onNext: () => void;
  nextLabel: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const customerMasterSummary = selectedCustomer
    ? `${selectedCustomer.code} • ${selectedCustomer.name}`
    : "";

  const isNextDisabled = customerMode === "new" ? !customerName.trim() : !selectedCustomer;

  return (
    <div className="space-y-4">
      {/* Customer source section */}
      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Customer</p>
          <p className="text-sm text-muted-foreground">{t("customerName")}</p>
        </div>

        <Tabs
          value={customerMode}
          onValueChange={(v) => onCustomerModeChange(v === "existing" ? "existing" : "new")}
        >
          <TabsList className="grid w-full grid-cols-2 rounded-lg">
            <TabsTrigger value="new" className="rounded-md">{t("customerModeNew")}</TabsTrigger>
            <TabsTrigger value="existing" className="rounded-md">{t("customerModeExisting")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {customerMode === "existing" ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("customerMasterLabel")}</Label>
              <Select
                value={selectedCustomer?.id ?? ""}
                onValueChange={(value) => {
                  const selected = customers.find((customer) => customer.id === value);
                  if (selected) {
                    onCustomerSelect(selected);
                  }
                }}
                onSearchChange={onCustomerSearchChange}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t("customerMasterPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="rounded-lg" align="start">
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.code} • {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-foreground">{customerMasterSummary}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs cursor-pointer"
                    onClick={onResetCustomer}
                  >
                    {t("customerMasterClear")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="customerName" className="text-xs text-muted-foreground">
              {t("customerName")}
            </Label>
            <Input
              id="customerName"
              placeholder={t("exampleCustomer")}
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}

        {/* Loyalty Section */}
        {customerMode === "existing" && selectedCustomer ? (
          loyaltyLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : existingLoyaltyMember ? (
            // Already has loyalty
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{t("loyaltyMember")}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("loyaltyProgram")}:</span>
                  <span className="font-medium">{existingLoyaltyMember.program_name || "Loyalty Program"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("loyaltyCode")}:</span>
                  <span className="font-medium">{existingLoyaltyMember.member_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("loyaltyTier")}:</span>
                  <Badge variant="outline" style={{ borderColor: existingLoyaltyMember.tier_badge_color }}>
                    {existingLoyaltyMember.current_tier}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("loyaltyPoints")}:</span>
                  <span className="font-semibold text-primary">{existingLoyaltyMember.point_balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            // No loyalty, show enroll option
            <div className="flex items-center gap-1.5 shrink-0 pt-1">
              <Checkbox
                id="enrollLoyalty"
                checked={enrollLoyalty}
                onCheckedChange={onEnrollLoyaltyChange}
              />
              <Label htmlFor="enrollLoyalty" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                {t("enrollLoyalty")}
              </Label>
            </div>
          )
        ) : customerMode === "new" ? (
          // New customer, show enroll option
          <div className="flex items-center gap-1.5 shrink-0 pt-1">
            <Checkbox
              id="enrollLoyalty"
              checked={enrollLoyalty}
              onCheckedChange={onEnrollLoyaltyChange}
            />
            <Label htmlFor="enrollLoyalty" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
              {t("enrollLoyalty")}
            </Label>
          </div>
        ) : null}

        {/* Phone & Email fields — only shown when enrolling new loyalty */}
        {((customerMode === "new" && enrollLoyalty) || (customerMode === "existing" && enrollLoyalty && !existingLoyaltyMember)) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("enrollPhone")}</Label>
              <Input
                type="tel"
                placeholder="081234567890"
                value={loyaltyPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                readOnly={customerMode === "existing"}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("enrollEmail")}</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={loyaltyEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                readOnly={customerMode === "existing"}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <Button
        className="w-full cursor-pointer"
        size="lg"
        disabled={isNextDisabled}
        onClick={onNext}
      >
        {nextLabel} →
      </Button>
    </div>
  );
}

function ChannelPicker({
  isLoading,
  selectedChannel,
  onSelect,
}: {
  isLoading: boolean;
  selectedChannel: XenditPaymentChannel | null;
  onSelect: (channel: XenditPaymentChannel) => void;
}) {
  const t = useTranslations("posTerminal.payment");
  const [searchTerm, setSearchTerm] = useState("");
  const categories: XenditChannelCategory[] = ["QR_CODE", "EWALLET", "BANK_TRANSFER", "CARDS"];
  const normalizedQuery = searchTerm.trim().toLowerCase();

  return (
    <ScrollArea className="h-[360px] sm:h-[420px] pr-1">
      <div className="space-y-4">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("searchChannelPlaceholder")}
          className="h-12 text-sm bg-background/80 border-border/80"
        />
        <p className="text-xs text-muted-foreground">{t("selectChannel")}</p>
        {categories.map((category) => {
          const channels = getChannelsByCategory(category).filter((channel) => {
            if (!normalizedQuery) return true;
            return (
              channel.name.toLowerCase().includes(normalizedQuery) ||
              channel.code.toLowerCase().includes(normalizedQuery)
            );
          });
          if (channels.length === 0) return null;
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </div>
              <div className={cn(
                "grid grid-cols-1 gap-2"
              )}>
                {channels.map((channel) => {
                  const isSelected = selectedChannel?.code === channel.code;
                  const isProcessing = isSelected && isLoading;

                  return (
                    <Button
                      key={channel.code}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "justify-start gap-3 cursor-pointer h-16 text-base font-semibold px-4 border transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/80 text-foreground border-border/80 hover:bg-accent/70",
                        isProcessing && "opacity-70"
                      )}
                      disabled={isLoading}
                      onClick={() => onSelect(channel)}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <PaymentChannelLogo channel={channel} />
                      )}
                      {channel.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {categories.every((category) => {
          const channels = getChannelsByCategory(category).filter((channel) => {
            if (!normalizedQuery) return true;
            return (
              channel.name.toLowerCase().includes(normalizedQuery) ||
              channel.code.toLowerCase().includes(normalizedQuery)
            );
          });
          return channels.length === 0;
        }) ? (
          <p className="text-sm text-muted-foreground text-center py-3">{t("noChannelFound")}</p>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function DigitalPaymentDetails({ payment }: { payment: POSPayment }) {
  const t = useTranslations("posTerminal.payment");
  const isPaid = payment.status === "PAID";
  const isFailed = payment.status === "FAILED" || payment.status === "EXPIRED";
  const [nowMs, setNowMs] = useState(() => Date.now());

  const createdAtDate = useMemo(() => {
    if (!payment.created_at) return null;
    const parsedDate = new Date(payment.created_at);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }, [payment.created_at]);

  const expiresAtDate = useMemo(() => {
    if (!payment.expires_at) return null;
    const parsedDate = new Date(payment.expires_at);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }, [payment.expires_at]);

  const remainingMs = useMemo(() => {
    if (!expiresAtDate) return null;
    return Math.max(0, expiresAtDate.getTime() - nowMs);
  }, [expiresAtDate, nowMs]);

  const countdownLabel = useMemo(() => {
    if (remainingMs === null) return null;
    return formatCountdown(remainingMs / 1000);
  }, [remainingMs]);

  const expiresAtLabel = useMemo(() => {
    if (!expiresAtDate) return null;
    return expiresAtDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [expiresAtDate]);

  const progressPercent = useMemo(() => {
    if (!expiresAtDate) return 100;

    const fallbackTotalMs = 24 * 60 * 60 * 1000;
    const totalMs = createdAtDate ? Math.max(1, expiresAtDate.getTime() - createdAtDate.getTime()) : fallbackTotalMs;
    const leftMs = remainingMs ?? totalMs;
    const normalized = Math.max(0, Math.min(1, leftMs / totalMs));
    return normalized * 100;
  }, [createdAtDate, expiresAtDate, remainingMs]);

  const statusCircleRadius = 5;
  const statusCircleCircumference = 2 * Math.PI * statusCircleRadius;
  const statusCircleOffset = statusCircleCircumference * (1 - progressPercent / 100);

  useEffect(() => {
    if (!expiresAtDate) return;
    if (isPaid || isFailed) return;
    if ((remainingMs ?? 0) <= 0) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [expiresAtDate, isPaid, isFailed, remainingMs]);

  const handleCopyVa = useCallback(() => {
    if (payment.va_number) {
      navigator.clipboard.writeText(payment.va_number);
      toast.success(t("vaCopied"));
    }
  }, [payment.va_number, t]);

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("paymentStatus")}</span>
        {isPaid ? (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" /> {t("status.paid")}
          </Badge>
        ) : isFailed ? (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> {payment.status === "EXPIRED" ? t("status.expired") : t("status.failed")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <svg className="h-3 w-3" viewBox="0 0 16 16" aria-hidden="true">
              <circle
                cx="8"
                cy="8"
                r={statusCircleRadius}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="2"
              />
              <circle
                cx="8"
                cy="8"
                r={statusCircleRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={statusCircleCircumference}
                strokeDashoffset={statusCircleOffset}
                transform="rotate(-90 8 8)"
              />
            </svg>
            {t("status.pending")}
            {countdownLabel ? (
              <span className="font-mono tabular-nums">{countdownLabel}</span>
            ) : null}
          </Badge>
        )}
      </div>

      {/* Channel info */}
      {payment.channel_code && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("channel")}:</span>
          <span className="font-medium">{payment.channel_code}</span>
        </div>
      )}

      {/* QR Code display for QRIS */}
      {payment.qr_code && (
        <div className="flex flex-col items-center gap-2 py-2">
          <Label className="text-xs text-muted-foreground">{t("scanQr")}</Label>
          <div className="bg-white p-3 rounded-lg border">
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.qr_code)}`}
              alt="QRIS QR Code"
              width={192}
              height={192}
              className="w-48 h-48"
              unoptimized
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t("scanQrHint")}
          </p>
        </div>
      )}

      {/* Virtual Account number */}
      {payment.va_number && (
        <div className="border rounded-lg p-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("vatNumber")}</Label>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-bold tracking-wider select-all">
              {payment.va_number}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer shrink-0"
              onClick={handleCopyVa}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Amount display */}
      <div className="border rounded-lg p-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{t("amountToPay")}</span>
        <span className="font-mono font-bold text-lg">{formatCurrency(payment.amount)}</span>
      </div>

      {expiresAtLabel ? (
        <p className="text-xs text-muted-foreground text-center">
          {t("expires")} {expiresAtLabel}
        </p>
      ) : null}

      {/* Payment URL fallback */}
      {payment.payment_url ? (
        <Button
          variant="outline"
          className="w-full cursor-pointer gap-2"
          onClick={() => window.open(payment.payment_url!, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          {t("openPage")}
        </Button>
      ) : null}

    </div>
  );
}
