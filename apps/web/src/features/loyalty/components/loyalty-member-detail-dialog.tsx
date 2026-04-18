"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { useLoyaltyLedger } from "../hooks/use-loyalty";
import type { LoyaltyMember } from "../types";

interface Props {
  member: LoyaltyMember | null;
  onClose: () => void;
}

export function LoyaltyMemberDetailDialog({ member, onClose }: Props) {
  const t = useTranslations("loyalty");
  const [activeTab, setActiveTab] = useState<"general" | "point-history">("general");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);

  const { data: ledgerData, isLoading } = useLoyaltyLedger(
    member?.id ?? "",
    { page: ledgerPage, per_page: ledgerPageSize },
  );
  const entries = ledgerData?.data ?? [];
  const totalLedgerEntries = ledgerData?.meta?.pagination?.total ?? entries.length;

  // When the selected member changes we want the dialog to reset its
  // internal tab and pagination state. Instead of calling setState inside
  // an effect (which can trigger cascading renders and linter warnings),
  // we remount the Tabs by keying it on `member.id`. This ensures fresh
  // initial state without synchronous setState in effects.

  // Extract tier color to a stable variable so memo dependencies are explicit.
  const tierColor = member?.tier_badge_color;
  const tierBadgeStyle = useMemo(() => {
    if (!tierColor) return undefined;
    return {
      backgroundColor: tierColor,
      color: "#ffffff",
      borderColor: tierColor,
    };
  }, [tierColor]);

  const ENTRY_TYPE_VARIANTS: Record<string, "success" | "warning" | "secondary" | "info"> = {
    earned: "success",
    redeemed: "warning",
    expired: "secondary",
    adjusted: "info",
  };

  const getTransactionTypeLabel = (transactionType: string) => {
    const key = `ledger.transactionType.${transactionType}`;
    return t.has(key) ? t(key) : transactionType;
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("members.detail.title")}</DialogTitle>
        </DialogHeader>

        {member && (
          <Tabs
            key={member.id}
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value === "point-history" ? "point-history" : "general")
            }
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="general">{t("members.detail.tabs.general")}</TabsTrigger>
              <TabsTrigger value="point-history">{t("members.detail.tabs.pointHistory")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 py-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("members.memberCode")}</TableCell>
                      <TableCell className="font-mono font-medium">{member.member_code}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("members.detail.labels.customer")}</TableCell>
                      <TableCell className="font-medium">{member.customer_name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("members.currentTier")}</TableCell>
                      <TableCell>
                        <Badge style={tierBadgeStyle}>{member.current_tier}</Badge>
                      </TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("members.pointBalance")}</TableCell>
                      <TableCell className="font-semibold">{member.point_balance.toLocaleString()} pts</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("members.lifetimePoints")}</TableCell>
                      <TableCell>{member.lifetime_points.toLocaleString()}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("members.totalTransactions")}</TableCell>
                      <TableCell>{member.total_transactions.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("members.joinedAt")}</TableCell>
                      <TableCell>{format(new Date(member.joined_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("members.detail.labels.program")}</TableCell>
                      <TableCell>{member.program_name ?? "-"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="point-history" className="space-y-4 py-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ledger.empty")}</p>
              ) : (
                <>
                  <div className="rounded-lg border">
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant={ENTRY_TYPE_VARIANTS[entry.entry_type] ?? "secondary"}>
                                  {t(`ledger.types.${entry.entry_type}`)}
                                </Badge>
                                {entry.transaction_type && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {getTransactionTypeLabel(entry.transaction_type)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={entry.points >= 0 ? "text-emerald-600" : "text-destructive"}>
                                {entry.points >= 0 ? "+" : ""}
                                {entry.points}
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
                  </div>

                  {totalLedgerEntries > 0 && (
                    <DataTablePagination
                      pageIndex={ledgerPage}
                      pageSize={ledgerPageSize}
                      rowCount={totalLedgerEntries}
                      onPageChange={setLedgerPage}
                      onPageSizeChange={(newSize) => {
                        setLedgerPageSize(newSize);
                        setLedgerPage(1);
                      }}
                    />
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
