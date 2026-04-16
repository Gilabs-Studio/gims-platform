"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRedeemPoints } from "../hooks/use-loyalty";
import { LoyaltyTierBadge } from "./loyalty-tier-badge";
import type { LoyaltyMember, RewardConfig } from "../types";

interface PosLoyaltyRedeemPanelProps {
  member: LoyaltyMember;
  availableRewards: RewardConfig[];
  /** Called after a successful redemption with the selected reward */
  onRedeemed: (reward: RewardConfig) => void;
  /** Reward already selected/redeemed in this session */
  redeemedRewardId?: string;
}

export function PosLoyaltyRedeemPanel({
  member,
  availableRewards,
  onRedeemed,
  redeemedRewardId,
}: PosLoyaltyRedeemPanelProps) {
  const t = useTranslations("loyalty.pos");
  const redeem = useRedeemPoints();
  const [pendingRewardId, setPendingRewardId] = useState<string | null>(null);

  async function handleRedeem(reward: RewardConfig) {
    if (redeemedRewardId) return; // one redemption per transaction
    setPendingRewardId(reward.id);
    try {
      await redeem.mutateAsync({ member_id: member.id, reward_id: reward.id });
      toast.success(t("redeemSuccess", { reward: reward.name }));
      onRedeemed(reward);
    } catch {
      toast.error(t("redeemError"));
    } finally {
      setPendingRewardId(null);
    }
  }

  const affordableRewards = availableRewards.filter(
    (r) => r.points_cost <= member.point_balance
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("redeemLabel")}
          </p>
          <p className="truncate text-sm font-medium">{member.customer_name}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {member.point_balance.toLocaleString()} {t("points")}
          </p>
        </div>
        <LoyaltyTierBadge tier={member.current_tier} badgeColor={member.tier_badge_color} />
      </div>

      {availableRewards.length === 0 && (
        <p className="pt-3 text-sm text-muted-foreground text-center">{t("noRewards")}</p>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
        {availableRewards.map((reward) => {
          const isAffordable = reward.points_cost <= member.point_balance;
          const isRedeemed = redeemedRewardId === reward.id;
          const isLoading = pendingRewardId === reward.id;

          return (
            <div
              key={reward.id}
              className={`flex items-center gap-2 border-b px-3 py-2.5 last:border-b-0 transition-colors ${
                isRedeemed
                  ? "bg-green-50/70 dark:bg-green-950/20"
                  : isAffordable
                  ? "bg-background hover:bg-muted/40"
                  : "bg-background/60 opacity-55"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium">{reward.name}</p>
                {reward.description && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {reward.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px] tabular-nums">
                {reward.points_cost.toLocaleString()}
              </Badge>
              {isRedeemed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Button
                  size="sm"
                  variant={isAffordable ? "default" : "ghost"}
                  className="h-7 px-2.5 text-[11px] cursor-pointer shrink-0"
                  disabled={!isAffordable || !!redeemedRewardId || isLoading}
                  onClick={() => handleRedeem(reward)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t("redeemBtn")
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {availableRewards.length > 0 && affordableRewards.length === 0 && !redeemedRewardId && (
        <p className="pt-2 text-[11px] text-muted-foreground text-center">{t("insufficientPoints")}</p>
      )}
    </div>
  );
}
