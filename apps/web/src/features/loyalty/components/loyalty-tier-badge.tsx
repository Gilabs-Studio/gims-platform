"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LoyaltyTierBadgeProps {
  tier: string;
  badgeColor?: string;
  size?: "sm" | "md";
  className?: string;
}

export function LoyaltyTierBadge({
  tier,
  badgeColor,
  size = "md",
  className,
}: LoyaltyTierBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-semibold",
        size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5",
        className
      )}
      style={badgeColor ? { backgroundColor: badgeColor, color: "#fff" } : undefined}
    >
      {tier}
    </Badge>
  );
}
