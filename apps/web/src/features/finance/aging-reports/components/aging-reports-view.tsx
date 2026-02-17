"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";

import { useFinanceAPAging, useFinanceARAging } from "../hooks/use-finance-aging-reports";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export function AgingReportsView() {
  const t = useTranslations("financeAgingReports");
  const tCommon = useTranslations("common");

  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [arPage, setArPage] = useState(1);
  const [arPageSize, setArPageSize] = useState(10);
  const [apPage, setApPage] = useState(1);
  const [apPageSize, setApPageSize] = useState(10);

  const baseParams = useMemo(
    () => ({
      as_of_date: asOfDate,
      search: debouncedSearch || undefined,
    }),
    [asOfDate, debouncedSearch],
  );

  const arQuery = useFinanceARAging({ ...baseParams, page: arPage, per_page: arPageSize });
  const apQuery = useFinanceAPAging({ ...baseParams, page: apPage, per_page: apPageSize });

  const arRows = arQuery.data?.data?.rows ?? [];
  const apRows = apQuery.data?.data?.rows ?? [];
  const arPagination = arQuery.data?.meta?.pagination;
  const apPagination = apQuery.data?.meta?.pagination;

  const anyError = arQuery.isError || apQuery.isError;

  if (anyError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="as_of_date">{t("fields.asOfDate")}</Label>
          <Input
            id="as_of_date"
            type="date"
            value={asOfDate}
            onChange={(e) => {
              setAsOfDate(e.target.value);
              setArPage(1);
              setApPage(1);
            }}
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>{t("fields.search")}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setArPage(1);
                setApPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("sections.ar")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.code")}</TableHead>
                <TableHead>{t("fields.invoiceNumber")}</TableHead>
                <TableHead>{t("fields.dueDate")}</TableHead>
                <TableHead className="text-right">{t("fields.remaining")}</TableHead>
                <TableHead className="text-right">{t("fields.current")}</TableHead>
                <TableHead className="text-right">{t("fields.days1To30")}</TableHead>
                <TableHead className="text-right">{t("fields.days31To60")}</TableHead>
                <TableHead className="text-right">{t("fields.days61To90")}</TableHead>
                <TableHead className="text-right">{t("fields.over90")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : arRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              ) : (
                arRows.map((r) => (
                  <TableRow key={r.invoice_id}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.invoice_number ?? "-"}</TableCell>
                    <TableCell>{safeDate(r.due_date)}</TableCell>
                    <TableCell className="text-right">{r.remaining_amount ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.current ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_1_30 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_31_60 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_61_90 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.over_90 ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          pageIndex={arPagination?.page ?? arPage}
          pageSize={arPagination?.per_page ?? arPageSize}
          rowCount={arPagination?.total ?? arRows.length}
          onPageChange={setArPage}
          onPageSizeChange={(s) => {
            setArPageSize(s);
            setArPage(1);
          }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("sections.ap")}</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.supplier")}</TableHead>
                <TableHead>{t("fields.code")}</TableHead>
                <TableHead>{t("fields.invoiceNumber")}</TableHead>
                <TableHead>{t("fields.dueDate")}</TableHead>
                <TableHead className="text-right">{t("fields.remaining")}</TableHead>
                <TableHead className="text-right">{t("fields.current")}</TableHead>
                <TableHead className="text-right">{t("fields.days1To30")}</TableHead>
                <TableHead className="text-right">{t("fields.days31To60")}</TableHead>
                <TableHead className="text-right">{t("fields.days61To90")}</TableHead>
                <TableHead className="text-right">{t("fields.over90")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : apRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              ) : (
                apRows.map((r) => (
                  <TableRow key={r.invoice_id}>
                    <TableCell>{r.supplier_name}</TableCell>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.invoice_number}</TableCell>
                    <TableCell>{safeDate(r.due_date)}</TableCell>
                    <TableCell className="text-right">{r.remaining_amount ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.current ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_1_30 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_31_60 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.days_61_90 ?? 0}</TableCell>
                    <TableCell className="text-right">{r.buckets?.over_90 ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          pageIndex={apPagination?.page ?? apPage}
          pageSize={apPagination?.per_page ?? apPageSize}
          rowCount={apPagination?.total ?? apRows.length}
          onPageChange={setApPage}
          onPageSizeChange={(s) => {
            setApPageSize(s);
            setApPage(1);
          }}
        />
      </div>
    </div>
  );
}
