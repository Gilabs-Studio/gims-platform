"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Search,
  Plus,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Check,
  Ban,
  FileCheck,
  Calendar,
} from "lucide-react";
import { useAssetBorrowings } from "../hooks/use-asset-borrowings";
import { useAssets } from "../hooks/use-assets";
import { BorrowingRequestDialog } from "./borrowing-request-dialog";
import { ApprovalDialog } from "./approval-dialog";
import { ReturnAssetDialog } from "./return-asset-dialog";
import type { BorrowingRequest, BorrowingStatus } from "../types";

export function AssetBorrowingPage() {
  const t = useTranslations("assetBorrowing");
  const router = useRouter();

  const {
    borrowings,
    allBorrowings,
    pendingApprovals,
    totalCount,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    statistics,
    handleCreateBorrowing,
    handleApproveReject,
    handleReturnAsset,
    handleCancelRequest,
  } = useAssetBorrowings();

  const { rawAssets, getAssetById } = useAssets();

  const [activeTab, setActiveTab] = useState<"my" | "approvals">("my");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedRequestForApproval, setSelectedRequestForApproval] =
    useState<BorrowingRequest | null>(null);
  const [selectedRequestForReturn, setSelectedRequestForReturn] =
    useState<BorrowingRequest | null>(null);

  const getStatusBadge = (status: BorrowingStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">{t("status.pending")}</Badge>;
      case "borrowed":
      case "approved":
        return <Badge variant="info">{t("status.borrowed")}</Badge>;
      case "returned":
        return <Badge variant="success">{t("status.returned")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("status.rejected")}</Badge>;
      case "overdue":
        return <Badge variant="destructive">{t("status.overdue")}</Badge>;
      case "cancelled":
        return <Badge variant="outline">{t("status.cancelled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLoanProgress = (item: BorrowingRequest) => {
    if (item.status !== "borrowed") return null;

    const start = new Date(item.borrow_date).getTime();
    const target = new Date(item.expected_return_date).getTime();
    const today = new Date().getTime();

    const totalDurationMs = Math.max(1, target - start);
    const elapsedMs = today - start;

    const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    const progressPct = Math.min(
      100,
      Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)),
    );

    return { daysRemaining, progressPct };
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsRequestDialogOpen(true)}
            className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.requestBorrowing")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.totalBorrowings")}
            </span>
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{statistics.total}</div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.pendingApprovals")}
            </span>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold text-warning">
            {statistics.pending}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.activeLoans")}
            </span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {statistics.active}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.completedLoans")}
            </span>
            <Check className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-success">
            {statistics.returned}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "my" | "approvals")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="my" className="cursor-pointer">
              {t("tabs.myBorrowings")}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="cursor-pointer relative">
              {t("tabs.pendingApprovals")}
              {pendingApprovals.length > 0 && (
                <span className="ml-2 rounded-full bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 font-bold">
                  {pendingApprovals.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("actions.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {activeTab === "my" && (
              <Select
                value={statusFilter}
                onValueChange={(val) =>
                  setStatusFilter(val as BorrowingStatus | "all")
                }
              >
                <SelectTrigger className="w-[160px] cursor-pointer">
                  <SelectValue placeholder={t("actions.filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">Semua Status</SelectItem>
                  <SelectItem value="pending" className="cursor-pointer">Pending</SelectItem>
                  <SelectItem value="borrowed" className="cursor-pointer">Dipinjam</SelectItem>
                  <SelectItem value="returned" className="cursor-pointer">Dikembalikan</SelectItem>
                  <SelectItem value="rejected" className="cursor-pointer">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tab 1: My Borrowings */}
        <TabsContent value="my" className="space-y-4">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.requestCode")}</TableHead>
                  <TableHead>{t("table.assetName")}</TableHead>
                  <TableHead>Periode & Progress Deadline</TableHead>
                  <TableHead>{t("table.purpose")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      Belum ada riwayat peminjaman aset.
                    </TableCell>
                  </TableRow>
                ) : (
                  borrowings.map((item) => {
                    const asset = getAssetById(item.asset_id);
                    const loanProgress = getLoanProgress(item);

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => router.push(`/hrd/office-assets/${item.asset_id}`)}
                        >
                          {item.request_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {asset?.image_url && (
                              <img
                                src={asset.image_url}
                                alt={item.asset_name}
                                className="h-8 w-10 rounded object-cover border shrink-0 bg-muted"
                              />
                            )}
                            <div>
                              <div className="font-medium">{item.asset_name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {item.asset_code}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{item.borrow_date}</span>
                              <span className="text-muted-foreground">s/d</span>
                              <span>{item.expected_return_date}</span>
                            </div>

                            {/* Loan Progress / Countdown */}
                            {loanProgress && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">Status Target:</span>
                                  {loanProgress.daysRemaining < 0 ? (
                                    <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                                      Terlambat {Math.abs(loanProgress.daysRemaining)} hari (Past Due)
                                    </Badge>
                                  ) : loanProgress.daysRemaining === 0 ? (
                                    <Badge variant="warning" className="px-1 py-0 text-[10px]">
                                      Hari ini deadline!
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="px-1 py-0 text-[10px] text-primary border-primary/30">
                                      Sisa {loanProgress.daysRemaining} hari
                                    </Badge>
                                  )}
                                </div>
                                <Progress value={loanProgress.progressPct} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {item.purpose}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/hrd/office-assets/${item.asset_id}`)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.viewDetail")}
                              </DropdownMenuItem>
                              {item.status === "borrowed" && (
                                <DropdownMenuItem
                                  onClick={() => setSelectedRequestForReturn(item)}
                                  className="cursor-pointer text-success focus:text-success"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  {t("actions.returnAsset")}
                                </DropdownMenuItem>
                              )}
                              {item.status === "pending" && (
                                <DropdownMenuItem
                                  onClick={() => handleCancelRequest(item.id)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  {t("actions.cancel")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            pageIndex={page}
            pageSize={pageSize}
            rowCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </TabsContent>

        {/* Tab 2: Approval Peminjaman */}
        <TabsContent value="approvals" className="space-y-4">
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.requestCode")}</TableHead>
                  <TableHead>{t("table.assetName")}</TableHead>
                  <TableHead>{t("table.borrower")}</TableHead>
                  <TableHead>{t("table.department")}</TableHead>
                  <TableHead>{t("table.borrowDate")}</TableHead>
                  <TableHead>{t("table.expectedReturn")}</TableHead>
                  <TableHead>{t("table.purpose")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      Tidak ada pengajuan peminjaman aset yang menunggu approval.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingApprovals.map((item) => {
                    const asset = getAssetById(item.asset_id);

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => router.push(`/hrd/office-assets/${item.asset_id}`)}
                        >
                          {item.request_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {asset?.image_url && (
                              <img
                                src={asset.image_url}
                                alt={item.asset_name}
                                className="h-8 w-10 rounded object-cover border shrink-0 bg-muted"
                              />
                            )}
                            <div>
                              <div className="font-medium">{item.asset_name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {item.asset_code}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.borrower_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.borrower_department}</TableCell>
                        <TableCell className="text-xs">{item.borrow_date}</TableCell>
                        <TableCell className="text-xs">{item.expected_return_date}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{item.purpose}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => setSelectedRequestForApproval(item)}
                            className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md transition-all duration-300 text-xs"
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialogs */}
      <BorrowingRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSubmit={handleCreateBorrowing}
        availableAssets={rawAssets}
      />

      <ApprovalDialog
        open={!!selectedRequestForApproval}
        onClose={() => setSelectedRequestForApproval(null)}
        request={selectedRequestForApproval}
        onSubmit={handleApproveReject}
      />

      <ReturnAssetDialog
        open={!!selectedRequestForReturn}
        onClose={() => setSelectedRequestForReturn(null)}
        request={selectedRequestForReturn}
        onSubmit={handleReturnAsset}
      />
    </div>
  );
}
