"use client";

import { useMemo } from "react";
import { formatCurrency, formatWhatsAppLink } from "@/lib/utils";
import type { POSOrder } from "../types";

export const POS_RECEIPT_WHATSAPP_TEMPLATE_TAGS = [
  "customer_name",
  "order_number",
  "outlet_name",
  "order_date",
  "subtotal",
  "service_amount",
  "discount_amount",
  "total_amount",
  "tender_amount",
  "change_amount",
  "items_summary",
] as const;

export type ReceiptWhatsAppTemplateTag = (typeof POS_RECEIPT_WHATSAPP_TEMPLATE_TAGS)[number];

export interface ReceiptWhatsAppTemplateValues {
  customer_name: string;
  order_number: string;
  outlet_name: string;
  order_date: string;
  subtotal: string;
  service_amount: string;
  discount_amount: string;
  total_amount: string;
  tender_amount: string;
  change_amount: string;
  items_summary: string;
}

interface UsePOSReceiptWhatsAppTemplateParams {
  order: POSOrder;
  template?: string | null;
  customerName?: string;
  customerPhone?: string;
  outletName?: string;
  tenderAmount?: number;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function renderReceiptWhatsAppTemplate(
  template: string,
  values: ReceiptWhatsAppTemplateValues,
): string {
  const rendered = template.replace(/#([A-Za-z0-9_]+)/g, (match, rawTag: string) => {
    if (rawTag === "tax_amount") return "";
    const tag = rawTag as ReceiptWhatsAppTemplateTag;
    const replacement = values[tag as keyof ReceiptWhatsAppTemplateValues];
    return replacement ?? match;
  });

  // Sanitize non-standard characters like narrow no-break space (U+202F)
  // which can cause encoding issues in some WhatsApp clients
  return rendered.replace(/\u202f/g, " ");
}

export function usePOSReceiptWhatsAppTemplate({
  order,
  template,
  customerName,
  customerPhone,
  outletName,
  tenderAmount,
}: UsePOSReceiptWhatsAppTemplateParams) {
  const resolvedTemplate = useMemo(() => template?.trim() || "", [template]);

  const templateValues = useMemo<ReceiptWhatsAppTemplateValues>(() => {
    const changeAmount = Math.max((tenderAmount ?? order.total_amount) - order.total_amount, 0);

    return {
      customer_name: customerName?.trim() || order.customer_name?.trim() || "-",
      order_number: order.order_number,
      outlet_name: outletName?.trim() || "-",
      order_date: formatDateTime(order.created_at),
      subtotal: formatCurrency(order.subtotal),
      service_amount: formatCurrency(order.service_charge),
      discount_amount: formatCurrency(order.discount_amount),
      total_amount: formatCurrency(order.total_amount),
      tender_amount: formatCurrency(tenderAmount ?? order.total_amount),
      change_amount: formatCurrency(changeAmount),
      items_summary: order.items
        .map((item) => `${item.product_name} x${item.quantity}`)
        .join(", ") || "-",
    };
  }, [customerName, order, outletName, tenderAmount]);

  const previewMessage = useMemo(
    () => renderReceiptWhatsAppTemplate(resolvedTemplate, templateValues),
    [resolvedTemplate, templateValues],
  );

  const whatsappUrl = useMemo(() => {
    if (!customerPhone?.trim()) return "";
    return formatWhatsAppLink(customerPhone, previewMessage);
  }, [customerPhone, previewMessage]);

  return {
    template: resolvedTemplate,
    previewMessage,
    whatsappUrl,
    templateValues,
  } as const;
}
