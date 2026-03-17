"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CustomerResearchListItem } from "../types";

interface CustomerListTableProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly items: CustomerResearchListItem[];
  readonly isLoading?: boolean;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly perPage: number;
  readonly setPerPage: (perPage: number) => void;
  readonly pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  readonly onViewDetail: (customerId: string) => void;
}

export function CustomerListTable({
  search,
  onSearchChange,
  items,
  isLoading,
  page,
  setPage,
  perPage,
  setPerPage,
  pagination,
  onViewDetail,
}: CustomerListTableProps) {
  const t = useTranslations("customerResearchReport.table");

  const perPageOptions = [10, 20, 50, 100];

  return (
    <div className="space-y-4">
      {/* Header with title/description and search */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="relative w-[300px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-10 h-9"
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value);
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
              <TableHead>{t("columns.customer")}</TableHead>
              <TableHead className="text-right">{t("columns.total_revenue")}</TableHead>
              <TableHead className="text-right">{t("columns.total_orders")}</TableHead>
              <TableHead className="text-right">{t("columns.average_order_value")}</TableHead>
              <TableHead className="text-right">{t("columns.last_order_date")}</TableHead>
              <TableHead className="text-right">{t("columns.active_orders")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground py-12">
                  {t("empty.default")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.customer_id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onViewDetail(item.customer_id)}
                      className="font-medium text-left text-primary hover:underline cursor-pointer"
                    >
                      {item.customer_name ?? "-"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
                  <TableCell className="text-right">{(item.total_orders ?? 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.average_order_value)}</TableCell>
                  <TableCell className="text-right">{item.last_order_date ? formatDate(item.last_order_date, "id-ID") : "-"}</TableCell>
                  <TableCell className="text-right">
                    {(item.active_sales_order_count ?? 0) > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {item.active_sales_order_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        pageIndex={page}
        pageSize={perPage}
        rowCount={pagination?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPerPage(size);
          setPage(1);
        }}
        pageSizeOptions={perPageOptions}
      />
    </div>
  );
}
