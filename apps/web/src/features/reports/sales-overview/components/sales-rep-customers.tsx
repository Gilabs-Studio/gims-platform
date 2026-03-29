"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead className="text-right">{t("table.totalOrders")}</TableHead>
              <TableHead className="text-right">{t("table.totalRevenue")}</TableHead>
              <TableHead>{t("table.lastOrder")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((item: SalesRepCustomer) => (
                <TableRow key={item.customer_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.customer_name}</span>
                      {item.customer_code && (
                        <span className="text-xs text-muted-foreground">{item.customer_code}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.customer_type ? (
                      <Badge variant="outline" className="font-normal text-xs">
                        {item.customer_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.total_orders.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_revenue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
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
