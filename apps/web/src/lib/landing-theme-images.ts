export type LandingScreenshotKey =
  | "dashboard"
  | "pipeline"
  | "salesOrder"
  | "stockInventory"
  | "profitLoss"
  | "customer"
  | "geoPerformance"
  | "salary";

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
    dark: "/screenshot/salary.webp",
  },
} as const;

