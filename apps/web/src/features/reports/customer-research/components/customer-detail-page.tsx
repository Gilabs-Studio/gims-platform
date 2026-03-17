"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageMotion } from "@/components/motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Calendar,
  Package,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCustomerDetail } from "../hooks/use-customer-detail";
import { useCustomerTopProducts } from "../hooks/use-customer-top-products";
import { useOrders } from "@/features/sales/order/hooks/use-orders";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import { OrderStatusBadge } from "@/features/sales/order/components/order-status-badge";
import { DOStatusBadge } from "@/features/sales/order/components/do-status-badge";
import { InvoiceStatusBadge } from "@/features/sales/order/components/invoice-status-badge";
import { DOLinkedDialog } from "@/features/sales/order/components/do-linked-dialog";
import { InvoiceLinkedDialog } from "@/features/sales/order/components/invoice-linked-dialog";
import { QuotationProductDetailModal } from "@/features/sales/quotation/components/quotation-product-detail-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { format, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SalesOrder } from "@/features/sales/order/types";

const ACTIVE_STATUSES = new Set(["submitted", "approved"]);

interface CustomerDetailPageProps {
  readonly customerId: string;
}

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps) {
  const t = useTranslations("customerResearchReport.detail");
  const router = useRouter();

  const defaultStart = useMemo(() => format(subYears(new Date(), 1), "yyyy-MM-dd"), []);
  const defaultEnd = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const dateRange: DateRange | undefined = useMemo(() => {
    return {
      from: new Date(startDate + "T00:00:00"),
      to: new Date(endDate + "T00:00:00"),
    };
  }, [startDate, endDate]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
      setEndDate(range.to ? format(range.to, "yyyy-MM-dd") : defaultEnd);
    } else {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  };

  const { detail, isLoading: isDetailLoading } = useCustomerDetail(
    customerId,
    startDate,
    endDate
  );

  const { products, isLoading: isProductsLoading } = useCustomerTopProducts(
    customerId,
    startDate,
    endDate,
    20
  );

  const canViewSalesOrder = useUserPermission("sales_order.read");
  const canViewProduct = useUserPermission("product.read");
  const canViewDO = useUserPermission("delivery_order.read");
  const canViewInvoice = useUserPermission("customer_invoice.read");

  // Load all orders for this customer (no date filter — show everything)
  const { data: ordersData, isLoading: isOrdersLoading } = useOrders({
    customer_id: customerId,
    per_page: 100,
    sort_by: "order_date",
    sort_dir: "desc",
  });

  const allOrders = ordersData?.data ?? [];
  const activeOrders = allOrders.filter((o) => ACTIVE_STATUSES.has(o.status));

  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [doDialogOrder, setDoDialogOrder] = useState<SalesOrder | null>(null);
  const [invoiceDialogOrder, setInvoiceDialogOrder] = useState<SalesOrder | null>(null);

  const handleOpenOrder = (order: SalesOrder) => {
    if (!canViewSalesOrder) {
      toast.error("You don't have permission to view sales orders.");
      return;
    }

    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleOpenProduct = (productId: string | null) => {
    if (!productId) return;
    if (!canViewProduct) {
      toast.error("You don't have permission to view products.");
      return;
    }

    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  if (isDetailLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageMotion>
    );
  }

  if (!detail) {
    return (
      <PageMotion className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/reports/customer-research")}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">{t("notFound")}</p>
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer shrink-0"
            onClick={() => router.push("/reports/customer-research")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {detail.customer_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <DateRangePicker
            dateRange={dateRange}
            onDateChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Active Orders Alert */}
      {activeOrders.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">
              {t("activeOrdersAlert", { count: activeOrders.length })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleOpenOrder(order)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted cursor-pointer transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {order.code}
                  <OrderStatusBadge status={order.status} className="text-xs py-0 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("totalRevenue")}
            </span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(detail.total_revenue)}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("totalOrders")}
            </span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">
            {detail.total_orders.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("averageOrderValue")}
            </span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(detail.average_order_value)}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("lastOrderDate")}
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">
            {detail.last_order_date
              ? formatDate(detail.last_order_date, "id-ID")
              : "-"}
          </div>
        </div>
      </div>

      {/* Tabs: Products + Orders */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="cursor-pointer">
            <Package className="h-4 w-4 mr-2" />
            {t("tabs.products")}
          </TabsTrigger>
          <TabsTrigger value="orders" className="cursor-pointer">
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t("tabs.orders")}
            {activeOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 min-w-4 px-1 text-xs">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-medium">{t("products.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("products.description")}
              </p>
            </div>
            <div className="overflow-x-auto">
              {isProductsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t("products.empty")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("products.columns.product")}</TableHead>
                      <TableHead>{t("products.columns.code")}</TableHead>
                      <TableHead className="text-right">
                        {t("products.columns.totalQty")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("products.columns.totalOrders")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("products.columns.totalRevenue")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left w-full text-blue-600 hover:underline"
                          onClick={() => handleOpenProduct(product.product_id)}
                        >
                          {product.product_name}
                        </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.product_code}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.total_qty.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.total_orders.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-medium">{t("orders.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("orders.description")}
              </p>
            </div>
            <div className="overflow-x-auto">
              {isOrdersLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : allOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground col-span-8">
                  {t("orders.empty")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("orders.columns.code")}</TableHead>
                      <TableHead>{t("orders.columns.status")}</TableHead>
                      <TableHead>{t("orders.columns.orderDate")}</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>DO</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">
                        {t("orders.columns.totalAmount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("orders.columns.action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className={
                          ACTIVE_STATUSES.has(order.status)
                            ? "bg-warning/5 hover:bg-warning/10"
                            : undefined
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {order.code}
                            {ACTIVE_STATUSES.has(order.status) && (
                              <Badge variant="outline" className="text-xs h-4 px-1 border-warning text-warning">
                                {t("orders.active")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.order_date
                            ? formatDate(order.order_date, "id-ID")
                            : "-"}
                        </TableCell>

                        {/* Fulfillment Progress */}
                        <TableCell>
                          {order.fulfillment ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 text-xs">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">
                                  {order.fulfillment.total_delivered}/{order.fulfillment.total_ordered}
                                </span>
                                <span className="text-muted-foreground">delivered</span>
                              </div>
                              {order.fulfillment.total_pending > 0 && (
                                <span className="text-xs text-warning">
                                  {order.fulfillment.total_pending} pending
                                </span>
                              )}
                              {order.fulfillment.total_remaining > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {order.fulfillment.total_remaining} remaining
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* DO Status */}
                        <TableCell>
                          {order.delivery_orders && order.delivery_orders.length > 0 ? (
                            canViewDO ? (
                              <button
                                type="button"
                                onClick={() => setDoDialogOrder(order)}
                                className="cursor-pointer"
                                title={`${order.delivery_orders.length} Delivery Order(s)`}
                              >
                                <span className="flex items-center gap-1">
                                  <DOStatusBadge status={order.delivery_orders[0].status} className="text-xs font-medium hover:opacity-80 transition-opacity" />
                                  {order.delivery_orders.length > 1 && (
                                    <span className="text-xs text-muted-foreground">+{order.delivery_orders.length - 1}</span>
                                  )}
                                </span>
                              </button>
                            ) : (
                              <DOStatusBadge status={order.delivery_orders[0].status} className="text-xs font-medium" />
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Invoice Status */}
                        <TableCell>
                          {order.customer_invoices && order.customer_invoices.length > 0 ? (
                            canViewInvoice ? (
                              <button
                                type="button"
                                onClick={() => setInvoiceDialogOrder(order)}
                                className="cursor-pointer"
                                title={`${order.customer_invoices.length} Invoice(s)`}
                              >
                                <span className="flex items-center gap-1">
                                  <InvoiceStatusBadge status={order.customer_invoices[0].status} className="text-xs font-medium hover:opacity-80 transition-opacity" />
                                  {order.customer_invoices.length > 1 && (
                                    <span className="text-xs text-muted-foreground">+{order.customer_invoices.length - 1}</span>
                                  )}
                                </span>
                              </button>
                            ) : (
                              <InvoiceStatusBadge status={order.customer_invoices[0].status} className="text-xs font-medium" />
                            )
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total_amount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer h-7 text-xs"
                            onClick={() => handleOpenOrder(order)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            {t("orders.viewDetail")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Detail Modal */}
      <OrderDetailModal
        open={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        order={selectedOrder}
      />

      <QuotationProductDetailModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        productId={selectedProductId}
      />

      {/* DO linked dialog */}
      {doDialogOrder && (
        <DOLinkedDialog
          salesOrderId={doDialogOrder.id}
          salesOrderCode={doDialogOrder.code}
          open={!!doDialogOrder}
          onOpenChange={(open) => { if (!open) setDoDialogOrder(null); }}
        />
      )}

      {/* Invoice linked dialog */}
      {invoiceDialogOrder && (
        <InvoiceLinkedDialog
          salesOrderId={invoiceDialogOrder.id}
          salesOrderCode={invoiceDialogOrder.code}
          open={!!invoiceDialogOrder}
          onOpenChange={(open) => { if (!open) setInvoiceDialogOrder(null); }}
        />
      )}
    </PageMotion>
  );
}
