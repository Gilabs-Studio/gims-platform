"use client";

import { Eye, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/utils";
import type { SupplierTableRow } from "../types";

interface SupplierResearchTableProps {
  readonly tab: "top_spenders" | "slow_delivery" | "reliability";
  readonly onTabChange: (tab: "top_spenders" | "slow_delivery" | "reliability") => void;
  readonly rows: SupplierTableRow[];
  readonly isLoading: boolean;
  readonly search: string;
  readonly setSearch: (search: string) => void;
  readonly setPage: (page: number) => void;
  readonly setPerPage: (perPage: number) => void;
  readonly pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
  readonly onViewDetail: (supplierId: string) => void;
}

export function SupplierResearchTable({
  tab,
  onTabChange,
  rows,
  isLoading,
  search,
  setSearch,
  setPage,
  setPerPage,
  pagination,
  onViewDetail,
}: SupplierResearchTableProps) {
  const t = useTranslations("supplierResearchReport");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{t("table.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("table.description")}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as typeof tab)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="top_spenders" className="cursor-pointer">
              {t("table.tabTopSpenders")}
            </TabsTrigger>
            <TabsTrigger value="slow_delivery" className="cursor-pointer">
              {t("table.tabSlowDelivery")}
            </TabsTrigger>
            <TabsTrigger value="reliability" className="cursor-pointer">
              {t("table.tabReliability")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            value={search}
            placeholder={t("filters.search")}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.supplier")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead className="text-right">{t("table.purchaseValue")}</TableHead>
              <TableHead className="text-right">{t("table.purchaseOrders")}</TableHead>
              <TableHead className="text-right">{t("table.leadTime")}</TableHead>
              <TableHead className="text-right">{t("table.onTimeRate")}</TableHead>
              <TableHead className="text-right">{t("table.dependency")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`supplier-table-skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  {t("table.noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.supplier_id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onViewDetail(row.supplier_id)}
                      className="text-left font-medium text-primary hover:underline cursor-pointer"
                    >
                      {row.supplier_name}
                    </button>
                    <div className="text-xs text-muted-foreground">{row.supplier_code ?? "-"}</div>
                  </TableCell>
                  <TableCell>{row.category_name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.total_purchase_value ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">{(row.total_purchase_orders ?? 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">{(row.average_lead_time_days ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{(row.supplier_on_time_rate ?? 0).toFixed(2)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">{(row.dependency_score ?? 0).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => onViewDetail(row.supplier_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      ) : null}
    </div>
  );
}
