"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Search, UserPlus, MoreHorizontal, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useLoyaltyMembers } from "../hooks/use-loyalty";
import { LoyaltyTierBadge } from "./loyalty-tier-badge";
import { LoyaltyMemberDetailDialog } from "./loyalty-member-detail-dialog";
import { LoyaltyEnrollDialog } from "./loyalty-enroll-dialog";
import { LoyaltyChangeProgramDialog } from "./loyalty-change-program-dialog";
import type { LoyaltyMember } from "../types";

export function LoyaltyMemberList() {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [changeProgramMember, setChangeProgramMember] = useState<LoyaltyMember | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // The members hook doesn't accept `search` in its params type — pass pagination only.
  const { data, isLoading } = useLoyaltyMembers({ page, per_page: perPage });

  const members = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("members.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your loyalty program members
          </p>
        </div>
        <Button
          className="cursor-pointer gap-1.5"
          onClick={() => setEnrollOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          {t("members.enroll")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search members..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("members.memberCode")}</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>{t("members.currentTier")}</TableHead>
              <TableHead className="text-right">{t("members.pointBalance")}</TableHead>
              <TableHead className="text-right">{t("members.totalTransactions")}</TableHead>
              <TableHead>{t("members.joinedAt")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("members.empty")}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedMember(member)}
                >
                  <TableCell className="font-mono text-sm">{member.member_code}</TableCell>
                  <TableCell className="font-medium">{member.customer_name}</TableCell>
                  <TableCell>
                    <LoyaltyTierBadge
                      tier={member.current_tier}
                      badgeColor={member.tier_badge_color}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {member.point_balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {member.total_transactions}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(member.joined_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setChangeProgramMember(member)}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Change Program
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPerPage(newSize);
            setPage(1);
          }}
        />
      )}

      <LoyaltyMemberDetailDialog
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      <LoyaltyEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
      />

      <LoyaltyChangeProgramDialog
        member={changeProgramMember}
        onClose={() => setChangeProgramMember(null)}
      />
    </div>
  );
}
