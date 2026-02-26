"use client";

import React from "react";
import {
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import type { SalesRepPerformance } from "../types";
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
import { cn } from "@/lib/utils";

type SortBy =
  | "revenue"
  | "orders"
  | "visits"
  | "name"
  | "target"
  | "achievement";

interface SalesPerformanceListProps {
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  search: string;
  setSearch: (search: string) => void;
  performanceList: SalesRepPerformance[];
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
  onViewDetail: (employeeId: string) => void;
}

export function SalesPerformanceList({
  setPage,
  setPerPage,
  search,
  setSearch,
  performanceList,
  pagination,
  isLoading,
  sortBy,
  setSortBy,
  order,
  setOrder,
  onViewDetail,
}: SalesPerformanceListProps) {
  const t = useTranslations("salesOverviewReport");

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
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t("performance_list")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("performance_list_desc")}
          </p>
        </div>
        <div className="relative w-[300px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-10 h-9"
            placeholder={t("table.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">
                {t("table.rank")}
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2 hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  {t("table.user")}
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("target")}
                >
                  {t("table.target")}
                  {getSortIcon("target")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("achievement")}
                >
                  {t("table.achievement")}
                  {getSortIcon("achievement")}
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
                  onClick={() => handleSort("orders")}
                >
                  {t("table.orders")}
                  {getSortIcon("orders")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-auto hover:bg-transparent hover:text-primary cursor-pointer"
                  onClick={() => handleSort("visits")}
                >
                  {t("table.visits")}
                  {getSortIcon("visits")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                {t("table.actions")}
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
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
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
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : performanceList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground py-12">
                  <div className="text-sm">{t("table.noData")}</div>
                </TableCell>
              </TableRow>
            ) : (
              performanceList.map((item, index) => {
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
                  <TableRow key={item.employee_id}>
                    <TableCell>{rankDisplay}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => onViewDetail(item.employee_id)}
                        className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={item.avatar_url}
                            alt={item.name}
                          />
                          <AvatarFallback dataSeed={item.name} />
                        </Avatar>
                        <div>
                          <span className="block">{item.name}</span>
                          <span className="block text-xs text-muted-foreground font-normal">
                            {item.employee_code}
                          </span>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.target_amount_formatted ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.target_achievement_percentage !== undefined ? (
                        <span
                          className={cn(
                            item.target_achievement_percentage >= 100
                              ? "text-green-600"
                              : item.target_achievement_percentage >= 75
                                ? "text-warning"
                                : "text-destructive"
                          )}
                        >
                          {Math.round(item.target_achievement_percentage)}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_revenue_formatted}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_orders}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.visits_completed}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-primary"
                          title="View Details"
                          onClick={() =>
                            onViewDetail(item.employee_id)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
