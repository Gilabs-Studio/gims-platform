"use client";

import { useState } from "react";
import { Truck, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "./order-status-badge";
import { DOLinkedDialog } from "./do-linked-dialog";
import { InvoiceLinkedDialog } from "./invoice-linked-dialog";
import type { SalesOrder } from "../types";

interface OrderStatusGroupProps {
  order: SalesOrder;
}

export function OrderStatusGroup({ order }: OrderStatusGroupProps) {
  const [doDialogOpen, setDoDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Determine aggregate status label for linked entities
  const latestDO = order.delivery_orders?.[0];
  const latestInvoice = order.customer_invoices?.[0];
  const doCount = order.delivery_orders?.length ?? 0;
  const invoiceCount = order.customer_invoices?.length ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* SO Status badge — non-interactive, reflects Sales Order state */}
      <OrderStatusBadge status={order.status} className="text-xs font-medium" />

      {/* DO Status badge — clickable to open Delivery Order list dialog */}
      <button
        type="button"
        onClick={() => setDoDialogOpen(true)}
        className="cursor-pointer"
        title={doCount > 0 ? `${doCount} Delivery Order(s)` : "No Delivery Orders"}
      >
        {latestDO ? (
          <Badge
            variant={
              latestDO.status === "delivered"
                ? "success"
                : latestDO.status === "cancelled"
                  ? "destructive"
                  : latestDO.status === "shipped"
                    ? "info"
                    : "warning"
            }
            className="text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <Truck className="h-3 w-3 mr-1.5" />
            DO
            {doCount > 1 && (
              <span className="ml-1 opacity-75">+{doCount - 1}</span>
            )}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs font-medium text-muted-foreground hover:opacity-80 transition-opacity">
            <Truck className="h-3 w-3 mr-1.5" />
            DO
          </Badge>
        )}
      </button>

      {/* Invoice Status badge — clickable to open Customer Invoice list dialog */}
      <button
        type="button"
        onClick={() => setInvoiceDialogOpen(true)}
        className="cursor-pointer"
        title={invoiceCount > 0 ? `${invoiceCount} Invoice(s)` : "No Invoices"}
      >
        {latestInvoice ? (
          <Badge
            variant={
              latestInvoice.status === "paid"
                ? "success"
                : latestInvoice.status === "cancelled"
                  ? "destructive"
                  : latestInvoice.status === "unpaid" || latestInvoice.status === "partial"
                    ? "warning"
                    : "info"
            }
            className="text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <Receipt className="h-3 w-3 mr-1.5" />
            INV
            {invoiceCount > 1 && (
              <span className="ml-1 opacity-75">+{invoiceCount - 1}</span>
            )}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs font-medium text-muted-foreground hover:opacity-80 transition-opacity">
            <Receipt className="h-3 w-3 mr-1.5" />
            INV
          </Badge>
        )}
      </button>

      {/* Lazy-loaded dialogs — only fetch data when opened */}
      <DOLinkedDialog
        salesOrderId={order.id}
        salesOrderCode={order.code}
        open={doDialogOpen}
        onOpenChange={setDoDialogOpen}
      />
      <InvoiceLinkedDialog
        salesOrderId={order.id}
        salesOrderCode={order.code}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
    </div>
  );
}
