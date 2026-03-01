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
import { formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/ui/data-table";
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

  // Map products for DataTable (requires id field)
  const productsWithId = products.map(
    (p: SalesRepProductSold) => ({
      ...p,
      id: p.product_id,
    })
  );

  const columns: Column<SalesRepProductSold & { id: string }>[] = [
    {
      id: "product",
      header: t("table.product"),
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.product_name}</span>
          {item.product_sku && (
            <span className="text-xs text-muted-foreground">
              SKU: {item.product_sku}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: t("table.category"),
      accessor: (item) => (
        <Badge variant="outline">
          {item.category_name ?? "-"}
        </Badge>
      ),
    },
    {
      id: "total_sold",
      header: t("table.totalSold"),
      accessor: (item) => (
        <span className="font-medium">
          {item.total_quantity.toLocaleString()}
        </span>
      ),
      className: "text-right",
    },
    {
      id: "revenue",
      header: t("table.revenue"),
      accessor: (item) => (
        <span className="font-medium">
          {formatCurrency(item.total_revenue)}
        </span>
      ),
      className: "text-right",
    },
    {
      id: "avg_price",
      header: t("table.avgPrice"),
      accessor: (item) => formatCurrency(item.average_price),
      className: "text-right",
    },
    {
      id: "last_sold",
      header: t("table.lastSold"),
      accessor: (item) =>
        item.last_sold_date
          ? new Date(item.last_sold_date).toLocaleDateString(
              "id-ID",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )
          : "-",
      className: "text-muted-foreground text-sm",
    },
  ];

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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={productsWithId}
        isLoading={isLoading}
        emptyMessage={t("noProducts")}
        pagination={pagination}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        perPageOptions={[10, 20, 50]}
      />
    </div>
  );
}
