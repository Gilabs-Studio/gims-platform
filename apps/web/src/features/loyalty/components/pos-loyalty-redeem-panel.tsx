"use client";

import { CheckCircle2, Tag, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { LoyaltyTierBadge } from "./loyalty-tier-badge";
import type { LoyaltyMember, RewardConfig } from "../types";
import { formatCurrency } from "@/lib/utils";

interface PosLoyaltyRedeemPanelProps {
  member: LoyaltyMember;
  availableRewards: RewardConfig[];
  /** Current amount due used to preview discounted total per reward */
  orderAmount?: number;
  /** Selected reward ID that will be redeemed when payment succeeds */
  selectedRewardId?: string;
  /** Called when cashier selects or clears reward choice */
  onSelectReward: (reward: RewardConfig | null) => void;
}

function RewardTypeIcon({ type }: { type: RewardConfig["type"] }) {
  if (type === "merch") return <Gift className="h-4 w-4 shrink-0 text-primary" />;
  return <Tag className="h-4 w-4 shrink-0 text-primary" />;
}

function RewardTypeBadge({ type, t }: { type: RewardConfig["type"]; t: ReturnType<typeof useTranslations> }) {
  if (type === "merch") {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
        {t("rewardTypeMerch")}
      </Badge>
    );
  }
  if (type === "discount_percent") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
        {t("rewardTypeDiscountPct")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
      {t("rewardTypeDiscountFixed")}
    </Badge>
  );
}

function rewardValueLabel(reward: RewardConfig): string {
  if (reward.type === "discount_percent") {
    const pct = normalizePercentRewardValue(reward.value);
    const pctText = Number.isInteger(pct) ? `${pct}` : pct.toFixed(2).replace(/\.?0+$/, "");
    return `-${pctText}%`;
  }
  if (reward.type === "discount_fixed") return `-${formatCurrency(reward.value)}`;
  return reward.merch_description ?? reward.name;
}

function normalizePercentRewardValue(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Backward compatibility: some legacy configs store 5% as 5000.
  if (value > 100) return Math.min(value / 1000, 100);
  return Math.min(value, 100);
}

function getRewardDiscountAmount(reward: RewardConfig, orderAmount: number): number {
  if (reward.type === "discount_fixed") {
    return Math.max(Math.min(reward.value, orderAmount), 0);
  }
  if (reward.type === "discount_percent") {
    const pct = normalizePercentRewardValue(reward.value);
    return Math.max((orderAmount * pct) / 100, 0);
  }
  return 0;
}

export function PosLoyaltyRedeemPanel({
  member,
  availableRewards,
  orderAmount,
  selectedRewardId,
  onSelectReward,
}: PosLoyaltyRedeemPanelProps) {
  const t = useTranslations("loyalty.pos");

  const activeRewards = availableRewards.filter((r) => r.is_active);

  return (
    <div className="rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden">
      {/* Member header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            {t("redeemLabel")}
          </p>
          <p className="truncate text-base font-semibold">{member.customer_name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">{member.point_balance.toLocaleString()}</span>{" "}
            {t("points")}
          </p>
        </div>
        <LoyaltyTierBadge tier={member.current_tier} badgeColor={member.tier_badge_color} />
      </div>

      {/* Rewards list */}
      {activeRewards.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground text-center">{t("noRewards")}</p>
      ) : (
        <div className="divide-y divide-border/40">
          {activeRewards.map((reward) => {
            const isAffordable = reward.points_required <= member.point_balance;
            const isSelected = selectedRewardId === reward.id;
            const baseAmount = orderAmount ?? 0;
            const discountAmount = getRewardDiscountAmount(reward, baseAmount);
            const discountedTotal = Math.max(baseAmount - discountAmount, 0);

            return (
              <div
                key={reward.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? "bg-green-50/70 dark:bg-green-950/20"
                    : isAffordable
                    ? "bg-background hover:bg-muted/30"
                    : "bg-background opacity-50"
                }`}
              >
                <RewardTypeIcon type={reward.type} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{reward.name}</p>
                    <RewardTypeBadge type={reward.type} t={t} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {reward.points_required.toLocaleString()} {t("points")}
                    </span>
                    {reward.type !== "merch" && (
                      <span className="text-xs font-medium text-primary">{rewardValueLabel(reward)}</span>
                    )}
                    {reward.type === "merch" && reward.merch_description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {reward.merch_description}
                      </span>
                    )}
                  </div>
                  {reward.type !== "merch" && baseAmount > 0 && discountAmount > 0 && (
                    <div className="mt-0.5 text-xs tabular-nums">
                      <span className="text-muted-foreground line-through">{formatCurrency(baseAmount)}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(discountedTotal)}</span>
                    </div>
                  )}
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={isAffordable ? "default" : "outline"}
                    className="h-9 px-4 text-sm font-medium cursor-pointer shrink-0 min-w-[72px]"
                    disabled={!isAffordable}
                    onClick={() => onSelectReward(reward)}
                  >
                    {t("redeemBtn")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeRewards.length > 0 &&
        activeRewards.every((r) => r.points_required > member.point_balance) &&
        !selectedRewardId && (
          <p className="px-4 pb-3 text-xs text-muted-foreground text-center">{t("insufficientPoints")}</p>
        )}

      {selectedRewardId && (
        <div className="px-4 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs cursor-pointer"
            onClick={() => onSelectReward(null)}
          >
            {t("clearSelection")}
          </Button>
        </div>
      )}
    </div>
  );
}
