"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import {
  useCreatePOSSettlementPayout,
  usePOSSettlementPayoutChannels,
  usePOSSettlementOverview,
  useXenditConnectionStatus,
} from "@/features/pos/terminal/hooks/use-pos";
import type { POSSettlementPayoutChannel } from "@/features/pos/terminal/types";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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

const CHANNEL_LOGOS: Record<string, string> = {
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

function matchChannelLogo(channelCode: string, channelName: string): string | null {
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

function ConnectionStatusBadge({ status }: { status: string }) {
  const t = useTranslations("profile");

  if (status === "connected") {
    return (
      <Badge variant="success" className="gap-1.5 px-2.5 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("payment.connected")}
      </Badge>
    );
  }

  if (status === "suspended") {
    return (
      <Badge variant="destructive" className="gap-1.5 px-2.5 py-1">
        <WifiOff className="h-3.5 w-3.5" />
        {t("payment.suspended")}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      {t("payment.notConnectedBadge")}
    </Badge>
  );
}

function OwnerSettlementPanel({ isConnected }: { isConnected: boolean }) {
  const t = useTranslations("profile");
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
  const payoutDisabled =
    !isConnected ||
    !settlement?.payout_enabled ||
    payoutMutation.isPending ||
    channelsLoading ||
    !selectedChannel ||
    requestedAmount <= 0 ||
    requestedAmount < minimumAmount ||
    requestedAmount > maximumAmount ||
    form.accountNumber.trim().length < 4 ||
    form.accountHolderName.trim().length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel) return;
    if (payoutDisabled) return;

    await payoutMutation.mutateAsync({
      amount: Math.round(requestedAmount),
      channel_code: selectedChannel.channel_code,
      account_number: form.accountNumber.trim(),
      account_holder_name: form.accountHolderName.trim(),
      description:
        form.description.trim() ||
        `${selectedChannel.channel_name} POS settlement`,
      idempotency_key: createPayoutIdempotencyKey(),
    });
    setForm((current) => ({
      ...current,
      amount: undefined,
      accountNumber: "",
      accountHolderName: "",
      description: "",
    }));
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
    <form className="space-y-6" onSubmit={handleSubmit}>
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
              Pilih salah satu metode pembayaran di bawah ini untuk memproses penarikan dana Anda.
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
                          onClick={() =>
                            setForm({
                              channelCode: channel.channel_code,
                              accountNumber: "",
                              accountHolderName: "",
                              description: "",
                              amount: undefined,
                            })
                          }
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
                              Instan · Biaya 0%
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
            Metode Pembayaran
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
            {/* Form Side */}
            <div className="p-6 bg-card border rounded-lg space-y-6">
              <div>
                <h4 className="font-bold text-base tracking-tight text-foreground">
                  Formulir Penarikan Dana
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lengkapi informasi rekening tujuan transfer dana Anda.
                </p>
              </div>

              {selectedChannel ? (
                <FieldGroup className="space-y-4">
                  {/* Selected Payment Method Display */}
                  <Field className="space-y-1.5">
                    <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">Metode Pembayaran</FieldLabel>
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
                    <FieldLabel className="text-xs uppercase tracking-wider text-muted-foreground">Dari Akun</FieldLabel>
                    <div className="p-3 border rounded-lg bg-muted/20 text-sm font-medium text-foreground">
                      POS Settlement (Available: {formatIDR(availableAmount)})
                    </div>
                  </Field>

                  {/* Destination Account Number */}
                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="destination-account" className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t(`payment.destinationNumber.${selectedCategory}`)}
                    </FieldLabel>
                    <Input
                      id="destination-account"
                      className="cursor-pointer"
                      value={form.accountNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          accountNumber: event.target.value,
                        }))
                      }
                      placeholder={
                        selectedCategory === "EWALLET"
                          ? "081234567890"
                          : "000000000099"
                      }
                    />
                  </Field>

                  {/* Account Holder Name */}
                  <Field className="space-y-1.5">
                    <FieldLabel htmlFor="account-holder" className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("payment.payoutAccountHolderLabel")}
                    </FieldLabel>
                    <Input
                      id="account-holder"
                      className="cursor-pointer"
                      value={form.accountHolderName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          accountHolderName: event.target.value,
                        }))
                      }
                      placeholder="Michael Chen"
                    />
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
                        onChange={(val) =>
                          setForm((current) => ({ ...current, amount: val }))
                        }
                        placeholder="0"
                      />
                      <span className="absolute right-3 text-sm font-semibold text-muted-foreground">
                        IDR
                      </span>
                    </div>
                    <FieldDescription className="text-xs mt-1 text-muted-foreground">
                      {t("payment.payoutLimitLabel")}: {formatIDR(minimumAmount)} - {formatIDR(maximumAmount)}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              ) : null}

              {/* Amount Summary Highlight */}
              <div className="p-4 bg-muted/30 border rounded-lg flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Jumlah Penarikan</span>
                <span className="text-xl font-bold text-foreground">
                  {formatIDR(requestedAmount)}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("payment.payoutSecurityNote")}
                </p>
                <Button
                  type="submit"
                  disabled={payoutDisabled}
                  className="w-full gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/30"
                >
                  {payoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t("payment.createPayoutButton")}
                </Button>
              </div>
            </div>

            {/* Terms and FAQ Sidebar */}
            <div className="space-y-6">
              {/* Syarat Box */}
              <div className="p-5 bg-card border rounded-lg space-y-4">
                <h4 className="font-bold text-sm text-foreground">Syarat</h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Waktu pembayaran rata-rata</span>
                    <span className="font-semibold text-foreground">Instan</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Biaya</span>
                    <span className="font-semibold text-foreground">0%</span>
                  </div>
                </div>
              </div>

              {/* FAQ Box (Interactive and Real) */}
              <div className="p-5 bg-card border rounded-lg space-y-4">
                <h4 className="font-bold text-sm text-foreground">FAQ Penarikan</h4>
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
  );
}

export function PaymentSettings() {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);
  const { data: statusData, isLoading: statusLoading } = useXenditConnectionStatus();

  const status = statusData?.data;
  const isConnected = status?.is_connected === true;
  const connectionStatus = status?.status ?? "not_connected";
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
    <div className="space-y-8">
      <div className="flex justify-end">
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <Separator />

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
