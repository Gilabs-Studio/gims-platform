export type LandingScreenshotKey =
  | "dashboard"
  | "pipeline"
  | "salesOrder"
  | "stockInventory"
  | "profitLoss"
  | "customer"
  | "geoPerformance"
  | "salary"
  | "accountingHero"
  | "accountingAutoJournal"
  | "accountingGeneralLedger"
  | "accountingPeriodClosing"
  | "invoicingHero"
  | "invoicingConsistentInvoice"
  | "invoicingPaymentStatus"
  | "invoicingFollowUp"
  | "fixedAssetsHero"
  | "fixedAssetsRegistration"
  | "fixedAssetsValueSummary"
  | "fixedAssetsAuditDocs"
  | "financialReportsHero"
  | "financialReportsSummary"
  | "financialReportsProfitLoss"
  | "financialReportsReview"
  | "reconciliationHero"
  | "reconciliationTransactionMatching"
  | "reconciliationVarianceTracing"

  | "reconciliationClosingConfidence"
  | "crmHero"
  | "crmKanbanPipeline"
  | "crmActivityFollowup"
  | "crmAreaMapping"
  | "posHero"
  | "posTerminalFlow"
  | "posLiveTable"
  | "posFloorLayout"
  // Sales Orders
  | "salesOrderHero"
  | "salesOrderEntryFlow"
  | "salesOrderBillingCollection"
  | "salesOrderFulfillment"
  // Quotations
  | "quotationsHero"
  | "quotationsList"
  | "quotationsForm"
  | "quotationsDetail"
  | "quotationsToSalesOrder"
  // Purchase
  | "purchaseHero"
  | "purchaseRequisitionToPO"
  | "purchaseGRToInvoice"
  | "purchasePayableRecap"
  // Stock / Inventory
  | "stockInventoryList"
  | "stockInventoryBatch"
  | "stockOpnameVariance"
  // Goods Receipt
  | "goodsReceiptHero"
  | "goodsReceiptPO"
  | "goodsReceiptAudit"
  | "goodsReceiptToInvoice";

type ThemePair = {
  light: string;
  dark: string;
};

