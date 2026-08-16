"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontal, FileSpreadsheet, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollRunTableProps {
  runs: PayrollRunRecord[];
  onSelectRun: (run: PayrollRunRecord) => void;
}

export function PayrollRunTable({ runs, onSelectRun }: PayrollRunTableProps) {
  const t = useTranslations("payroll");

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-bold text-foreground">
          {t("list.title")}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer h-8 text-xs"
        >
          {t("actions.viewAll")}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto border-t border-border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold">{t("list.columns.period")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("list.columns.processedDate")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("list.columns.totalEmployees")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("list.columns.totalPayroll")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("list.columns.status")}</TableHead>
                <TableHead className="text-xs font-semibold">{t("list.columns.processedBy")}</TableHead>
                <TableHead className="w-[50px] text-xs font-semibold"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const isInProgress = run.status === "In Progress";
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => onSelectRun(run)}
                  >
                    <TableCell className="font-semibold text-foreground text-xs">
                      {run.period}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {run.processedDate}
                    </TableCell>
                    <TableCell className="text-foreground text-xs font-medium">
                      {run.totalEmployees}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs">
                      {formatCurrency(run.totalPayroll)}
                    </TableCell>
                    <TableCell>
                      {isInProgress ? (
                        <Badge variant="info">
                          {t("status.inProgress")}
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          {t("status.completed")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {run.processedBy}
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
                            onClick={() => onSelectRun(run)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t("actions.viewDetail")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2 text-xs">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            {t("actions.exportCsv")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2 text-xs">
                            <Download className="h-3.5 w-3.5 text-primary" />
                            {t("actions.exportBank")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
