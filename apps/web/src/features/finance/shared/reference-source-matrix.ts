export type SourceKind =
  | "sales-payment"
  | "sales-order"
  | "delivery-order"
  | "purchase-payment"
  | "purchase-order"
  | "sales-invoice"
  | "sales-invoice-dp"
  | "purchase-invoice"
  | "purchase-invoice-dp"
  | "goods-receipt"
  | "closing"
  | "finance-journal"
  | "finance-payment"
  | "cash-bank"
  | "unknown";

export type SourceRouteKey =
  | "salesPayment"
  | "salesOrder"
  | "deliveryOrder"
  | "purchasePayment"
  | "purchaseOrder"
  | "salesInvoice"
  | "purchaseInvoice"
  | "goodsReceipt"
  | "cashBank"
  | "financeJournal"
  | "unknown";

export interface ReferenceSourceRule {
  sourceKind: SourceKind;
  referenceTypes: readonly string[];
  routeKey: SourceRouteKey;
  routePattern?: string;
}

export const REFERENCE_SOURCE_MATRIX: readonly ReferenceSourceRule[] = [
  {
    sourceKind: "sales-payment",
    referenceTypes: ["SALES_PAYMENT"],
    routeKey: "salesPayment",
    routePattern: "/sales/payments",
  },
  {
    sourceKind: "sales-order",
    referenceTypes: ["SALES_ORDER", "SO"],
    routeKey: "salesOrder",
    routePattern: "/sales/orders?open_order=:id",
  },
  {
    sourceKind: "delivery-order",
    referenceTypes: ["DELIVERY_ORDER", "DO"],
    routeKey: "deliveryOrder",
    routePattern: "/sales/delivery-orders?open_delivery_order=:id",
  },
  {
    sourceKind: "purchase-payment",
    referenceTypes: ["PURCHASE_PAYMENT"],
    routeKey: "purchasePayment",
    routePattern: "/purchase/payments",
  },
  {
    sourceKind: "purchase-order",
    referenceTypes: ["PURCHASE_ORDER", "PO"],
    routeKey: "purchaseOrder",
    routePattern: "/purchase/purchase-orders?open_purchase_order=:id",
  },
  {
    sourceKind: "sales-invoice",
    referenceTypes: ["SALES_INVOICE"],
    routeKey: "salesInvoice",
    routePattern: "/sales/invoices?open_customer_invoice=:id",
  },
  {
    sourceKind: "sales-invoice-dp",
    referenceTypes: ["SALES_INVOICE_DP"],
    routeKey: "salesInvoice",
    routePattern: "/sales/customer-invoice-down-payments?open_customer_invoice_dp=:id",
  },
  {
    sourceKind: "purchase-invoice",
    referenceTypes: ["SUPPLIER_INVOICE"],
    routeKey: "purchaseInvoice",
    routePattern: "/purchase/supplier-invoices?open_supplier_invoice=:id",
  },
  {
    sourceKind: "purchase-invoice-dp",
    referenceTypes: ["SUPPLIER_INVOICE_DP"],
    routeKey: "purchaseInvoice",
    routePattern: "/purchase/supplier-invoice-down-payments?open_supplier_invoice_dp=:id",
  },
  {
    sourceKind: "goods-receipt",
    referenceTypes: ["GOODS_RECEIPT", "GR"],
    routeKey: "goodsReceipt",
    routePattern: "/purchase/goods-receipt?open_goods_receipt=:id",
  },
  {
    sourceKind: "closing",
    referenceTypes: ["YEAR_END_CLOSING"],
    routeKey: "financeJournal",
    routePattern: "/finance/closing?open_financial_closing=:id",
  },
  {
    sourceKind: "finance-payment",
    referenceTypes: ["PAYMENT"],
    routeKey: "financeJournal",
    routePattern: "/finance/payments",
  },
  {
    sourceKind: "cash-bank",
    referenceTypes: ["CASH_BANK", "CB", "TRF", "TRANSFER", "CASH_IN", "CASH_OUT"],
    routeKey: "cashBank",
    routePattern: "/finance/cash-bank",
  },
  {
    sourceKind: "finance-journal",
    referenceTypes: [
      "MANUAL_ADJUSTMENT",
      "ADJUSTMENT",
      "CORRECTION",
      "GENERAL",
      "NTP",
      "NTP_PAYMENT",
      "ASSET_TXN",
      "ASSET_DEP",
      "ASSET_TRANSACTION",
      "ASSET_DEPRECIATION",
      "UP_COUNTRY",
      "REVERSAL",
      "STOCK_OP",
      "STOCK_OPNAME",
      "INVENTORY_ADJUSTMENT",
      "INVENTORY_VALUATION",
      "CURRENCY_REVALUATION",
      "COST_ADJUSTMENT",
      "DEPRECIATION_VALUATION",
    ],
    routeKey: "financeJournal",
    routePattern: "/finance/journals",
  },
];

function normalizeReferenceType(referenceType?: string | null): string {
  return (referenceType ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function resolveSourceKind(referenceType?: string | null): SourceKind {
  const normalized = normalizeReferenceType(referenceType);
  if (!normalized) return "unknown";

  for (const rule of REFERENCE_SOURCE_MATRIX) {
    if (rule.referenceTypes.some((type) => normalizeReferenceType(type) === normalized)) {
      return rule.sourceKind;
    }
  }
  return "unknown";
}

export function resolveSourceRule(referenceType?: string | null): ReferenceSourceRule | undefined {
  const normalized = normalizeReferenceType(referenceType);
  if (!normalized) return undefined;

  return REFERENCE_SOURCE_MATRIX.find((rule) =>
    rule.referenceTypes.some((type) => normalizeReferenceType(type) === normalized),
  );
}

export function canResolveSource(referenceType?: string | null): boolean {
  return resolveSourceKind(referenceType) !== "unknown";
}

export function resolveSourceRoute(referenceType?: string | null, referenceID?: string | null): string | undefined {
  const rule = resolveSourceRule(referenceType);
  if (!rule || !rule.routePattern || !referenceID) return undefined;
  return rule.routePattern.replace(":id", referenceID);
}
