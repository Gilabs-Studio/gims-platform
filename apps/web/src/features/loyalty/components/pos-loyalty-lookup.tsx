"use client";

import { useState, useEffect } from "react";
import { Search, Star, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useLookupLoyaltyMember } from "../hooks/use-loyalty";
import { LoyaltyTierBadge } from "./loyalty-tier-badge";
import type { LoyaltyMemberLookup } from "../types";

interface PosLoyaltyLookupProps {
  outletId: string;
  onMemberFound: (lookup: LoyaltyMemberLookup) => void;
  onEnrollRequest: (name: string) => void;
  onClear: () => void;
  selectedMemberId?: string;
}

export function PosLoyaltyLookup({
  outletId,
  onMemberFound,
  onEnrollRequest,
  onClear,
  selectedMemberId,
}: PosLoyaltyLookupProps) {
  const t = useTranslations("loyalty.pos");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 400ms debounce to avoid excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useLookupLoyaltyMember(debouncedQuery, outletId);
  const lookup = data?.data as LoyaltyMemberLookup | undefined;

  // Notify parent whenever a member is found
  useEffect(() => {
    if (lookup?.found) {
      onMemberFound(lookup);
    }
  }, [lookup, onMemberFound]);

  function handleClear() {
    setQuery("");
    setDebouncedQuery("");
    onClear();
  }

  return (
    <div className="space-y-2 px-4 pb-2 pt-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("lookupLabel")}
      </p>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("lookupPlaceholder")}
          className="pl-8 pr-7 h-8 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isFetching && debouncedQuery.length >= 2 && (
        <Skeleton className="h-9 w-full rounded-md" />
      )}

      {/* Member found */}
      {!isFetching && lookup?.found && lookup.customer_name && (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            selectedMemberId === lookup.member_id
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <span className="font-medium truncate block">{lookup.customer_name}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {(lookup.point_balance ?? 0).toLocaleString()} pts
            </span>
          </div>
          <LoyaltyTierBadge
            tier={lookup.current_tier ?? ""}
            badgeColor={lookup.tier_badge_color ?? ""}
          />
        </div>
      )}

      {/* Not a member yet — offer enrollment */}
      {!isFetching && debouncedQuery.length >= 2 && lookup && !lookup.found && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground truncate">{t("notMember")}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px] cursor-pointer shrink-0 gap-1"
            onClick={() => onEnrollRequest(debouncedQuery)}
          >
            <UserPlus className="h-3 w-3" />
            {t("enroll")}
          </Button>
        </div>
      )}

      {/* Loyalty program not configured for this outlet */}
      {!isFetching && debouncedQuery.length >= 2 && lookup === undefined && (
        <Badge variant="secondary" className="text-[11px]">
          {t("noProgram")}
        </Badge>
      )}
    </div>
  );
}
