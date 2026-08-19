"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { PageMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useAssets } from "../hooks/use-assets";
import { useAssetBorrowings } from "../hooks/use-asset-borrowings";
import { useAssetDamage } from "../hooks/use-asset-damage";
import { useAssetMaintenance } from "../hooks/use-asset-maintenance";
import { BorrowingRequestDialog } from "./borrowing-request-dialog";
import { DamageReportDialog } from "./damage-report-dialog";
import { MaintenanceDialog } from "./maintenance-dialog";
import { formatCurrency } from "@/lib/utils";

interface AssetDetailPageProps {
  id: string;
}

export function AssetDetailPage({ id }: AssetDetailPageProps) {
  const t = useTranslations("assetBorrowing");
  const router = useRouter();

  const { getAssetById, rawAssets } = useAssets();
  const { getBorrowingsByAssetId, handleCreateBorrowing } = useAssetBorrowings();
  const { getDamageReportsByAssetId, handleReportDamage } = useAssetDamage();
  const { getMaintenanceByAssetId, handleAddMaintenance } = useAssetMaintenance();

  const asset = getAssetById(id);
  const borrowings = getBorrowingsByAssetId(id);
  const damageReports = getDamageReportsByAssetId(id);
  const maintenanceLogs = getMaintenanceByAssetId(id);

  const [activeTab, setActiveTab] = useState<
    "info" | "history" | "damage" | "maintenance"
  >("info");

  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = useState(false);
  const [isDamageDialogOpen, setIsDamageDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);

  if (!asset) {
    return (
      <PageMotion className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/hrd/office-assets")}
          className="mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.cancel")}
        </Button>
        <div className="rounded-lg border p-8 text-center bg-card">
          <p className="text-muted-foreground">Aset kantor tidak ditemukan.</p>
        </div>
      </PageMotion>
    );
  }

  const getStatusBadge = () => {
    switch (asset.status) {
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

  const getLoanProgress = () => {
    if (asset.status !== "borrowed" || !asset.current_borrower) return null;

    const start = new Date(asset.current_borrower.borrowed_at).getTime();
    const target = new Date(asset.current_borrower.expected_return).getTime();
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

  const loanProgress = getLoanProgress();

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer mt-1 shrink-0"
            onClick={() => router.push("/hrd/office-assets")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Asset Image Thumbnail */}
          <img
            src={asset.image_url}
            alt={asset.name}
            className="h-16 w-20 rounded-lg object-cover border bg-muted shadow-sm shrink-0"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              {getStatusBadge()}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary">{asset.code}</Badge>
              <Badge variant="outline">Finance: {asset.finance_asset_code}</Badge>
              <Badge variant="outline" className="capitalize">
                {t(`categories.${asset.category}`)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {asset.status === "available" && (
            <Button
              onClick={() => setIsBorrowDialogOpen(true)}
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.requestBorrowing")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsDamageDialogOpen(true)}
            className="cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t("actions.reportDamage")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsMaintenanceDialogOpen(true)}
            className="cursor-pointer"
          >
            <Wrench className="h-4 w-4 mr-2" />
            {t("actions.addMaintenance")}
          </Button>
        </div>
      </div>

      {/* Top 4 Key Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.totalBorrowings")}
            </span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{borrowings.length} Kali</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Total frekuensi peminjaman aset ini
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.availableAssets")}
            </span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold capitalize">
            {asset.status === "available" ? "Tersedia" : "Dipinjam / Servis"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Status ketersediaan saat ini
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Total Perawatan / Servis
            </span>
            <Wrench className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold">{maintenanceLogs.length} Kali</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Catatan maintenance & servis
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {t("stats.conditionStatus")}
            </span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold capitalize">
            {asset.condition === "excellent"
              ? "Sangat Baik"
              : asset.condition === "good"
              ? "Baik"
              : "Perlu Servis"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Evaluasi fisik & kelayakan
          </p>
        </div>
      </div>

      {/* Active Loan Countdown & Deadline Alert Banner */}
      {asset.status === "borrowed" && loanProgress && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Aset Sedang Dipinjam oleh {asset.current_borrower?.employee_name}
              </span>
              {loanProgress.daysRemaining < 0 ? (
                <Badge variant="destructive">
                  Terlambat {Math.abs(loanProgress.daysRemaining)} Hari (Past Due)
                </Badge>
              ) : loanProgress.daysRemaining === 0 ? (
                <Badge variant="warning">Hari Ini Deadline Pengembalian</Badge>
              ) : (
                <Badge variant="outline" className="text-primary border-primary/30">
                  Sisa {loanProgress.daysRemaining} Hari
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Periode Peminjaman: {asset.current_borrower?.borrowed_at} s/d{" "}
              {asset.current_borrower?.expected_return}
            </p>
          </div>
          <div className="w-full sm:w-64 space-y-1">
            <div className="flex justify-between text-[11px] font-medium">
              <span>Progress Durasi</span>
              <span>{loanProgress.progressPct}%</span>
            </div>
            <Progress value={loanProgress.progressPct} className="h-2" />
          </div>
        </div>
      )}

      {/* 2/3 + 1/3 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) =>
              setActiveTab(val as "info" | "history" | "damage" | "maintenance")
            }
            className="space-y-4"
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="info" className="cursor-pointer">
                {t("tabs.infoUmum")}
              </TabsTrigger>
              <TabsTrigger value="history" className="cursor-pointer">
                {t("tabs.historyPeminjaman")} ({borrowings.length})
              </TabsTrigger>
              <TabsTrigger value="damage" className="cursor-pointer">
                {t("tabs.kerusakan")} ({damageReports.length})
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="cursor-pointer">
                {t("tabs.maintenance")} ({maintenanceLogs.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Info Umum */}
            <TabsContent value="info" className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex items-center gap-4 border-b pb-3">
                  <img
                    src={asset.image_url}
                    alt={asset.name}
                    className="h-20 w-28 rounded-md object-cover border bg-muted"
                  />
                  <div>
                    <h3 className="text-base font-semibold">{asset.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {asset.code} • Finance: {asset.finance_asset_code}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="font-medium">{asset.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lokasi Fisik</p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Pembelian</p>
                    <p className="font-medium">{asset.purchase_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Garansi Berlaku s/d</p>
                    <p className="font-medium">{asset.warranty_until}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nilai Buku (Finance)</p>
                    <p className="font-medium text-primary">
                      {formatCurrency(asset.book_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Penanggung Jawab / Custodian</p>
                    <p className="font-medium">{asset.custodian ?? "General Affairs"}</p>
                  </div>
                </div>

                {asset.description && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Deskripsi Aset</p>
                    <p className="text-sm mt-1">{asset.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: History Peminjaman */}
            <TabsContent value="history" className="space-y-4">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.requestCode")}</TableHead>
                      <TableHead>{t("table.borrower")}</TableHead>
                      <TableHead>{t("table.borrowDate")}</TableHead>
                      <TableHead>{t("table.expectedReturn")}</TableHead>
                      <TableHead>{t("table.actualReturn")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          Belum ada riwayat peminjaman untuk aset ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      borrowings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.request_number}</TableCell>
                          <TableCell>
                            <p className="font-medium text-xs">{b.borrower_name}</p>
                            <p className="text-[11px] text-muted-foreground">{b.borrower_department}</p>
                          </TableCell>
                          <TableCell className="text-xs">{b.borrow_date}</TableCell>
                          <TableCell className="text-xs">{b.expected_return_date}</TableCell>
                          <TableCell className="text-xs">{b.actual_return_date ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[11px]">
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: Kerusakan */}
            <TabsContent value="damage" className="space-y-4">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Laporan</TableHead>
                      <TableHead>{t("table.reportedBy")}</TableHead>
                      <TableHead>{t("table.reportedDate")}</TableHead>
                      <TableHead>{t("table.severity")}</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {damageReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          Tidak ada laporan kerusakan aset.
                        </TableCell>
                      </TableRow>
                    ) : (
                      damageReports.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.report_number}</TableCell>
                          <TableCell className="text-xs">{d.reported_by_name}</TableCell>
                          <TableCell className="text-xs">{d.reported_date}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.severity === "critical" || d.severity === "high"
                                  ? "destructive"
                                  : "warning"
                              }
                              className="capitalize text-[10px]"
                            >
                              {d.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{d.description}</TableCell>
                          <TableCell className="text-xs capitalize font-medium">{d.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 4: Maintenance */}
            <TabsContent value="maintenance" className="space-y-4">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Servis</TableHead>
                      <TableHead>{t("table.serviceType")}</TableHead>
                      <TableHead>{t("table.maintenanceDate")}</TableHead>
                      <TableHead>{t("table.vendor")}</TableHead>
                      <TableHead>{t("table.cost")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          Belum ada catatan maintenance untuk aset ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenanceLogs.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.maintenance_number}</TableCell>
                          <TableCell className="text-xs capitalize">{m.service_type.replace("_", " ")}</TableCell>
                          <TableCell className="text-xs">{m.maintenance_date}</TableCell>
                          <TableCell className="text-xs">{m.vendor_name}</TableCell>
                          <TableCell className="text-xs font-semibold text-primary">
                            {formatCurrency(m.cost)}
                          </TableCell>
                          <TableCell className="text-xs capitalize font-medium">{m.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (1/3 width): Sidebar Info Cards */}
        <div className="space-y-6">
          {/* Current Borrower Status Card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-base font-semibold border-b pb-2">
              Status Peminjam Terkini
            </h3>
            {asset.current_borrower ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Peminjam</p>
                    <p className="font-semibold">{asset.current_borrower.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Departemen</p>
                    <p className="font-medium">{asset.current_borrower.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Periode Pinjam</p>
                    <p className="text-xs font-medium">
                      {asset.current_borrower.borrowed_at} s/d {asset.current_borrower.expected_return}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-1 opacity-80" />
                <p className="text-sm font-medium">Aset Sedang Tidak Dipinjam</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tersedia di lokasi {asset.location}
                </p>
              </div>
            )}
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="text-base font-semibold border-b pb-2">
              Ringkasan Aset
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kode Finance</span>
                <span className="font-mono font-medium">{asset.finance_asset_code}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kategori</span>
                <span className="capitalize font-medium">{asset.category}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lokasi Penyimpanan</span>
                <span className="font-medium truncate max-w-[150px]">{asset.location}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Garansi s/d</span>
                <span className="font-medium">{asset.warranty_until}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <BorrowingRequestDialog
        open={isBorrowDialogOpen}
        onClose={() => setIsBorrowDialogOpen(false)}
        onSubmit={handleCreateBorrowing}
        availableAssets={rawAssets}
        selectedAssetId={asset.id}
      />

      <DamageReportDialog
        open={isDamageDialogOpen}
        onClose={() => setIsDamageDialogOpen(false)}
        asset={asset}
        onSubmit={handleReportDamage}
      />

      <MaintenanceDialog
        open={isMaintenanceDialogOpen}
        onClose={() => setIsMaintenanceDialogOpen(false)}
        asset={asset}
        onSubmit={handleAddMaintenance}
      />
    </PageMotion>
  );
}
