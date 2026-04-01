"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import { useSalesRepProducts } from "../hooks/use-sales-rep-products";
import type { SalesRepProductSold } from "../types";

type SortBy = "total_sold" | "revenue" | "name";
type OrderBy = "asc" | "desc";

interface SalesRepProductSalesProps {
  readonly employeeId: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export function SalesRepProductSales({
  employeeId,
  startDate,
  endDate,
}: SalesRepProductSalesProps) {
  const t = useTranslations("salesOverviewReport.productSales");

  const [sortBy, setSortBy] = useState<SortBy>("revenue");
  const [orderBy, setOrderBy] = useState<OrderBy>("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const {
    products,
    pagination,
    isLoading,
  } = useSalesRepProducts(employeeId, {
    page,
    per_page: perPage,
    sort_by: sortBy === "total_sold" ? "total_quantity" : sortBy,
    order: orderBy,
    start_date: startDate,
    end_date: endDate,
  });

  return (
    <div className="space-y-4">
      {/* Sort Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            {t("filters.sortBy")}
          </label>
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v as SortBy);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_sold">
                {t("filters.sortOptions.totalSold")}
              </SelectItem>
              <SelectItem value="revenue">
                {t("filters.sortOptions.revenue")}
              </SelectItem>
              <SelectItem value="name">
                {t("filters.sortOptions.name")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            {t("filters.order")}
          </label>
          <Select
            value={orderBy}
            onValueChange={(v) => {
              setOrderBy(v as OrderBy);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">
                {t("filters.orderOptions.desc")}
              </SelectItem>
              <SelectItem value="asc">
                {t("filters.orderOptions.asc")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.product")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead className="text-right">{t("table.totalSold")}</TableHead>
              <TableHead className="text-right">{t("table.revenue")}</TableHead>
              <TableHead className="text-right">{t("table.avgPrice")}</TableHead>
              <TableHead>{t("table.lastSold")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("noProducts")}
                </TableCell>
              </TableRow>
            ) : (
              products.map((item: SalesRepProductSold) => (
                <TableRow key={item.product_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.product_name}</span>
                      {item.product_sku && (
                        <span className="text-xs text-muted-foreground">SKU: {item.product_sku}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category_name ?? "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.total_quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.average_price)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.last_sold_date ? formatDate(item.last_sold_date) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize: number) => {
            setPerPage(newSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
