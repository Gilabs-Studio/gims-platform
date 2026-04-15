"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { useLoyaltyLedger } from "../hooks/use-loyalty";
import { LoyaltyTierBadge } from "./loyalty-tier-badge";
import type { LoyaltyMember } from "../types";

interface Props {
  member: LoyaltyMember | null;
  onClose: () => void;
}

export function LoyaltyMemberDetailDialog({ member, onClose }: Props) {
  const t = useTranslations("loyalty");
  const { data: ledgerData, isLoading } = useLoyaltyLedger(member?.id ?? "");
  const entries = ledgerData?.data ?? [];

  const ENTRY_TYPE_COLORS: Record<string, string> = {
    earned: "bg-emerald-100 text-emerald-800",
    redeemed: "bg-amber-100 text-amber-800",
    expired: "bg-gray-100 text-gray-600",
    adjusted: "bg-blue-100 text-blue-800",
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("members.detail.title")}</DialogTitle>
        </DialogHeader>

        {member && (
          <div className="space-y-4">
            {/* Member info summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Member Code</p>
                <p className="font-mono font-medium">{member.member_code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{member.customer_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("members.currentTier")}</p>
                <LoyaltyTierBadge tier={member.current_tier} badgeColor={member.tier_badge_color} />
              </div>
              <div>
                <p className="text-muted-foreground">{t("members.pointBalance")}</p>
                <p className="font-semibold text-lg">{member.point_balance.toLocaleString()} pts</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("members.lifetimePoints")}</p>
                <p className="font-medium">{member.lifetime_points.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("members.joinedAt")}</p>
                <p>{format(new Date(member.joined_at), "dd MMM yyyy")}</p>
              </div>
            </div>

            <Separator />

            {/* Ledger */}
            <div>
              <h4 className="font-medium mb-2">{t("ledger.title")}</h4>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ledger.empty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ledger.date")}</TableHead>
                      <TableHead>{t("ledger.type")}</TableHead>
                      <TableHead className="text-right">{t("ledger.points")}</TableHead>
                      <TableHead className="text-right">{t("ledger.balanceAfter")}</TableHead>
                      <TableHead>{t("ledger.note")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${ENTRY_TYPE_COLORS[entry.entry_type] ?? ""}`}
                          >
                            {t(`ledger.types.${entry.entry_type}`)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={entry.points >= 0 ? "text-emerald-600" : "text-destructive"}>
                            {entry.points >= 0 ? "+" : ""}{entry.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{entry.balance_after}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.note ?? entry.reward_name ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
