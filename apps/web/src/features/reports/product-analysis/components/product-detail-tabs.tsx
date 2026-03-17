"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Users, User, TrendingUp } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useProductCustomers } from "../hooks/use-product-customers";
import { useProductSalesReps } from "../hooks/use-product-sales-reps";
import { useProductMonthlyTrend } from "../hooks/use-product-monthly-trend";
import { formatCurrency } from "@/lib/utils";

interface ProductDetailTabsProps {
  readonly productId: string;
  readonly startDate: string;
  readonly endDate: string;
}

const trendChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function ProductDetailTabs({
  productId,
  startDate,
  endDate,
}: ProductDetailTabsProps) {
  const t = useTranslations("productAnalysisReport.detail");

  const {
    customers,
    pagination: customerPagination,
    isLoading: customersLoading,
    setPage: setCustomerPage,
    setPerPage: setCustomerPerPage,
  } = useProductCustomers(productId, { startDate, endDate });

  const {
    salesReps,
    pagination: salesRepPagination,
    isLoading: salesRepsLoading,
    setPage: setSalesRepPage,
    setPerPage: setSalesRepPerPage,
  } = useProductSalesReps(productId, { startDate, endDate });

  const { trendData, isLoading: trendLoading } = useProductMonthlyTrend(
    productId,
    startDate,
    endDate
  );

  const trendChartData =
    trendData?.monthly_data?.map((m) => ({
      month: m.month_name.substring(0, 3),
      revenue: m.total_revenue,
    })) ?? [];

  return (
    <Tabs defaultValue="customers" className="w-full">
      <TabsList className="relative inline-flex h-10 items-center justify-start gap-1 border-b border-border">
        <TabsTrigger value="customers" className="inline-flex h-full items-center justify-start gap-2 px-3">
          <Users className="h-4 w-4" />
          {t("tabCustomers")}
        </TabsTrigger>
        <TabsTrigger value="salesReps" className="inline-flex h-full items-center justify-start gap-2 px-3">
          <User className="h-4 w-4" />
          {t("tabSalesReps")}
        </TabsTrigger>
        <TabsTrigger value="trend" className="inline-flex h-full items-center justify-start gap-2 px-3">
          <TrendingUp className="h-4 w-4" />
          {t("tabTrend")}
        </TabsTrigger>
      </TabsList>

      {/* Customers Tab */}
      <TabsContent value="customers" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("customerName")}</TableHead>
              <TableHead>{t("customerType")}</TableHead>
              <TableHead>{t("city")}</TableHead>
              <TableHead className="text-right">{t("revenue")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("orders")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noData")}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.customer_id}>
                  <TableCell>
                    <div>
                      <span className="block font-medium">
                        {c.customer_name}
                      </span>
                      {c.customer_code && (
                        <span className="block text-xs text-muted-foreground">
                          {c.customer_code}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.customer_type ? (
                      <Badge variant="secondary">{c.customer_type}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{c.city_name ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {c.total_revenue_formatted}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.total_qty.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.total_orders}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {customerPagination && (
          <div className="mt-4">
            <DataTablePagination
              pageIndex={customerPagination.page}
              pageSize={customerPagination.per_page}
              rowCount={customerPagination.total}
              onPageChange={setCustomerPage}
              onPageSizeChange={(size) => {
                setCustomerPerPage(size);
                setCustomerPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </TabsContent>

      {/* Sales Reps Tab */}
      <TabsContent value="salesReps" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("salesRepName")}</TableHead>
              <TableHead>{t("position")}</TableHead>
              <TableHead className="text-right">{t("revenue")}</TableHead>
              <TableHead className="text-right">{t("qty")}</TableHead>
              <TableHead className="text-right">{t("orders")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesRepsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : salesReps.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noData")}
                </TableCell>
              </TableRow>
            ) : (
              salesReps.map((rep) => (
                <TableRow key={rep.employee_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={rep.avatar_url}
                          alt={rep.name}
                        />
                        <AvatarFallback dataSeed={rep.name} />
                      </Avatar>
                      <div>
                        <span className="block font-medium">{rep.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {rep.employee_code}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rep.position_name ? (
                      <Badge variant="outline">{rep.position_name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rep.total_revenue_formatted}
                  </TableCell>
                  <TableCell className="text-right">
                    {rep.total_qty.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    {rep.total_orders}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {salesRepPagination && (
          <div className="mt-4">
            <DataTablePagination
              pageIndex={salesRepPagination.page}
              pageSize={salesRepPagination.per_page}
              rowCount={salesRepPagination.total}
              onPageChange={setSalesRepPage}
              onPageSizeChange={(size) => {
                setSalesRepPerPage(size);
                setSalesRepPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </TabsContent>

      {/* Monthly Trend Tab */}
      <TabsContent value="trend" className="mt-4">
        {trendLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : trendChartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
            <BarChart
              data={trendChartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000000)
                    return `${(value / 1000000000).toFixed(1)}M`;
                  if (value >= 1000000)
                    return `${(value / 1000000).toFixed(0)}Jt`;
                  return `${(value / 1000).toFixed(0)}k`;
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <>
                        <span className="font-medium">{t("revenue")}</span>
                        <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                          {formatCurrency(Number(value))}
                        </span>
                      </>
                    )}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ChartContainer>
        )}
      </TabsContent>
    </Tabs>
  );
}
