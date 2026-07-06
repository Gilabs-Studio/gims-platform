"use client";

import { useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import {
  useCreatePOSSettlementPayout,
  usePOSSettlementPayoutChannels,
  usePOSSettlementOverview,
  useXenditConnectionStatus,
  useValidatePOSBankAccount,
  useRequestPOSPayoutOTP,
} from "@/features/pos/terminal/hooks/use-pos";
import type { POSSettlementPayoutChannel } from "@/features/pos/terminal/types";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function formatIDR(value?: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value ?? 0);
}

function createPayoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `gims-payout-${crypto.randomUUID()}`;
  }
  return `gims-payout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const CATEGORY_ORDER = ["BANK", "EWALLET", "OTC", "OTHER"] as const;

function normalizeCategory(category?: string) {
  const normalized = category?.toUpperCase();
  if (normalized === "BANK" || normalized === "EWALLET" || normalized === "OTC") {
    return normalized;
  }
  return "OTHER";
}

export const CHANNEL_LOGOS: Record<string, string> = {
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

export function matchChannelLogo(channelCode: string, channelName: string): string | null {
  const code = channelCode.toUpperCase();
  const name = channelName.toUpperCase();

  if (code === "BCA" || code.includes("BCA") || name.includes("BCA")) {
    return CHANNEL_LOGOS.BCA;
  }
  if (code === "MANDIRI" || code.includes("MANDIRI") || name.includes("MANDIRI")) {
    return CHANNEL_LOGOS.MANDIRI;
  }
  if (code === "BNI" || code.includes("BNI") || name.includes("BNI")) {
    return CHANNEL_LOGOS.BNI;
  }
  if (code === "BRI" || code.includes("BRI") || name.includes("BRI")) {
    return CHANNEL_LOGOS.BRI;
  }
  if (code === "BSI" || code.includes("BSI") || name.includes("BSI") || name.includes("SYARIAH INDONESIA")) {
    return CHANNEL_LOGOS.BSI;
  }
  if (code === "CIMB" || code.includes("CIMB") || name.includes("CIMB") || name.includes("NIAGA")) {
    return CHANNEL_LOGOS.CIMB;
  }
  if (code === "PERMATA" || code.includes("PERMATA") || name.includes("PERMATA")) {
    return CHANNEL_LOGOS.PERMATA;
  }
  if (code === "DANA" || code.includes("DANA") || name.includes("DANA")) {
    return CHANNEL_LOGOS.DANA;
  }
  if (code === "GOPAY" || code.includes("GOPAY") || name.includes("GOPAY")) {
    return CHANNEL_LOGOS.GOPAY;
  }
  if (code === "OVO" || code.includes("OVO") || name.includes("OVO")) {
    return CHANNEL_LOGOS.OVO;
  }
  if (code === "LINKAJA" || code.includes("LINKAJA") || name.includes("LINK AJA") || name.includes("LINKAJA")) {
    return CHANNEL_LOGOS.LINKAJA;
  }
  if (code === "SHOPEEPAY" || code.includes("SHOPEEPAY") || name.includes("SHOPEEPAY") || name.includes("SHOPEE PAY")) {
    return CHANNEL_LOGOS.SHOPEEPAY;
  }
  if (code === "ASTRAPAY" || code.includes("ASTRAPAY") || name.includes("ASTRA") || name.includes("ASTRAPAY")) {
    return CHANNEL_LOGOS.ASTRAPAY;
  }
  if (code === "JENIUS" || code.includes("JENIUS") || name.includes("JENIUS") || code.includes("BTPN")) {
    return CHANNEL_LOGOS.JENIUSPAY;
  }
  return null;
}

function groupChannels(channels: POSSettlementPayoutChannel[]) {
  return channels.reduce<Record<string, POSSettlementPayoutChannel[]>>(
    (acc, channel) => {
      const category = normalizeCategory(channel.channel_category);
      acc[category] = [...(acc[category] ?? []), channel];
      return acc;
    },
    {},
  );
}



function OwnerSettlementPanel({ isConnected }: { isConnected: boolean }) {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = usePOSSettlementOverview({
    enabled: isConnected,
  });
  const { data: channelsData, isLoading: channelsLoading } =
    usePOSSettlementPayoutChannels({
      enabled: isConnected,
    });
  const payoutMutation = useCreatePOSSettlementPayout();
  const settlement = data?.data;
  
  // Filter channels to only include supported major banks and e-wallets
  const channels = (channelsData?.data ?? []).filter((channel) => {
    return matchChannelLogo(channel.channel_code, channel.channel_name) !== null;
  });
  const groupedChannels = groupChannels(channels);
  
  const [form, setForm] = useState({
    amount: undefined as number | undefined,
    channelCode: "",
    accountNumber: "",
    accountHolderName: "",
    description: "",
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Bank Account Validation states
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [validatedAccount, setValidatedAccount] = useState<{
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
  } | null>(null);
  const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);

  // Validation & Dialog errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);


  // Modals Visibility
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // OTP digit boxes - declare early but assign logic after handleResendOtp
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  // API mutations
  const validateAccountMutation = useValidatePOSBankAccount();
  const requestOtpMutation = useRequestPOSPayoutOTP();

  const selectedChannel =
    channels.find((channel) => channel.channel_code === form.channelCode);
  const selectedCategory = normalizeCategory(selectedChannel?.channel_category);
  const requestedAmount = form.amount ?? 0;
  const availableAmount = settlement?.available_payout_amount ?? 0;
  const minimumAmount = selectedChannel?.amount_limits.minimum ?? 10000;
  const maximumAmount = Math.min(
    selectedChannel?.amount_limits.maximum ?? availableAmount,
    availableAmount,
  );

  const feeAmount = settlement?.payout_fee ?? 2500;
  const vatPercent = settlement?.payout_vat_percent ?? 0.11;
  const vatAmount = Math.round(feeAmount * vatPercent);
  const totalDeductionAmount = requestedAmount + feeAmount + vatAmount;

  const isSystemBusy =
    !isConnected ||
    !settlement?.payout_enabled ||
    payoutMutation.isPending ||
    channelsLoading;

  async function handleValidateAccount() {
    if (form.accountNumber.trim().length < 4) {
      setValidationError(t("payment.validation.errorMinLength"));
      return;
    }
    setValidationError(null);
    setValidatedAccount(null);
    setIsValidatingAccount(true);
    try {
      const result = await validateAccountMutation.mutateAsync({
        bankCode: form.channelCode,
        accountNumber: form.accountNumber.trim(),
      });
      if (result.success && result.data) {
        setValidatedAccount({
          bankCode: result.data.bank_code,
          accountNumber: result.data.account_number,
          accountHolderName: result.data.account_holder_name,
        });
      } else {
        setValidationError(t("payment.validation.errorInvalid"));
      }
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            message?: string;
            error?: {
              message?: string;
              details?: {
                reason?: string;
              };
            };
          };
        };
        message?: string;
      };
      const rawMsg =
        error?.response?.data?.error?.details?.reason ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      // Map known backend error messages to localized keys
      const errMsg =
        rawMsg.includes("not found") || rawMsg.includes("not valid") || rawMsg.includes("invalid")
          ? t("payment.validation.errorInvalid")
          : rawMsg || t("payment.validation.errorInvalid");
      setValidationError(errMsg);
    } finally {
      setIsValidatingAccount(false);
    }
  }

  function handleConfirmAccount() {
    if (!validatedAccount) return;
    setIsAccountConfirmed(true);
    setForm((curr) => ({
      ...curr,
      accountHolderName: validatedAccount.accountHolderName,
    }));
  }

  function handleResetAccountValidation() {
    setIsAccountConfirmed(false);
    setValidatedAccount(null);
    setForm((curr) => ({
      ...curr,
      accountHolderName: "",
    }));
  }

  function handleOpenReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel) return;
    
    let hasErr = false;
    if (!requestedAmount || requestedAmount <= 0) {
      setAmountError(t("payment.amountError.required"));
      hasErr = true;
    } else if (requestedAmount < minimumAmount) {
      setAmountError(t("payment.amountError.minimum", { amount: formatIDR(minimumAmount) }));
      hasErr = true;
    } else if (requestedAmount > maximumAmount) {
      setAmountError(t("payment.amountError.maximum", { amount: formatIDR(maximumAmount) }));
      hasErr = true;
    } else {
      setAmountError(null);
    }

    if (hasErr) return;
    setShowReviewDialog(true);
  }

  async function handleConfirmPayout() {
    setIsSendingOtp(true);
    try {
      await requestOtpMutation.mutateAsync(requestedAmount);
      setShowReviewDialog(false);
      setOtpDigits(Array(6).fill(""));
      setOtpError(null);
      setShowOtpDialog(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        error?.response?.data?.message || error?.message || t("payment.otp.sendError")
      );
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleSubmitPayoutWithOtp() {
    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setOtpError(t("payment.otp.errorRequired"));
      return;
    }
    setOtpError(null);
    try {
      await payoutMutation.mutateAsync({
        amount: Math.round(requestedAmount),
        channel_code: selectedChannel!.channel_code,
        account_number: form.accountNumber.trim(),
        account_holder_name: form.accountHolderName.trim(),
        description:
          form.description.trim() ||
          `${selectedChannel!.channel_name} POS settlement`,
        idempotency_key: createPayoutIdempotencyKey(),
        otp_code: otpCode,
      });
      
      // Reset state and forms on success
      setShowOtpDialog(false);
      setIsAccountConfirmed(false);
      setValidatedAccount(null);
      setForm({
        amount: undefined,
        channelCode: "",
        accountNumber: "",
        accountHolderName: "",
        description: "",
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = error?.response?.data?.message || error?.message || t("payment.otp.errorInvalid");
      setOtpError(errMsg);
    }
  }


  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (otpError) setOtpError(null);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    if (otpError) setOtpError(null);
    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  }

  async function handleResendOtp() {
    setIsSendingOtp(true);
    try {
      await requestOtpMutation.mutateAsync(requestedAmount);
      setOtpDigits(Array(6).fill(""));
      setOtpError(null);
      toast.success(t("payment.otp.resendSuccess"));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error?.response?.data?.message || error?.message || t("payment.otp.sendError"));
    } finally {
      setIsSendingOtp(false);
    }
  }

  const faqs = [
    {
      q: t("payment.faq.q1"),
      a: t("payment.faq.a1"),
    },
    {
      q: t("payment.faq.q2"),
      a: t("payment.faq.a2"),
    },
    {
      q: t("payment.faq.q3"),
      a: t("payment.faq.a3"),
    },
    {
      q: t("payment.faq.q4"),
      a: t("payment.faq.a4"),
    },
  ];

  return (
    <>
      <form className="space-y-6" onSubmit={handleOpenReview}>
        {/* Settlement Overview Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-card border rounded-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("payment.readyToPayoutLabel")}
            </p>
            <h3 className="mt-1.5 text-3xl font-extrabold text-foreground tracking-tight">
              {isLoading ? "..." : formatIDR(availableAmount)}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-normal">
              {t("payment.platformManagedDescription")}
            </p>
          </div>
          <div className="flex flex-row gap-6 text-sm sm:border-l sm:pl-6 border-border/60">
            <div>
              <p className="text-xs text-muted-foreground">{t("payment.collectedAmountLabel")}</p>
              <p className="font-semibold text-foreground mt-0.5">{isLoading ? "..." : formatIDR(settlement?.collected_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("payment.reservedPayoutLabel")}</p>
              <p className="font-semibold text-foreground mt-0.5">{isLoading ? "..." : formatIDR(settlement?.reserved_payout_amount)}</p>
            </div>
          </div>
        </div>

        {/* 2 STEPS UI WORKFLOW */}
        {!form.channelCode ? (
          /* STEP 1: GRID VIEW */
          <div className="space-y-6 p-6 bg-card border rounded-lg">
            <div>
              <h4 className="font-bold text-base tracking-tight text-foreground">
                {t("payment.allPayoutMethodsTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("payment.allPayoutMethodsSubtitle")}
              </p>
            </div>

            {channelsLoading || isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                {t("payment.settlementChecking")}
              </div>
            ) : null}

            {!channelsLoading && channels.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                {settlement?.message || t("payment.noPayoutMethods")}
              </div>
            ) : null}

            <div className="space-y-6">
              {CATEGORY_ORDER.map((category) => {
                const categoryChannels = groupedChannels[category] ?? [];
                if (categoryChannels.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t(`payment.payoutCategory.${category}`)}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {categoryChannels.map((channel) => {
                        const logoUrl = matchChannelLogo(channel.channel_code, channel.channel_name);

                        return (
                          <button
                            key={channel.channel_code}
                            type="button"
                            onClick={() => {
                              setForm({
                                channelCode: channel.channel_code,
                                accountNumber: "",
                                accountHolderName: "",
                                description: "",
                                amount: undefined,
                              });
                              setIsAccountConfirmed(false);
                              setValidatedAccount(null);
                              setValidationError(null);
                              setAmountError(null);
                            }}
                            className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:border-primary/60 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/5"
                          >
                            <span className="h-9 w-16 shrink-0 rounded-md bg-white border border-border/70 flex items-center justify-center overflow-hidden shadow-sm p-1">
                              {logoUrl ? (
                                <Image
                                  src={logoUrl}
                                  alt={`${channel.channel_name} logo`}
                                  width={52}
                                  height={24}
                                  className="max-h-6 max-w-12 object-contain"
                                  unoptimized
                                />
                              ) : (
                                <svg viewBox="0 0 28 20" className="h-5 w-7" aria-hidden="true">
                                  <rect
                                    x="1"
                                    y="1"
                                    width="26"
                                    height="18"
                                    rx="3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x="14"
                                    y="13"
                                    textAnchor="middle"
                                    fontSize="8"
                                    fontWeight="700"
                                    fill="currentColor"
                                  >
                                    {channel.channel_code.slice(0, 3)}
                                  </text>
                                </svg>
                              )}
                            </span>

                            <div className="text-left min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-foreground truncate">
                                {channel.channel_name}
                              </span>
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {t("payment.instantFree")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* STEP 2: DETAIL FORM AND FAQ */
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="cursor-pointer gap-1.5 text-muted-foreground hover:bg-transparent p-0"
              onClick={() => setForm((curr) => ({ ...curr, channelCode: "" }))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("payment.backToMethods")}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
              {/* Form Side */}
              <div className="p-6 bg-card border rounded-lg space-y-6">
                <div>
                   <h4 className="font-bold text-base tracking-tight text-foreground">
                    {t("payment.withdrawalFormTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("payment.withdrawalFormSubtitle")}
                  </p>
                </div>

                {selectedChannel ? (
                  <FieldGroup className="space-y-4">
                    {/* Selected Payment Method Display */}
                    <Field className="space-y-1.5">
                      <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">{t("payment.paymentMethodLabel")}</FieldLabel>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                        <span className="h-9 w-16 shrink-0 rounded-md bg-white border border-border/70 flex items-center justify-center overflow-hidden shadow-sm p-1">
                          {matchChannelLogo(selectedChannel.channel_code, selectedChannel.channel_name) ? (
                            <Image
                              src={matchChannelLogo(selectedChannel.channel_code, selectedChannel.channel_name)!}
                              alt={`${selectedChannel.channel_name} logo`}
                              width={52}
                              height={24}
                              className="max-h-6 max-w-12 object-contain"
                              unoptimized
                            />
                          ) : (
                            <svg viewBox="0 0 28 20" className="h-5 w-7" aria-hidden="true">
                              <rect
                                x="1"
                                y="1"
                                width="26"
                                height="18"
                                rx="3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                              <text
                                x="14"
                                y="13"
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="700"
                                fill="currentColor"
                              >
                                {selectedChannel.channel_code.slice(0, 3)}
                              </text>
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {selectedChannel.channel_name}
                        </span>
                      </div>
                    </Field>

                    {/* Dari Akun (Source Account) */}
                    <Field className="space-y-1.5">
                      <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">{t("payment.fromAccountLabel")}</FieldLabel>
                      <div className="p-3 border rounded-lg bg-muted/20 text-sm font-medium text-foreground">
                        POS Settlement ({t("payment.availablePayoutLabel")}: {formatIDR(availableAmount)})
                      </div>
                    </Field>

                    {/* Account Validation Step */}
                    {!isAccountConfirmed ? (
                      <>
                        {/* Destination Account Number */}
                        <Field className="space-y-1.5">
                          <FieldLabel htmlFor="destination-account" className="text-xs uppercase tracking-wider text-muted-foreground">
                            {t(`payment.destinationNumber.${selectedCategory}`)}
                          </FieldLabel>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              id="destination-account"
                              className="cursor-pointer flex-1"
                              value={form.accountNumber}
                              onChange={(event) => {
                                setForm((current) => ({
                                  ...current,
                                  accountNumber: event.target.value,
                                }));
                                if (validationError) setValidationError(null);
                              }}
                              placeholder={
                                selectedCategory === "EWALLET"
                                  ? "081234567890"
                                  : "000000000099"
                              }
                              disabled={isValidatingAccount}
                            />
                            <Button
                              type="button"
                              onClick={handleValidateAccount}
                              disabled={isValidatingAccount || form.accountNumber.trim().length === 0}
                              className="cursor-pointer shrink-0 gap-1.5 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                            >
                              {isValidatingAccount ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("payment.validation.validating")}
                                </>
                              ) : (
                                t("payment.validation.button")
                              )}
                            </Button>
                          </div>
                          {validationError && <FieldError>{validationError}</FieldError>}
                        </Field>

                        {/* Resolved Holder Name Output */}
                        {validatedAccount && (
                          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 space-y-3 animate-in fade-in-50 duration-200">
                            <h5 className="font-bold text-xs uppercase text-primary tracking-wider">
                              {t("payment.validation.resultTitle")}
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span className="text-muted-foreground">Bank/Channel:</span>
                              <span className="font-semibold text-foreground">{selectedChannel.channel_name}</span>
                              <span className="text-muted-foreground">{t(`payment.destinationNumber.${selectedCategory}`)}:</span>
                              <span className="font-mono font-semibold text-foreground">{validatedAccount.accountNumber}</span>
                              <span className="text-muted-foreground">{t("payment.validation.holderLabel")}:</span>
                              <span className="font-bold text-foreground uppercase">{validatedAccount.accountHolderName}</span>
                            </div>
                            <Button
                              type="button"
                              onClick={handleConfirmAccount}
                              className="w-full cursor-pointer mt-2 text-xs h-9 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md"
                            >
                              {t("payment.validation.confirmButton")}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Step 2.2: Confirmed Account View & Payout Amount Form */
                      <>
                        <Field className="space-y-1.5">
                          <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">{t("payment.destinationAccountLabel")}</FieldLabel>
                          <div className="p-4 border rounded-lg bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1 text-sm">
                              <p className="font-semibold text-foreground">
                                {selectedChannel.channel_name} - <span className="font-mono">{form.accountNumber}</span>
                              </p>
                              <p className="text-xs text-muted-foreground uppercase">
                                {t("payment.accountHolderLabel")}: <span className="font-bold text-foreground">{form.accountHolderName}</span>
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleResetAccountValidation}
                              className="cursor-pointer text-xs h-8"
                            >
                              {t("payment.validation.changeButton")}
                            </Button>
                          </div>
                        </Field>

                        {/* Payout Description */}
                        <Field className="space-y-1.5">
                          <FieldLabel htmlFor="payout-desc" className="text-xs uppercase tracking-wider text-muted-foreground">
                            {t("payment.payoutDescriptionLabel")}
                          </FieldLabel>
                          <Input
                            id="payout-desc"
                            className="cursor-pointer"
                            maxLength={100}
                            value={form.description}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder={t("payment.payoutDescriptionPlaceholder")}
                          />
                        </Field>

                        {/* Amount Input (using NumericInput) */}
                        <Field className="space-y-1.5">
                          <FieldLabel htmlFor="settlement-amount" className="text-xs uppercase tracking-wider text-muted-foreground">
                            {t("payment.payoutAmountLabel")}
                          </FieldLabel>
                          <div className="relative flex items-center">
                            <NumericInput
                              id="settlement-amount"
                              className="h-11 pr-12 cursor-pointer font-semibold"
                              value={form.amount}
                              onChange={(val) => {
                                setForm((current) => ({ ...current, amount: val }));
                                if (amountError) setAmountError(null);
                              }}
                              placeholder="0"
                            />
                            <span className="absolute right-3 text-sm font-semibold text-muted-foreground">
                              IDR
                            </span>
                          </div>
                          {amountError && <FieldError>{amountError}</FieldError>}
                          <FieldDescription className="text-xs mt-1 text-muted-foreground">
                            {t("payment.payoutLimitLabel")}: {formatIDR(minimumAmount)} - {formatIDR(maximumAmount)}
                          </FieldDescription>
                        </Field>

                        {/* Cost & Summary Breakdown (Fee & VAT) */}
                        <div className="p-4 bg-muted/30 border rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("payment.review.amountLabel")}</span>
                            <span className="font-semibold text-foreground">{formatIDR(requestedAmount)}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>{t("payment.review.feeLabel")} (Flat)</span>
                            <span>{formatIDR(feeAmount)}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>{t("payment.review.vatLabel")}</span>
                            <span>{formatIDR(vatAmount)}</span>
                          </div>
                          <hr className="border-border/40" />
                          <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-foreground">{t("payment.review.totalDeductionLabel")}</span>
                            <span className="text-primary text-base">
                              {formatIDR(totalDeductionAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {t("payment.payoutSecurityNote")}
                          </p>
                          <Button
                            type="submit"
                            disabled={isSystemBusy}
                            className="w-full gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/30"
                          >
                            <Send className="h-4 w-4" />
                            {t("payment.createPayoutButton")}
                          </Button>
                        </div>
                      </>
                    )}
                  </FieldGroup>
                ) : null}
              </div>

              {/* Terms and FAQ Sidebar */}
              <div className="space-y-6">
                {/* Syarat Box */}
                <div className="p-5 bg-card border rounded-lg space-y-4">
                   <h4 className="font-bold text-sm text-foreground">{t("payment.termsTitle")}</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">{t("payment.avgProcessingTime")}</span>
                      <span className="font-semibold text-foreground">{t("payment.instantProcessing")}</span>
                    </div>
                     <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">{t("payment.feeLabel")}</span>
                        <span className="font-semibold text-foreground">
                          {formatIDR(feeAmount)} + PPN {Math.round(vatPercent * 100)}%
                        </span>
                     </div>
                  </div>
                </div>

                {/* FAQ Box (Interactive and Real) */}
                <div className="p-5 bg-card border rounded-lg space-y-4">
                  <h4 className="font-bold text-sm text-foreground">{t("payment.faqTitle")}</h4>
                  <div className="space-y-2">
                    {faqs.map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div key={idx} className="border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between text-left font-medium text-xs text-primary hover:underline cursor-pointer py-1.5"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          >
                            <span>{faq.q}</span>
                            <ChevronRight className={cn(
                              "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200",
                              isOpen && "rotate-90 text-primary"
                            )} />
                          </button>
                          {isOpen && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed animate-in fade-in-50 duration-200">
                              {faq.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Review Payout Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent size="sm">
           <DialogHeader>
              <DialogTitle>{t("payment.review.title")}</DialogTitle>
              <DialogDescription>
               {t("payment.review.description")}
              </DialogDescription>
           </DialogHeader>

          <div className="space-y-4 my-4 text-sm">
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.bankLabel")}</span>
              <span className="font-semibold text-foreground">{selectedChannel?.channel_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.accountLabel")}</span>
              <span className="font-mono font-semibold text-foreground">{form.accountNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.holderLabel")}</span>
              <span className="font-semibold text-foreground uppercase">{form.accountHolderName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.amountLabel")}</span>
              <span className="font-semibold text-foreground">{formatIDR(requestedAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.feeLabel")}</span>
              <span className="font-semibold text-destructive">{formatIDR(feeAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{t("payment.review.vatLabel")}</span>
              <span className="font-semibold text-destructive">{formatIDR(vatAmount)}</span>
            </div>
            <div className="flex justify-between py-2 bg-muted/40 p-3 rounded-lg">
              <span className="font-semibold text-foreground">{t("payment.review.totalDeductionLabel")}</span>
              <span className="font-bold text-lg text-primary">
                {formatIDR(totalDeductionAmount)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="cursor-pointer"
            >
              {t("payment.review.cancelButton")}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayout}
              disabled={isSendingOtp}
              className="cursor-pointer gap-2"
            >
              {isSendingOtp && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("payment.review.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("payment.otp.title")}</DialogTitle>
            <DialogDescription>
              {t("payment.otp.description")}{user?.email ? ` (${user.email})` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            <Field className="space-y-3">
              <FieldLabel className="sr-only">{t("payment.otp.inputLabel")}</FieldLabel>
              {/* 6-box OTP input */}
              <div className="flex justify-center gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    id={idx === 0 ? "otp-code" : undefined}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
                    className={cn(
                      "w-11 h-13 text-center text-lg font-bold font-mono rounded-lg border-2 bg-background cursor-pointer",
                      "transition-all duration-150 outline-none",
                      "focus:border-primary focus:ring-2 focus:ring-primary/30",
                      digit ? "border-primary/60 bg-primary/5" : "border-input",
                      otpError && "border-destructive focus:ring-destructive/30"
                    )}
                  />
                ))}
              </div>
              {otpError && <FieldError className="text-center">{otpError}</FieldError>}
            </Field>

            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <span>{t("payment.otp.noCode")}</span>
              <button
                type="button"
                disabled={isSendingOtp}
                onClick={handleResendOtp}
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isSendingOtp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {t("payment.otp.resend")}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOtpDialog(false)}
              className="cursor-pointer"
            >
              {t("payment.cancelButton")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitPayoutWithOtp}
              disabled={payoutMutation.isPending || otpDigits.join("").length !== 6}
              className="cursor-pointer gap-2"
            >
              {payoutMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("payment.otp.submitButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PaymentSettings() {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);
  const { data: statusData, isLoading: statusLoading } = useXenditConnectionStatus();

  const status = statusData?.data;
  const isConnected = status?.is_connected === true;
  const canManageSettlement = user?.role?.is_owner === true;

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t("payment.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isConnected ? (
        <div className="space-y-6">
          {canManageSettlement ? (
            <OwnerSettlementPanel isConnected={isConnected} />
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {t("payment.ownerOnlyPayoutMessage")}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {t("payment.notConnectedTitle")}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {t("payment.notConnectedMessage")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
