"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { MoreHorizontal, FileSpreadsheet, Download, Eye, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onSelectRun?: (run: PayrollRunRecord) => void;
  onOpenFullList?: () => void;
}

export function PayrollRunTable({ runs, onSelectRun, onOpenFullList }: PayrollRunTableProps) {
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
            <Badge variant="warning" className="text-xs font-medium">
              <Clock className="h-3 w-3 mr-1" />
              {t("status.inProgress")}
            </Badge>
          ) : (
            <Badge variant="success" className="text-xs font-medium">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("status.completed")}
            </Badge>
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
                  onSelectRun?.(row);
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
    <Card className="h-full border border-border/60 bg-card transition-all duration-200 hover:shadow-sm">
      <div>
        <CardHeader className="flex flex-row items-center justify-between px-6 pb-3 pt-4">
          <CardTitle className="text-base font-bold text-foreground">
            {t("list.title")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFullList}
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
            onRowClick={(row) => router.push(`/hrd/payroll/${row.id}`)}
            emptyMessage={t("list.empty") ?? "No payroll runs found"}
            outerClassName="border-0 rounded-none shadow-none"
          />
        </CardContent>
      </div>
    </Card>
  );
}
