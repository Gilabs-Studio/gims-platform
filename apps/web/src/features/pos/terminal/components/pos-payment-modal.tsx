"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { useProcessCashPayment, useInitiateDigitalPayment, usePOSPayments, useXenditConnectionStatus } from "../hooks/use-pos";
import type { POSOrder, POSConfig, POSPayment, XenditPaymentChannel, XenditChannelCategory } from "../types";
import { Loader2, CheckCircle2, XCircle, WifiOff, ArrowLeft, QrCode, Landmark, Wallet, CreditCard, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface POSPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: POSOrder;
  config?: POSConfig;
  onSuccess: (customerName?: string, tenderAmount?: number) => void;
  onPaymentError?: () => void;
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

export function POSPaymentModal({
  open,
  onOpenChange,
  order,
  onSuccess,
  onPaymentError,
}: POSPaymentModalProps) {
  const [tab, setTab] = useState<"CASH" | "DIGITAL">("CASH");
  const [tenderInput, setTenderInput] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [digitalPayment, setDigitalPayment] = useState<POSPayment | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<XenditPaymentChannel | null>(null);
  const hasCompletedDigitalPaymentRef = useRef(false);
  const autoOpenedPaymentUrlRef = useRef<string | null>(null);

  const t = useTranslations("posTerminal.payment");

  const { data: paymentsData } = usePOSPayments(order.id, {
    // Only fetch payments list when polling for digital payment status confirmation.
    enabled: pollingEnabled,
  });
  const { data: xenditStatusData, isLoading: xenditStatusLoading } = useXenditConnectionStatus();
  const processCash = useProcessCashPayment();
  const initiateDigital = useInitiateDigitalPayment();

  const isXenditConnected = xenditStatusData?.data?.is_connected === true;

  const totalAmount = order.total_amount;
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
      onSuccess(customerName.trim() || undefined);
    }
  }, [paymentsData, onSuccess, customerName]);

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
      await processCash.mutateAsync({
        orderId: order.id,
        data: {
          method: "CASH",
          amount: tenderAmount,
          customer_name: customerName.trim() || undefined,
        },
      });
      onSuccess(customerName.trim() || undefined, tenderAmount);
    } catch {
      toast.error("Payment failed. Please try again.");
      onPaymentError?.();
    }
  }

  async function handleDigitalSubmit(channel: XenditPaymentChannel) {
    try {
      hasCompletedDigitalPaymentRef.current = false;
      setPollingEnabled(false);
      const result = await initiateDigital.mutateAsync({
        orderId: order.id,
        data: {
          method: "DIGITAL",
          amount: totalAmount,
          customer_name: customerName.trim() || undefined,
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
      setSelectedChannel(null);
      setDigitalPayment(null);
      setPollingEnabled(false);
      hasCompletedDigitalPaymentRef.current = false;
      autoOpenedPaymentUrlRef.current = null;
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">{t("title")}</DialogTitle>
        </DialogHeader>

        {/* Order summary */}
        <div className="rounded-2xl border border-border/70 bg-linear-to-b from-background to-muted/30 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("orderLabel")} #{order.order_number}
              </p>
              <p className="text-sm text-muted-foreground">{t("readyForPayment")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("amountDue")}</p>
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Optional customer name — used on receipt */}
        <div className="space-y-1">
          <Label htmlFor="customerName" className="text-xs text-muted-foreground">
            {t("customerName")} <span className="text-muted-foreground/60">({t("optional")})</span>
          </Label>
          <Input
            id="customerName"
            placeholder={t("exampleCustomer")}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

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
      </DialogContent>
    </Dialog>
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
