"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { MoreHorizontal, FileSpreadsheet, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollRunTableProps {
  runs: PayrollRunRecord[];
  onSelectRun: (run: PayrollRunRecord) => void;
}

export function PayrollRunTable({ runs, onSelectRun }: PayrollRunTableProps) {
  const t = useTranslations("payroll");
  const router = useRouter();

  const handleExportCsv = (period: string) => {
    toast.success(`Ekspor data payroll CSV periode ${period} berhasil.`);
  };

  const handleExportBank = (period: string) => {
    toast.success(`File transfer bank periode ${period} berhasil diunduh.`);
  };

  const columns: Column<PayrollRunRecord>[] = useMemo(
    () => [
      {
        id: "period",
        header: t("list.columns.period"),
        className: "ps-6",
        accessor: (row) => (
          <Link
            href={`/hrd/payroll/${row.id}`}
            className="font-bold text-foreground text-xs hover:underline cursor-pointer text-left block"
          >
            {row.period}
          </Link>
        ),
      },
      {
        id: "processedDate",
        header: t("list.columns.processedDate"),
        accessor: (row) => (
          <span className="text-muted-foreground text-xs font-medium">{row.processedDate}</span>
        ),
      },
      {
        id: "totalEmployees",
        header: t("list.columns.totalEmployees"),
        accessor: (row) => (
          <span className="font-semibold text-foreground text-xs">{row.totalEmployees}</span>
        ),
      },
      {
        id: "totalPayroll",
        header: t("list.columns.totalPayroll"),
        accessor: (row) => (
          <span className="font-bold text-foreground text-xs tabular-nums">
            {formatCurrency(row.totalPayroll)}
          </span>
        ),
      },
      {
        id: "status",
        header: t("list.columns.status"),
        accessor: (row) =>
          row.status === "In Progress" ? (
            <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning tabular-nums">
              {t("status.inProgress")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success tabular-nums">
              {t("status.completed")}
            </span>
          ),
      },
      {
        id: "processedBy",
        header: t("list.columns.processedBy"),
        accessor: (row) => (
          <span className="text-muted-foreground text-xs">{row.processedBy}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        className: "pe-6 text-right",
        accessor: (row) => (
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
                  onSelectRun(row);
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
        ),
      },
    ],
    [t, router, onSelectRun],
  );

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between px-6 pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            {t("list.title")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Menampilkan seluruh riwayat penggajian payroll.")}
            className="cursor-pointer h-8 text-xs"
          >
            {t("actions.viewAll")}
          </Button>
        </CardHeader>

        <CardContent className="p-0 pb-3">
          <DataTable
            columns={columns}
            data={runs}
            isLoading={false}
            emptyMessage={t("list.empty") ?? "No payroll runs found"}
            outerClassName="border-0 rounded-none shadow-none"
          />
        </CardContent>
      </div>
    </Card>
  );
}

