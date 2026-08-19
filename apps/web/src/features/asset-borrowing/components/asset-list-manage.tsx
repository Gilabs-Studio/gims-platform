"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
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
  Box,
  Laptop,
  Car,
  Video,
  Cpu,
  Briefcase,
  Layers,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useAssets } from "../hooks/use-assets";
import { useAssetBorrowings } from "../hooks/use-asset-borrowings";
import { BorrowingRequestDialog } from "./borrowing-request-dialog";
import type { AssetItem, AssetCategory, AssetItemStatus } from "../types";
import { cn } from "@/lib/utils";

export function AssetListManage() {
  const t = useTranslations("assetBorrowing");
  const router = useRouter();

  const {
    assets,
    rawAssets,
    totalCount,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useAssets();

  const { handleCreateBorrowing } = useAssetBorrowings();

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedAssetForRequest, setSelectedAssetForRequest] = useState<
    AssetItem | undefined
  >();

  // Category counts for interactive cards
  const categoryCounts = {
    all: rawAssets.length,
    electronics: rawAssets.filter((a) => a.category === "electronics").length,
    vehicles: rawAssets.filter((a) => a.category === "vehicles").length,
    audio_visual: rawAssets.filter((a) => a.category === "audio_visual").length,
    it_hardware: rawAssets.filter((a) => a.category === "it_hardware").length,
    office_equipment: rawAssets.filter((a) => a.category === "office_equipment").length,
  };

  const getStatusBadge = (status: AssetItemStatus) => {
    switch (status) {
      case "available":
        return <Badge variant="success">{t("status.available")}</Badge>;
      case "borrowed":
        return <Badge variant="info">{t("status.borrowed")}</Badge>;
      case "maintenance":
        return <Badge variant="warning">{t("status.maintenance")}</Badge>;
      case "disposed":
        return <Badge variant="destructive">{t("status.disposed")}</Badge>;
    }
  };

  const getConditionBadge = (condition: AssetItem["condition"]) => {
    switch (condition) {
      case "excellent":
        return <span className="text-xs font-semibold text-success">Sangat Baik</span>;
      case "good":
        return <span className="text-xs font-medium text-foreground">Baik</span>;
      case "fair":
        return <span className="text-xs font-medium text-muted-foreground">Cukup</span>;
      case "damaged":
      case "under_repair":
        return <span className="text-xs font-semibold text-destructive">Rusak / Servis</span>;
    }
  };

  // Helper to calculate loan countdown & progress
  const getLoanProgressInfo = (borrower?: AssetItem["current_borrower"]) => {
    if (!borrower) return null;

    const start = new Date(borrower.borrowed_at).getTime();
    const target = new Date(borrower.expected_return).getTime();
    const today = new Date().getTime();

    const totalDurationMs = Math.max(1, target - start);
    const elapsedMs = today - start;

    const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    const progressPct = Math.min(
      100,
      Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)),
    );

    return {
      daysRemaining,
      progressPct,
      borrowedAt: borrower.borrowed_at,
      expectedReturn: borrower.expected_return,
    };
  };

  const handleOpenBorrowDialog = (asset?: AssetItem) => {
    setSelectedAssetForRequest(asset);
    setIsRequestDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("manageTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("manageSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenBorrowDialog()}
            className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.requestBorrowing")}
          </Button>
        </div>
      </div>

      {/* Interactive Category Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* All Categories */}
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "all"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Semua</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.all}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Total Aset</span>
        </button>

        {/* Electronics */}
        <button
          type="button"
          onClick={() => setCategoryFilter("electronics")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "electronics"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Elektronik</span>
            <Laptop className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.electronics}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Laptop & Tablet</span>
        </button>

        {/* Vehicles */}
        <button
          type="button"
          onClick={() => setCategoryFilter("vehicles")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "vehicles"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Kendaraan</span>
            <Car className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.vehicles}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Mobil Operasional</span>
        </button>

        {/* Audio Visual */}
        <button
          type="button"
          onClick={() => setCategoryFilter("audio_visual")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "audio_visual"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Audio Visual</span>
            <Video className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.audio_visual}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Kamera & Proyektor</span>
        </button>

        {/* IT Hardware */}
        <button
          type="button"
          onClick={() => setCategoryFilter("it_hardware")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "it_hardware"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Perangkat IT</span>
            <Cpu className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.it_hardware}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Scanner & Perangkat</span>
        </button>

        {/* Office Equipment */}
        <button
          type="button"
          onClick={() => setCategoryFilter("office_equipment")}
          className={cn(
            "flex flex-col justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
            categoryFilter === "office_equipment"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
              : "bg-card hover:bg-muted/50 text-foreground",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium opacity-80">Perlengkapan</span>
            <Briefcase className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-bold">{categoryCounts.office_equipment}</div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Peralatan Kantor</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("actions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              setStatusFilter(val as AssetItemStatus | "all")
            }
          >
            <SelectTrigger className="w-[160px] cursor-pointer">
              <SelectValue placeholder={t("actions.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Semua Status</SelectItem>
              <SelectItem value="available" className="cursor-pointer">Tersedia</SelectItem>
              <SelectItem value="borrowed" className="cursor-pointer">Dipinjam</SelectItem>
              <SelectItem value="maintenance" className="cursor-pointer">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.assetName")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>{t("table.location")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.condition")}</TableHead>
              <TableHead>{t("table.borrower")}</TableHead>
              <TableHead>Deadline & Progress Pinjam</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  Tidak ada aset kantor yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => {
                const loanInfo = getLoanProgressInfo(asset.current_borrower);

                return (
                  <TableRow
                    key={asset.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/hrd/office-assets/${asset.id}`)}
                  >
                    {/* Asset Name + Image Thumbnail */}
                    <TableCell className="font-medium text-primary hover:underline">
                      <div className="flex items-center gap-3">
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="h-10 w-12 rounded-md object-cover border shrink-0 bg-muted"
                        />
                        <div>
                          <div className="font-semibold text-foreground hover:text-primary">
                            {asset.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{asset.code}</span>
                            <span>•</span>
                            <span>SN: {asset.serial_number}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t(`categories.${asset.category}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {asset.location}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{getConditionBadge(asset.condition)}</TableCell>

                    {/* Borrower */}
                    <TableCell>
                      {asset.current_borrower ? (
                        <div className="text-xs">
                          <p className="font-medium">{asset.current_borrower.employee_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {asset.current_borrower.department}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Deadline Progress / Countdown Visual */}
                    <TableCell>
                      {asset.status === "borrowed" && loanInfo ? (
                        <div className="space-y-1.5 min-w-[180px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {loanInfo.expectedReturn}
                            </span>
                            {loanInfo.daysRemaining < 0 ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                                Terlambat {Math.abs(loanInfo.daysRemaining)} hari (Past Due)
                              </Badge>
                            ) : loanInfo.daysRemaining === 0 ? (
                              <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                                Hari ini deadline!
                              </Badge>
                            ) : loanInfo.daysRemaining === 1 ? (
                              <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                                Sisa 1 hari
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-primary border-primary/30">
                                Sisa {loanInfo.daysRemaining} hari
                              </Badge>
                            )}
                          </div>
                          <Progress value={loanInfo.progressPct} className="h-1.5" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/hrd/office-assets/${asset.id}`)
                            }
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.viewDetail")}
                          </DropdownMenuItem>
                          {asset.status === "available" && (
                            <DropdownMenuItem
                              onClick={() => handleOpenBorrowDialog(asset)}
                              className="cursor-pointer text-primary focus:text-primary"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("actions.requestBorrowing")}
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

      {/* Pagination */}
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

      {/* Form Dialog */}
      <BorrowingRequestDialog
        open={isRequestDialogOpen}
        onClose={() => setIsRequestDialogOpen(false)}
        onSubmit={handleCreateBorrowing}
        availableAssets={rawAssets}
        selectedAssetId={selectedAssetForRequest?.id}
      />
    </div>
  );
}
