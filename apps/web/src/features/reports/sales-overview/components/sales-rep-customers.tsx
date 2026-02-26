"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useSalesRepCustomers } from "../hooks/use-sales-rep-customers";
import type { SalesRepCustomer } from "../types";

interface SalesRepCustomersProps {
  readonly employeeId: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export function SalesRepCustomers({
  employeeId,
  startDate,
  endDate,
}: SalesRepCustomersProps) {
  const t = useTranslations("salesOverviewReport.customers");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const {
    customers,
    pagination,
    isLoading,
  } = useSalesRepCustomers(employeeId, {
    page,
    per_page: perPage,
    start_date: startDate,
    end_date: endDate,
  });

  // Map customers for DataTable (requires id field)
  const customersWithId = customers.map(
    (c: SalesRepCustomer) => ({
      ...c,
      id: c.customer_id,
    })
  );

  const columns: Column<SalesRepCustomer & { id: string }>[] = [
    {
      id: "name",
      header: t("table.name"),
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {item.customer_name}
          </span>
          {item.customer_code && (
            <span className="text-xs text-muted-foreground">
              {item.customer_code}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "customer_type",
      header: t("table.category"),
      accessor: (item) =>
        item.customer_type ? (
          <Badge variant="outline" className="font-normal text-xs">
            {item.customer_type}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      id: "total_orders",
      header: t("table.totalOrders"),
      accessor: (item) => (
        <span className="font-medium">
          {item.total_orders.toLocaleString()}
        </span>
      ),
      className: "text-right",
    },
    {
      id: "total_revenue",
      header: t("table.totalRevenue"),
      accessor: (item) => (
        <span className="font-medium">
          {formatCurrency(item.total_revenue)}
        </span>
      ),
      className: "text-right",
    },
    {
      id: "last_order",
      header: t("table.lastOrder"),
      accessor: () => "-",
      className: "text-muted-foreground text-sm",
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={customersWithId}
        isLoading={isLoading}
        emptyMessage={t("empty")}
        pagination={pagination}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        perPageOptions={[10, 20, 50]}
      />
    </div>
  );
}
