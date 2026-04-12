"use client";

import { useState, useEffect, useCallback } from "react";
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

export function POSPaymentModal({
  open,
  onOpenChange,
  order,
  config,
  onSuccess,
  onPaymentError,
}: POSPaymentModalProps) {
  const [tab, setTab] = useState<"CASH" | "DIGITAL">("CASH");
  const [tenderInput, setTenderInput] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [digitalPayment, setDigitalPayment] = useState<POSPayment | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<XenditPaymentChannel | null>(null);

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

  // Start polling when digital payment is pending
  useEffect(() => {
    setPollingEnabled(!!digitalPayment && digitalPayment.status === "PENDING");
  }, [digitalPayment]);

  // Check if payment has been completed via polling
  useEffect(() => {
    if (!paymentsData?.data) return;
    const payments = Array.isArray(paymentsData.data) ? paymentsData.data : [];
    const latestPayment = payments[0];
    if (latestPayment?.status === "PAID") {
      setPollingEnabled(false);
      onSuccess(customerName.trim() || undefined);
    }
  }, [paymentsData, onSuccess, customerName]);

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
      }
    } catch {
      toast.error(t("digitalError"));
      onPaymentError?.();
    }
  }

  function handleBackToChannels() {
    setSelectedChannel(null);
    setDigitalPayment(null);
    setPollingEnabled(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        {/* Order total summary */}
        <div className="bg-muted rounded-lg px-4 py-3 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Order #{order.order_number}</span>
          <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
        </div>

        {/* Optional customer name — used on receipt */}
        <div className="space-y-1">
          <Label htmlFor="customerName" className="text-xs text-muted-foreground">
            Customer name <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="customerName"
            placeholder="e.g. Budi"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="CASH">Cash</TabsTrigger>
            <TabsTrigger className="flex-1" value="DIGITAL">Digital Payment</TabsTrigger>
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
                Exact {formatCurrency(totalAmount)}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer text-xs text-muted-foreground"
                disabled={tenderInput === ""}
                onClick={() => setTenderInput("")}
              >
                Reset
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
                <span className="text-muted-foreground">Change</span>
                <span className={insufficientCash ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                  {insufficientCash ? `Short ${formatCurrency(Math.abs(change))}` : formatCurrency(change)}
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
              Confirm Cash Payment
            </Button>
          </TabsContent>

          {/* DIGITAL PAYMENT TAB */}
          <TabsContent value="DIGITAL" className="mt-3 space-y-3">
            {xenditStatusLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !isXenditConnected ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("digitalNotAvailable")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("digitalNotAvailableDesc")}
                  </p>
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
  const categories: XenditChannelCategory[] = ["QR_CODE", "EWALLET", "BANK_TRANSFER", "CARDS"];

  return (
    <ScrollArea className="max-h-[350px] pr-1">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t("selectChannel")}
        </p>
        {categories.map((category) => {
          const channels = getChannelsByCategory(category);
          if (channels.length === 0) return null;
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </div>
              <div className={cn(
                "grid gap-1.5",
                channels.length === 1 ? "grid-cols-1" : "grid-cols-2"
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
                        "justify-start gap-2 cursor-pointer h-10 text-sm font-medium",
                        isProcessing && "opacity-70"
                      )}
                      disabled={isLoading}
                      onClick={() => onSelect(channel)}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : null}
                      {channel.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function DigitalPaymentDetails({ payment }: { payment: POSPayment }) {
  const t = useTranslations("posTerminal.payment");
  const isPaid = payment.status === "PAID";
  const isFailed = payment.status === "FAILED" || payment.status === "EXPIRED";

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
            <Loader2 className="h-3 w-3 animate-spin" /> {t("status.pending")}
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
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.qr_code)}`}
              alt="QRIS QR Code"
              className="w-48 h-48"
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

      {/* Payment URL fallback */}
      {payment.payment_url && !payment.qr_code && !payment.va_number && (
        <Button
          variant="outline"
          className="w-full cursor-pointer gap-2"
          onClick={() => window.open(payment.payment_url!, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          {t("openPage")}
        </Button>
      )}

      {payment.expires_at && (
        <p className="text-xs text-muted-foreground text-center">
          {t("expires")} {new Date(payment.expires_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
