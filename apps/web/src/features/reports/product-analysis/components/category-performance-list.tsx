"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { CategoryPerformance } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

type SortBy = "revenue" | "qty" | "orders" | "name" | "products";

interface CategoryPerformanceListProps {
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  search: string;
  setSearch: (search: string) => void;
  categoryList: CategoryPerformance[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  isLoading: boolean;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  order: "asc" | "desc";
  setOrder: (order: "asc" | "desc") => void;
}

export function CategoryPerformanceList({
  setPage,
  setPerPage,
  search,
  setSearch,
  categoryList,
  pagination,
  isLoading,
  sortBy,
  setSortBy,
  order,
  setOrder,
}: CategoryPerformanceListProps) {
  const formatCurrencyAmount = (amount: number) => formatCurrency(Math.round(amount));
  const t = useTranslations("productAnalysisReport");

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrder("desc");
    }
  };

  const getSortIcon = (column: SortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return order === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const perPageOptions = [10, 20, 50, 100];

  return (
    <div className="space-y-4">
      {/* search is rendered in parent header */}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t("table.rank")}</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2 hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  {t("categoryTable.category")}
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2 hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("products")}
                >
                  {t("categoryTable.productCount")}
                  {getSortIcon("products")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("revenue")}
                >
                  {t("table.revenue")}
                  {getSortIcon("revenue")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("qty")}
                >
                  {t("table.qty")}
                  {getSortIcon("qty")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("orders")}
                >
                  {t("table.orders")}
                  {getSortIcon("orders")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                {t("table.avgPrice")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : categoryList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground py-12"
                >
                  <div className="text-sm">{t("categoryTable.noData")}</div>
                </TableCell>
              </TableRow>
            ) : (
              categoryList.map((item, index) => {
                const rank =
                  ((pagination?.page || 1) - 1) *
                    (pagination?.per_page || 10) +
                  index +
                  1;

                let rankDisplay: React.ReactNode = (
                  <span className="text-muted-foreground font-medium">
                    #{rank}
                  </span>
                );

                if (rank === 1) {
                  rankDisplay = (
                    <Badge
                      variant="outline"
                      className="bg-brand/10 text-brand border-brand/30 hover:bg-brand/20 px-2 py-0.5 whitespace-nowrap"
                    >
                      1
                    </Badge>
                  );
                } else if (rank === 2) {
                  rankDisplay = (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border hover:bg-muted/80 px-2 py-0.5 whitespace-nowrap"
                    >
                      2
                    </Badge>
                  );
                } else if (rank === 3) {
                  rankDisplay = (
                    <Badge
                      variant="outline"
                      className="bg-muted/50 text-muted-foreground/70 border-border/50 hover:bg-muted/70 px-2 py-0.5 whitespace-nowrap"
                    >
                      3
                    </Badge>
                  );
                }

                return (
                  <TableRow key={item.category_id || `uncategorized-${index}`}>
                    <TableCell>{rankDisplay}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md border bg-muted flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{item.category_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="tabular-nums">
                        {item.product_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyAmount(item.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_qty.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_orders}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.avg_price_formatted}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          pageSizeOptions={perPageOptions}
        />
      )}
    </div>
  );
}
