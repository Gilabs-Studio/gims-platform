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
  | "financialReportsReview";

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
} as const;

