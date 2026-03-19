"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
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

/** Normalized shape used by all dimension performance tables */
export interface NormalizedDimensionItem {
  id: string;
  name: string;
  product_count: number;
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  avg_price: number;
  avg_price_formatted: string;
}

interface DimensionPerformanceListProps {
  /** Translated label for the dimension column header (e.g. "Category", "Segment") */
  dimensionLabel: string;
  /** Translated search placeholder */
  searchPlaceholder: string;
  /** Translated empty-state message */
  noDataMessage: string;
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  search: string;
  setSearch: (search: string) => void;
  items: NormalizedDimensionItem[];
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

export function DimensionPerformanceList({
  dimensionLabel,
  searchPlaceholder,
  noDataMessage,
  setPage,
  setPerPage,
  search,
  setSearch,
  items,
  pagination,
  isLoading,
  sortBy,
  setSortBy,
  order,
  setOrder,
}: DimensionPerformanceListProps) {
  const t = useTranslations("productAnalysisReport");

  const formatCurrencyAmount = (amount: number) => formatCurrency(Math.round(amount));

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
                  {dimensionLabel}
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
              <TableHead className="text-right">{t("table.avgPrice")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 7 }).map((__, colIdx) => (
                    <TableCell key={colIdx}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground py-12"
                >
                  <div className="text-sm">{noDataMessage}</div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const rank =
                  ((pagination?.page ?? 1) - 1) * (pagination?.per_page ?? 10) +
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
                  <TableRow key={item.id || index}>
                    <TableCell>{rankDisplay}</TableCell>
                    <TableCell>
                      <span className="font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.product_count}</Badge>
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

      {/* Pagination */}
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
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </div>
  );
}
