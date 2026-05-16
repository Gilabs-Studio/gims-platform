"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POSPaymentModal } from "@/features/pos/terminal/components/pos-payment-modal";
import { PosLoyaltyRedeemPanel } from "@/features/loyalty/components/pos-loyalty-redeem-panel";
import { useEnrollLoyaltyMember, useLookupLoyaltyMember, useLoyaltyProgram } from "@/features/loyalty/hooks/use-loyalty";
import type { LoyaltyMember, RewardConfig } from "@/features/loyalty/types";
import type { LiveTableInfo } from "../types";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ActiveTablePaymentDialogProps {
  info: LiveTableInfo | null;
  onClose: () => void;
  onSuccess: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function normalizePercentRewardValue(value: number): number {
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
    const pct = normalizePercentRewardValue(reward.value);
    return Math.max((baseAmount * pct) / 100, 0);
  }
  return 0;
}

function toLoyaltyMemberFromLookup(
  lookup: {
    member_id?: string;
    customer_id?: string;
    customer_name?: string;
    member_code?: string;
    current_tier?: string;
    tier_badge_color?: string;
    point_balance?: number;
  },
  fallbackName: string
): LoyaltyMember | null {
  if (!lookup.member_id) return null;
  return {
    id: lookup.member_id,
    customer_id: lookup.customer_id ?? "",
    customer_name: lookup.customer_name ?? fallbackName,
    customer_phone: undefined,
    program_id: "",
    program_name: undefined,
    member_code: lookup.member_code ?? "-",
    current_tier: lookup.current_tier ?? "Member",
    tier_badge_color: lookup.tier_badge_color ?? "#6B7280",
    point_balance: lookup.point_balance ?? 0,
    lifetime_points: 0,
    total_transactions: 0,
    enrolled_outlet_id: undefined,
    enrolled_outlet_name: undefined,
    joined_at: "",
  };
}

export function ActiveTablePaymentDialog({ info, onClose, onSuccess }: ActiveTablePaymentDialogProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardConfig | null>(null);
  const [convertedMember, setConvertedMember] = useState<LoyaltyMember | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const t = useTranslations("posTerminal.liveTable.payNow");
  const order = info?.order ?? null;
  const tableLabel = info ? (info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`) : "";
  const customerName = order?.customer_name?.trim() ?? "";
  const lookupMemberQuery = useLookupLoyaltyMember(customerName.length >= 2 ? customerName : "", order?.outlet_id ?? "");
  const enrollMember = useEnrollLoyaltyMember();

  const lookupMember = useMemo(() => {
    const payload = lookupMemberQuery.data?.data;
    if (!payload?.found) return null;
    return toLoyaltyMemberFromLookup(payload, customerName);
  }, [lookupMemberQuery.data?.data, customerName]);

  const selectedMember = convertedMember ?? lookupMember;
  const { data: convertedMemberProgram } = useLoyaltyProgram(convertedMember?.program_id ?? "");

  const availableRewards = useMemo(() => {
    if (convertedMember) {
      return (convertedMemberProgram?.data?.config.rewards ?? []).filter((reward) => reward.is_active);
    }
    return (lookupMemberQuery.data?.data?.available_rewards ?? []).filter((reward) => reward.is_active);
  }, [convertedMember, convertedMemberProgram?.data?.config.rewards, lookupMemberQuery.data?.data?.available_rewards]);

  const amountBeforeDiscount = Math.max(order?.subtotal ?? 0, 0) + Math.max(order?.tax_amount ?? 0, 0) + Math.max(order?.service_charge ?? 0, 0);
  const rewardDiscount = calculateRewardDiscount(amountBeforeDiscount, selectedReward);
  const totalAfterReward = Math.max(amountBeforeDiscount - rewardDiscount, 0);

  if (!info || !order) return null;

  const handleProceed = () => setShowPaymentModal(true);

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    onSuccess();
  };

  const handleConvertToMember = async () => {
    if (!customerName) {
      toast.error(t("convertMemberNeedName"));
      return;
    }

    try {
      const result = await enrollMember.mutateAsync({
        outlet_id: order.outlet_id,
        pos_order_id: order.id,
        name: customerName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setConvertedMember(result.data);
      toast.success(t("convertMemberSuccess"));
    } catch {
      toast.error(t("convertMemberFailed"));
    }
  };

  return (
    <>
      <Dialog open={!!info && !showPaymentModal} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("title", { table: tableLabel })}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("order")}</p>
                  <p className="font-mono font-semibold">#{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("amountDue")}</p>
                  {rewardDiscount > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(amountBeforeDiscount)}</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalAfterReward)}</p>
                    </div>
                  ) : (
                    <p className="text-lg font-bold">{formatCurrency(order.total_amount)}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                <span>{t("customer")}: </span>
                <span className="font-medium text-foreground">{customerName || t("walkInCustomer")}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("items")}</p>
              <ScrollArea className="max-h-48">
                <div className="space-y-1.5 pr-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-muted-foreground w-5 text-right shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="truncate">{item.product_name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2 tabular-nums">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("tax")}</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("service")}</span>
                <span>{formatCurrency(order.service_charge)}</span>
              </div>
              {rewardDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(rewardDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-base pt-2">
                <span>{t("total")}</span>
                <span>{formatCurrency(rewardDiscount > 0 ? totalAfterReward : order.total_amount)}</span>
              </div>
            </div>

            {selectedMember ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t("memberInfo")}</p>
                  <Badge variant="outline">{selectedMember.current_tier}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("memberCode")}: {selectedMember.member_code}</p>
                <p className="text-xs text-muted-foreground">{t("memberPoints")}: {selectedMember.point_balance.toLocaleString("id-ID")}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-3 space-y-3">
                <p className="text-sm font-medium">{t("notMember")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("phone")}</Label>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0812xxxx" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("email")}</Label>
                    <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" className="h-8" />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={enrollMember.isPending || !customerName}
                  onClick={handleConvertToMember}
                >
                  {enrollMember.isPending ? t("converting") : t("convertMember")}
                </Button>
              </div>
            )}

            {selectedMember && availableRewards.length > 0 && (
              <PosLoyaltyRedeemPanel
                member={selectedMember}
                availableRewards={availableRewards}
                orderAmount={amountBeforeDiscount}
                selectedRewardId={selectedReward?.id}
                onSelectReward={setSelectedReward}
              />
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                {t("cancel")}
              </Button>
              <Button type="button" onClick={handleProceed} className="cursor-pointer">
                {t("continueToPayment")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPaymentModal && (
        <POSPaymentModal
          open={showPaymentModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowPaymentModal(false);
              onClose();
            }
          }}
          order={order}
          paymentOnly
          prefillCustomer={{
            customerMode: selectedMember?.customer_id ? "existing" : "new",
            customerId: selectedMember?.customer_id ?? undefined,
            customerName: customerName || undefined,
            customerPhone: phone || undefined,
            customerEmail: email || undefined,
          }}
          prefillReward={selectedReward}
          loyaltyMember={selectedMember ?? undefined}
          loyaltyRewards={availableRewards}
          onSuccess={handlePaymentSuccess}
          onPaymentError={() => {
            toast.error(t("paymentFailed"));
          }}
        />
      )}
    </>
  );
}