export const LANDING_THEME_IMAGES_BY_FEATURE: Record<LandingScreenshotKey, ThemePair> = {
  dashboard: {
    light: "/screenshot/dashboard.webp",
    dark: "/screenshot/dashboard-dark.webp",
  },
  pipeline: {
    light: "/screenshot/pipeline.webp",
    dark: "/screenshot/pipeline-dark.webp",
  },
  salesOrder: {
    light: "/screenshot/sales-order.webp",
    dark: "/screenshot/sales-order-dark.webp",
  },
  stockInventory: {
    light: "/screenshot/stock-inventory.webp",
    dark: "/screenshot/stock-inventory-dark.webp",
  },
  profitLoss: {
    light: "/screenshot/profit-loss.webp",
    dark: "/screenshot/profit-loss-dark.webp",
  },
  customer: {
    light: "/screenshot/master-customer.webp",
    dark: "/screenshot/master-customer-dark.webp",
  },
  geoPerformance: {
    light: "/screenshot/geo-peformance.webp",
    dark: "/screenshot/geo-peformance-dark.webp",
  },
  salary: {
    light: "/screenshot/salary.webp",
    dark: "/screenshot/salary-dark.webp",
  },
  accountingHero: {
    light: "/screenshot/accounting/accounting-hero.webp",
    dark: "/screenshot/accounting/accounting-hero-dark.webp",
  },
  accountingAutoJournal: {
    light: "/screenshot/accounting/accounting-auto-journal.webp",
    dark: "/screenshot/accounting/accounting-auto-journal-dark.webp",
  },
  accountingGeneralLedger: {
    light: "/screenshot/accounting/accounting-general-ledger.webp",
    dark: "/screenshot/accounting/accounting-general-ledger-dark.webp",
  },
  accountingPeriodClosing: {
    light: "/screenshot/accounting/accounting-period-closing.webp",
    dark: "/screenshot/accounting/accounting-period-closing-dark.webp",
  },
  invoicingHero: {
    light: "/screenshot/invoicing/invoicing-hero.webp",
    dark: "/screenshot/invoicing/invoicing-hero-dark.webp",
  },
  invoicingConsistentInvoice: {
    light: "/screenshot/invoicing/invoicing-consistent-invoice.webp",
    dark: "/screenshot/invoicing/invoicing-consistent-invoice-dark.webp",
  },
  invoicingPaymentStatus: {
    light: "/screenshot/invoicing/invoicing-payment-status.webp",
    dark: "/screenshot/invoicing/invoicing-payment-status-dark.webp",
  },
  invoicingFollowUp: {
    light: "/screenshot/invoicing/invoicing-follow-up.webp",
    dark: "/screenshot/invoicing/invoicing-follow-up-dark.webp",
  },
  fixedAssetsHero: {
    light: "/screenshot/fixed-assets/fixed-assets-hero.webp",
    dark: "/screenshot/fixed-assets/fixed-assets-hero-dark.webp",
  },
  fixedAssetsRegistration: {
    light: "/screenshot/fixed-assets/fixed-assets-registration.webp",
    dark: "/screenshot/fixed-assets/fixed-assets-registration-dark.webp",
  },
  fixedAssetsValueSummary: {
    light: "/screenshot/fixed-assets/fixed-assets-value-summary.webp",
    dark: "/screenshot/fixed-assets/fixed-assets-value-summary-dark.webp",
  },
  fixedAssetsAuditDocs: {
    light: "/screenshot/fixed-assets/fixed-assets-audit-docs.webp",
    dark: "/screenshot/fixed-assets/fixed-assets-audit-docs-dark.webp",
  },
  financialReportsHero: {
    light: "/screenshot/financial-reports/financial-reports-hero.webp",
    dark: "/screenshot/financial-reports/financial-reports-hero-dark.webp",
  },
  financialReportsSummary: {
    light: "/screenshot/financial-reports/financial-reports-summary.webp",
    dark: "/screenshot/financial-reports/financial-reports-summary-dark.webp",
  },
  financialReportsProfitLoss: {
    light: "/screenshot/financial-reports/financial-reports-profit-loss.webp",
    dark: "/screenshot/financial-reports/financial-reports-profit-loss-dark.webp",
  },
  financialReportsReview: {
    light: "/screenshot/financial-reports/financial-reports-review.webp",
    dark: "/screenshot/financial-reports/financial-reports-review-dark.webp",
  },
  reconciliationHero: {
    light: "/screenshot/reconciliation/reconciliation-hero.webp",
    dark: "/screenshot/reconciliation/reconciliation-hero-dark.webp",
  },
  reconciliationTransactionMatching: {
    light: "/screenshot/reconciliation/reconciliation-transaction-matching.webp",
    dark: "/screenshot/reconciliation/reconciliation-transaction-matching-dark.webp",
  },
  reconciliationVarianceTracing: {
    light: "/screenshot/reconciliation/reconciliation-variance-tracing.webp",
    dark: "/screenshot/reconciliation/reconciliation-variance-tracing-dark.webp",
  },
  reconciliationClosingConfidence: {
    light: "/screenshot/reconciliation/reconciliation-closing-confidence.webp",
    dark: "/screenshot/reconciliation/reconciliation-closing-confidence-dark.webp",
  },
  crmHero: {
    light: "/screenshot/crm/crm-hero.webp",
    dark: "/screenshot/crm/crm-hero-dark.webp",
  },
  crmKanbanPipeline: {
    light: "/screenshot/crm/crm-kanban-pipeline.webp",
    dark: "/screenshot/crm/crm-kanban-pipeline-dark.webp",
  },
  crmActivityFollowup: {
    light: "/screenshot/crm/crm-activity-followup.webp",
    dark: "/screenshot/crm/crm-activity-followup-dark.webp",
  },
  crmAreaMapping: {
    light: "/screenshot/crm/crm-area-mapping.webp",
    dark: "/screenshot/crm/crm-area-mapping-dark.webp",
  },
  posHero: {
    light: "/screenshot/pos/pos-hero.webp",
    dark: "/screenshot/pos/pos-hero-dark.webp",
  },
  posTerminalFlow: {
    light: "/screenshot/pos/pos-terminal-flow.webp",
    dark: "/screenshot/pos/pos-terminal-flow-dark.webp",
  },
  posLiveTable: {
    light: "/screenshot/pos/pos-live-table.webp",
    dark: "/screenshot/pos/pos-live-table-dark.webp",
  },
  posFloorLayout: {
    light: "/screenshot/pos/pos-floor-layout.webp",
    dark: "/screenshot/pos/pos-floor-layout-dark.webp",
  },
  // Sales Orders
  // Quotations
  quotationsHero: {
    light: "/screenshot/quotations/quotations-list.webp",
    dark: "/screenshot/quotations/quotations-list-dark.webp",
  },
  quotationsList: {
    light: "/screenshot/quotations/quotations-list.webp",
    dark: "/screenshot/quotations/quotations-list-dark.webp",
  },
  quotationsForm: {
    light: "/screenshot/quotations/quotations-form.webp",
    dark: "/screenshot/quotations/quotations-form-dark.webp",
  },
  quotationsDetail: {
    light: "/screenshot/quotations/quotations-detail.webp",
    dark: "/screenshot/quotations/quotations-detail-dark.webp",
  },
  quotationsToSalesOrder: {
    light: "/screenshot/quotations/quotations-to-sales-order.webp",
    dark: "/screenshot/quotations/quotations-to-sales-order-dark.webp",
  },
  salesOrderHero: {
    light: "/screenshot/sales/sales-order-hero.webp",
    dark: "/screenshot/sales/sales-order-hero-dark.webp",
  },
  salesOrderEntryFlow: {
    light: "/screenshot/sales/sales-order-entry-flow.webp",
    dark: "/screenshot/sales/sales-order-entry-flow-dark.webp",
  },
  salesOrderBillingCollection: {
    light: "/screenshot/sales/sales-order-billing-collection.webp",
    dark: "/screenshot/sales/sales-order-billing-collection-dark.webp",
  },
  salesOrderFulfillment: {
    light: "/screenshot/sales/sales-order-fulfillment.webp",
    dark: "/screenshot/sales/sales-order-fulfillment-dark.webp",
  },
  // Purchase
  purchaseHero: {
    light: "/screenshot/purchase/purchase-hero.webp",
    dark: "/screenshot/purchase/purchase-hero-dark.webp",
  },
  purchaseRequisitionToPO: {
    light: "/screenshot/purchase/purchase-requisition-to-po.webp",
    dark: "/screenshot/purchase/purchase-requisition-to-po-dark.webp",
  },
  purchaseGRToInvoice: {
    light: "/screenshot/purchase/purchase-gr-to-invoice.webp",
    dark: "/screenshot/purchase/purchase-gr-to-invoice-dark.webp",
  },
  purchasePayableRecap: {
    light: "/screenshot/purchase/purchase-payable-recap.webp",
    dark: "/screenshot/purchase/purchase-payable-recap-dark.webp",
  },
  // Stock / Inventory
  stockInventoryList: {
    light: "/screenshot/stock/stock-inventory-list.webp",
    dark: "/screenshot/stock/stock-inventory-list-dark.webp",
  },
  stockInventoryBatch: {
    light: "/screenshot/stock/stock-inventory-batch.webp",
    dark: "/screenshot/stock/stock-inventory-batch-dark.webp",
  },
  stockOpnameVariance: {
    light: "/screenshot/stock/stock-opname-variance.webp",
    dark: "/screenshot/stock/stock-opname-variance-dark.webp",
  },
  // Goods Receipt
  goodsReceiptHero: {
    light: "/screenshot/goods-receipt/goods-receipt-hero.webp",
    dark: "/screenshot/goods-receipt/goods-receipt-hero-dark.webp",
  },
  goodsReceiptPO: {
    light: "/screenshot/goods-receipt/goods-receipt-po.webp",
    dark: "/screenshot/goods-receipt/goods-receipt-po-dark.webp",
  },
  goodsReceiptAudit: {
    light: "/screenshot/goods-receipt/goods-receipt-audit.webp",
    dark: "/screenshot/goods-receipt/goods-receipt-audit-dark.webp",
  },
  goodsReceiptToInvoice: {
    light: "/screenshot/goods-receipt/goods-receipt-to-invoice.webp",
    dark: "/screenshot/goods-receipt/goods-receipt-to-invoice-dark.webp",
  },
} as const;

