"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  GitPullRequest,
  Download,
  FileSpreadsheet,
  Trash2,
  Search,
  Eye,
  Building2,
  User,
  Calendar,
  CreditCard,
  Check,
  ShieldCheck,
  MoreVertical,
  Layers,
  FileText,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMotion } from "@/components/motion";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { usePayrollRunDetail } from "../hooks/usePayroll";
import { PayrollPayslipModal } from "./payroll-payslip-modal";
import { PayrollStageModal } from "./payroll-stage-modal";
import type { EmployeePayslipItem, PayrollStatus, PayrollAuditLog } from "../types/payroll.types";

interface PayrollDetailPageProps {
  runId: string;
}

export function PayrollDetailPage({ runId }: PayrollDetailPageProps) {
  const tDetail = useTranslations("payroll.detail");

  const { detail, isLoading, isError, refetch } = usePayrollRunDetail(runId);

  const [currentStatus, setCurrentStatus] = useState<PayrollStatus>("In Progress");
  const [selectedPayslip, setSelectedPayslip] = useState<EmployeePayslipItem | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeStatus = detail?.status ?? currentStatus;

  const filteredPayslips = useMemo(() => {
    const list = detail?.payslips ?? [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (p: EmployeePayslipItem) =>
        p.employeeName.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q)
    );
  }, [detail?.payslips, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-foreground">Gagal memuat detail payroll</h3>
        <p className="text-xs text-muted-foreground">ID payroll {runId} tidak ditemukan atau terjadi kesalahan server.</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Coba Lagi
        </Button>
      </div>
    );
  }

  const handleRecalculate = () => {
    toast.success(tDetail("recalculateToast"));
  };

  const handleApprove = () => {
    setCurrentStatus("Approved");
    toast.success(tDetail("approvedToast", { period: detail.period }));
  };

  const handleExportBank = () => {
    toast.success(tDetail("exportedBankToast"));
  };

  const handleExportCsv = () => {
    toast.success(tDetail("exportedCsvToast"));
  };

  const handleDeleteRun = () => {
    toast.error(`Payroll periode ${detail.period} dibatalkan.`);
  };

  return (
    <PageMotion className="space-y-6">
      {/* 1. Header Navigation & Control (CRM Reference Header) */}
      <div className="space-y-4 border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link href="/hrd/payroll">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-md cursor-pointer text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {tDetail("payrollRunTitle", { period: detail.period })}
                </h1>
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    activeStatus === "Completed"
                      ? "bg-success/15 text-success"
                      : activeStatus === "Approved"
                      ? "bg-primary/15 text-primary"
                      : activeStatus === "Under Review"
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {activeStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span className="font-mono">ID: {detail.id}</span>
                <span>•</span>
                <span>Ref: PR-MONTHLY-2026</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  PT DIGITAL NUSANTARA
                </span>
              </div>
            </div>
          </div>

          {/* Top Right Action Buttons (CRM Reference Style) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStageModalOpen(true)}
              className="cursor-pointer text-xs gap-1.5 h-9"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-primary" />
              {tDetail("moveStage")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              className="cursor-pointer text-xs gap-1.5 h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {tDetail("recalculate")}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              className="cursor-pointer text-xs gap-1.5 h-9"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {tDetail("approve")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 cursor-pointer text-muted-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleExportBank}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  {tDetail("exportBank")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCsv}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {tDetail("exportCsv")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteRun}
                  className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {tDetail("deleteRun")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards Grid (CRM Stat Grid) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {tDetail("metrics.grossPayroll")}
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {formatCurrency(detail.grossPayroll)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total penerimaan gaji & tunjangan
          </p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {tDetail("metrics.eligibleEmployees")}
          </span>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {detail.totalEmployees} Karyawan
          </div>
          <p className="text-[11px] text-success font-medium flex items-center gap-1">
            <Check className="h-3 w-3" /> 100% Aktif & Terverifikasi
          </p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {tDetail("metrics.totalDeductions")}
          </span>
          <div className="text-xl font-bold text-destructive tabular-nums">
            {formatCurrency(detail.totalTax + detail.totalBpjsEmployee)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            PPh 21 TER + Iuran BPJS Karyawan
          </p>
        </Card>

        <Card className="p-4 space-y-1 border-primary/30 bg-primary/5">
          <span className="text-xs font-bold text-primary">
            {tDetail("metrics.netPayroll")}
          </span>
          <div className="text-xl font-bold text-primary tabular-nums">
            {formatCurrency(detail.netPayroll)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total disburse transfer bank
          </p>
        </Card>
      </div>

      {/* 3. Main 2-Column Section (CRM Layout: Left 2 Cols, Right 1 Col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Main Tabs & Overview) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Minimalist Clean Notes/Overview Card (Only renders if note exists) */}
          {detail.notes ? (
            <Card className="px-6 py-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                {tDetail("sections.notesTitle")}
              </span>
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {detail.notes}
              </p>
            </Card>
          ) : null}

          {/* Main Tabbed Area */}
          <Tabs defaultValue="payslips" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto border-b rounded-none bg-transparent p-0 h-auto gap-4">
              <TabsTrigger
                value="payslips"
                className="rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary cursor-pointer gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                {tDetail("tabs.payslips", { count: detail.payslips.length })}
              </TabsTrigger>
              <TabsTrigger
                value="breakdown"
                className="rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary cursor-pointer gap-2"
              >
                <Layers className="h-3.5 w-3.5" />
                {tDetail("tabs.breakdown")}
              </TabsTrigger>
              <TabsTrigger
                value="taxes"
                className="rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary cursor-pointer gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {tDetail("tabs.taxes")}
              </TabsTrigger>
              <TabsTrigger
                value="bank"
                className="rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary cursor-pointer gap-2"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {tDetail("tabs.bankDistribution")}
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary cursor-pointer gap-2"
              >
                <History className="h-3.5 w-3.5" />
                {tDetail("tabs.auditLog")}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Employee Payslips Table */}
            <TabsContent value="payslips" className="pt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tDetail("employeeTable.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9 text-xs h-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="cursor-pointer text-xs gap-1.5 h-9"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Ekspor Teks Payslip
                </Button>
              </div>

              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">{tDetail("employeeTable.employee")}</th>
                      <th className="py-2.5 px-3">{tDetail("employeeTable.position")}</th>
                      <th className="py-2.5 px-3 text-right">{tDetail("employeeTable.basicSalary")}</th>
                      <th className="py-2.5 px-3 text-right">{tDetail("employeeTable.allowances")}</th>
                      <th className="py-2.5 px-3 text-right">{tDetail("employeeTable.deductions")}</th>
                      <th className="py-2.5 px-3 text-right">{tDetail("employeeTable.netPay")}</th>
                      <th className="py-2.5 px-3 text-center">{tDetail("employeeTable.status")}</th>
                      <th className="py-2.5 px-3 text-right">{tDetail("employeeTable.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPayslips.map((p: EmployeePayslipItem) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div>{p.employeeName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{p.nip}</div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <div>{p.position}</div>
                          <div className="text-[10px]">{p.department}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {formatCurrency(p.basicSalary)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-success font-medium">
                          +{formatCurrency(p.allowances + p.overtime)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-destructive font-medium">
                          -{formatCurrency(p.taxPph21 + p.bpjsEmployee + p.deductions)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">
                          {formatCurrency(p.netPay)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center rounded bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPayslip(p)}
                            className="cursor-pointer text-xs text-primary hover:text-primary/80 h-7 px-2 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {tDetail("employeeTable.viewPayslip")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 2: Component Breakdown */}
            <TabsContent value="breakdown" className="pt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Rincian Distribusi Komponen Gaji</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-semibold text-foreground">Gaji Pokok Karyawan</span>
                      <span className="font-bold tabular-nums">{formatCurrency(895450000)} (71.2%)</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-semibold text-foreground">Tunjangan Jabatan & Operasional</span>
                      <span className="font-bold tabular-nums text-success">+{formatCurrency(189230000)} (15.1%)</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-semibold text-foreground">Uang Lembur (Overtime)</span>
                      <span className="font-bold tabular-nums text-warning">+{formatCurrency(72650000)} (5.8%)</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-semibold text-foreground">Bonus & Insentif Performa</span>
                      <span className="font-bold tabular-nums text-purple-600">+{formatCurrency(48100000)} (3.8%)</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-bold text-sm">
                      <span>Total Gross Payroll</span>
                      <span className="text-primary tabular-nums">{formatCurrency(detail.grossPayroll)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Taxes & BPJS Compliance */}
            <TabsContent value="taxes" className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 space-y-2 border-l-4 border-l-primary">
                  <span className="text-xs font-bold text-foreground">Kewajiban PPh 21 TER 2024</span>
                  <div className="text-lg font-bold text-foreground tabular-nums">
                    {formatCurrency(detail.totalTax)}
                  </div>
                  <p className="text-xs text-muted-foreground">Dihitung otomatis mengacu pada skema Tarif Efektif Rata-rata (TER A/B/C).</p>
                </Card>

                <Card className="p-4 space-y-2 border-l-4 border-l-success">
                  <span className="text-xs font-bold text-foreground">Total BPJS (Perusahaan + Karyawan)</span>
                  <div className="text-lg font-bold text-foreground tabular-nums">
                    {formatCurrency(detail.totalBpjsCompany + detail.totalBpjsEmployee)}
                  </div>
                  <p className="text-xs text-muted-foreground">BPJS Health: {formatCurrency(45230000)} • BPJS TK: {formatCurrency(67890000)}</p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: Bank Distribution */}
            <TabsContent value="bank" className="pt-4 space-y-4">
              <Card className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h4 className="font-bold text-foreground">{detail.bankBatch.bankName}</h4>
                    <p className="text-muted-foreground">No. Rekening Giro: <span className="font-mono text-foreground font-semibold">{detail.bankBatch.accountNumber}</span></p>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                    {detail.bankBatch.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block">Pemilik Rekening</span>
                    <span className="font-bold text-foreground">{detail.bankBatch.accountHolder}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Kode Batch Transfer</span>
                    <span className="font-mono font-bold text-foreground">{detail.bankBatch.batchReference}</span>
                  </div>
                </div>

                <Button
                  onClick={handleExportBank}
                  className="w-full cursor-pointer text-xs gap-2"
                >
                  <Download className="h-4 w-4" />
                  Unduh Batch File Bank (BCA Corporate Format)
                </Button>
              </Card>
            </TabsContent>

            {/* TAB 5: Audit Log & History */}
            <TabsContent value="audit" className="pt-4 space-y-4">
              <Card className="p-4 space-y-4 text-xs">
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {detail.auditLogs.map((log: PayrollAuditLog) => (
                    <div key={log.id} className="relative pl-8 space-y-1">
                      <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{log.user} ({log.role})</span>
                        <span className="text-[11px] text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <p className="text-foreground">{log.action}</p>
                      {log.notes && (
                        <p className="text-muted-foreground italic bg-muted/40 p-2 rounded text-[11px]">{log.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (CRM Side Cards / Metadata Sidebar) */}
        <div className="space-y-6">
          {/* Approvers Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {tDetail("sections.approversTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">{tDetail("sections.reviewedBy")}</span>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{detail.reviewedBy}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{detail.reviewedAt}</span>
              </div>

              <div className="border-t pt-2 space-y-1">
                <span className="text-muted-foreground block">{tDetail("sections.approvedBy")}</span>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <span className="font-semibold text-foreground">{detail.approvedBy}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{detail.approvedAt}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {tDetail("sections.bankTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block">{tDetail("sections.sourceBank")}</span>
                <span className="font-semibold text-foreground">{detail.bankBatch.bankName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{tDetail("sections.accountNo")}</span>
                <span className="font-mono font-bold text-foreground">{detail.bankBatch.accountNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{tDetail("sections.batchRef")}</span>
                <span className="font-mono text-muted-foreground">{detail.bankBatch.batchReference}</span>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Checklist Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {tDetail("sections.complianceTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>{tDetail("sections.pph21Status")}</span>
                <span className="text-success font-bold">Terverifikasi</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{tDetail("sections.bpjsEdabuStatus")}</span>
                <span className="text-success font-bold">Tersinkron</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{tDetail("sections.bankBatchStatus")}</span>
                <span className="text-success font-bold">Valid</span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card (Moved to bottom as requested) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {tDetail("sections.metadataTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {tDetail("sections.cutoffPeriod")}
                </span>
                <span className="font-semibold text-foreground">{detail.cutoffPeriod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  {tDetail("sections.paymentDate")}
                </span>
                <span className="font-bold text-primary">{detail.paymentDate}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payslip & Stage Modals */}
      <PayrollPayslipModal
        payslip={selectedPayslip}
        period={detail.period}
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />

      <PayrollStageModal
        currentStatus={activeStatus}
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onUpdateStage={(newStatus) => setCurrentStatus(newStatus)}
      />
    </PageMotion>
  );
}
