"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useProcessCashPayment, useInitiateDigitalPayment, usePOSPayments, useXenditConnectionStatus } from "../hooks/use-pos";
import type { POSOrder, POSConfig, POSPayment } from "../types";
import { Loader2, CheckCircle2, XCircle, WifiOff } from "lucide-react";

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

  async function handleDigitalSubmit() {
    try {
      const result = await initiateDigital.mutateAsync({
        orderId: order.id,
        data: {
          method: "DIGITAL",
          amount: totalAmount,
          customer_name: customerName.trim() || undefined,
        },
      });
      const payload = result as { data?: POSPayment };
      if (payload?.data) {
        setDigitalPayment(payload.data);
      }
    } catch {
      toast.error("Failed to initiate digital payment. Please try again.");
      onPaymentError?.();
    }
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
                  <p className="font-medium">Digital Payment Not Available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payment gateway is not connected. Please contact your administrator to set up digital payments.
                  </p>
                </div>
              </div>
            ) : digitalPayment ? (
              <DigitalPaymentDetails payment={digitalPayment} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Customer will be charged via Xendit payment gateway. Proceed to generate payment link.
                </p>
                <Button
                  className="w-full cursor-pointer"
                  size="lg"
                  onClick={handleDigitalSubmit}
                  disabled={initiateDigital.isPending}
                >
                  {initiateDigital.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Generate Payment Link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DigitalPaymentDetails({ payment }: { payment: POSPayment }) {
  const isPaid = payment.status === "PAID";
  const isFailed = payment.status === "FAILED" || payment.status === "EXPIRED";

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Payment Status</span>
        {isPaid ? (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </Badge>
        ) : isFailed ? (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Waiting
          </Badge>
        )}
      </div>

      {payment.va_number && (
        <div>
          <Label className="text-xs text-muted-foreground">Virtual Account Number</Label>
          <div className="font-mono text-lg font-bold tracking-wider mt-1 select-all">
            {payment.va_number}
          </div>
        </div>
      )}

      {payment.qr_code && (
        <div className="flex flex-col items-center gap-2">
          <Label className="text-xs text-muted-foreground">Scan QR Code</Label>
          <img
            src={payment.qr_code}
            alt="QR Code"
            className="w-40 h-40 border rounded"
          />
        </div>
      )}

      {payment.payment_url && (
        <Button
          variant="outline"
          className="w-full cursor-pointer"
          onClick={() => window.open(payment.payment_url!, "_blank")}
        >
          Open Payment Page
        </Button>
      )}

      {payment.expires_at && (
        <p className="text-xs text-muted-foreground text-center">
          Expires at {new Date(payment.expires_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
