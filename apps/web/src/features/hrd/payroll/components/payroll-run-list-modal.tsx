"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Search, Plus, Download, Eye, FileSpreadsheet, MoreHorizontal, Layers, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollRunListModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: PayrollRunRecord[];
  onOpenRunModal?: () => void;
}

export function PayrollRunListModal({
  isOpen,
  onClose,
  runs,
  onOpenRunModal,
}: PayrollRunListModalProps) {
  const t = useTranslations("payroll");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter runs based on search & status filter
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchSearch =
        search === "" ||
        run.period.toLowerCase().includes(search.toLowerCase()) ||
        run.processedBy.toLowerCase().includes(search.toLowerCase()) ||
        run.id.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        run.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [runs, search, statusFilter]);

  // Paginated subset
  const paginatedRuns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, page, pageSize]);

  const handleExportCsv = (period: string) => {
    toast.success(`Ekspor data payroll CSV periode ${period} berhasil.`);
  };

  const handleExportBank = (period: string) => {
    toast.success(`File transfer bank periode ${period} berhasil diunduh.`);
  };

  const handleExportAll = () => {
    toast.success("Ekspor seluruh riwayat payroll CSV berhasil.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="2xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t("list.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kelola, saring, dan tinjau seluruh eksekusi batch penggajian bulanan perusahaan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order-List Styled Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari periode atau pemroses..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44 text-xs cursor-pointer">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs cursor-pointer">
                    Semua Status
                  </SelectItem>
                  <SelectItem value="draft" className="text-xs cursor-pointer">
                    Draft / Persiapan
                  </SelectItem>
                  <SelectItem value="in progress" className="text-xs cursor-pointer">
                    In Progress
                  </SelectItem>
                  <SelectItem value="under review" className="text-xs cursor-pointer">
                    Under Review
                  </SelectItem>
                  <SelectItem value="approved" className="text-xs cursor-pointer">
                    Approved
                  </SelectItem>
                  <SelectItem value="completed" className="text-xs cursor-pointer">
                    Completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                className="cursor-pointer text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Ekspor CSV
              </Button>
              {onOpenRunModal && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenRunModal();
                  }}
                  className="cursor-pointer text-xs gap-1.5 bg-primary text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Run Payroll Baru
                </Button>
              )}
            </div>
          </div>

          {/* Table Container styled like order-list.tsx */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">{t("list.columns.period")}</TableHead>
                  <TableHead className="text-xs">{t("list.columns.processedDate")}</TableHead>
                  <TableHead className="text-xs">{t("list.columns.totalEmployees")}</TableHead>
                  <TableHead className="text-xs">{t("list.columns.totalPayroll")}</TableHead>
                  <TableHead className="text-xs">{t("list.columns.status")}</TableHead>
                  <TableHead className="text-xs">{t("list.columns.processedBy")}</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      {t("list.empty") ?? "Data riwayat payroll tidak ditemukan"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRuns.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => {
                        onClose();
                        router.push(`/hrd/payroll/${row.id}`);
                      }}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <TableCell className="font-bold text-foreground text-xs">
                        {row.period}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.processedDate}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-xs">
                        {row.totalEmployees} Karyawan
                      </TableCell>
                      <TableCell className="font-bold text-foreground text-xs tabular-nums">
                        {formatCurrency(row.totalPayroll)}
                      </TableCell>
                      <TableCell>
                        {row.status === "In Progress" ? (
                          <Badge variant="warning" className="text-xs font-medium">
                            <Clock className="h-3 w-3 mr-1" />
                            {t("status.inProgress")}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("status.completed")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {row.processedBy}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs"
                              onClick={() => {
                                onClose();
                                router.push(`/hrd/payroll/${row.id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("actions.viewDetail")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs"
                              onClick={() => handleExportCsv(row.period)}
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                              {t("actions.exportCsv")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 text-xs"
                              onClick={() => handleExportBank(row.period)}
                            >
                              <Download className="h-3.5 w-3.5 text-primary" />
                              {t("actions.exportBank")}
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

          {/* DataTablePagination styled like order-list.tsx */}
          {filteredRuns.length > 0 && (
            <DataTablePagination
              pageIndex={page}
              pageSize={pageSize}
              rowCount={filteredRuns.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            {t("actions.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
