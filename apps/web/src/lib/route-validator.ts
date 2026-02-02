/**
 * Valid dashboard routes configuration
 * These routes correspond to actual page.tsx files in the (dashboard) folder
 */
const VALID_DASHBOARD_ROUTES = [
  "/dashboard",
  // Master Data routes
  "/master-data/countries",
  "/master-data/provinces",
  "/master-data/cities",
  "/master-data/districts",
  "/master-data/villages",
  "/master-data/company",
  "/master-data/divisions",
  "/master-data/job-positions",
  "/master-data/business-units",
  "/master-data/business-types",
  "/master-data/areas",
  "/master-data/area-supervisors",
  "/master-data/employees",
  "/master-data/suppliers",
  "/master-data/supplier-types",
  "/master-data/banks",
  "/master-data/products",
  "/master-data/product-categories",
  "/master-data/product-brands",
  "/master-data/product-segments",
  "/master-data/product-types",
  "/master-data/packaging",
  "/master-data/uom",
  "/master-data/procurement-types",
  "/master-data/warehouses",
  "/master-data/payment-terms",
  "/master-data/courier-agencies",
  "/master-data/so-sources",
  "/master-data/leave-types",
  "/master-data/users",
  // Sales routes
  "/sales/quotations",
  "/sales/orders",
  "/sales/delivery-orders",
  "/sales/invoices",
  "/sales/visits",
  "/sales/estimations",
  "/sales/targets",
  // Purchase routes
  "/purchase/purchase-requisitions",
  "/purchase/orders",
  "/purchase/goods-receipt",
  "/purchase/invoices",
  // Stock routes
  "/stock/inventory",
  "/stock/movements",
  "/stock/opname",
  // Finance routes
  "/finance/coa",
  "/finance/journals",
  "/finance/bank-accounts",
  "/finance/payments",
  "/finance/tax-invoices",
  "/finance/non-trade-payables",
  "/finance/budget",
  "/finance/cash-bank",
  "/finance/closing",
  "/finance/assets",
  "/finance/up-country-cost",
  "/finance/salary",
  // HRD routes
  "/hrd/attendance",
  "/hrd/leave-requests",
  "/hrd/contracts",
  "/hrd/education",
  "/hrd/certifications",
  "/hrd/employee-assets",
  "/hrd/evaluation",
  "/hrd/recruitment",
  "/hrd/work-schedule",
  "/hrd/holidays",
  // Reports
  "/reports",
  // AI Assistant
  "/ai-chatbot",
  "/ai-settings",
] as const;

/**
 * Checks if a given route path is valid and exists in the application
 * 
 * @param href - The route path to validate
 * @returns true if the route exists, false if it would result in 404
 */
export function isValidRoute(href: string | null | undefined): boolean {
  if (!href || href.trim() === "") {
    return false;
  }

  // Remove leading/trailing slashes and normalize path
  const normalizedPath = href.trim().replace(/^\/+|\/+$/g, "");
  
  // Empty path after normalization
  if (normalizedPath === "") {
    return false;
  }

  // Check if the path matches any valid route
  const pathWithSlash = `/${normalizedPath}`;
  return (VALID_DASHBOARD_ROUTES as readonly string[]).includes(pathWithSlash);
}

/**
 * Get all valid dashboard routes
 * Useful for debugging or generating route lists
 */
export function getValidRoutes(): readonly string[] {
  return VALID_DASHBOARD_ROUTES;
}
