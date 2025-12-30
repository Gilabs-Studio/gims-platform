/**
 * Valid dashboard routes configuration
 * These routes correspond to actual page.tsx files in the (dashboard) folder
 */
const VALID_DASHBOARD_ROUTES = [
  "/dashboard",
  // Purchase routes
  "/purchase/supplier-invoices",
  "/purchase/requisitions",
  "/purchase/payment",
  "/purchase/supplier-invoices-dp",
  "/purchase/goods-receipt",
  "/purchase/order",
  // Data Master routes
  "/data-master/partner/supplier",
  "/data-master/company/company",
  "/data-master/user-management/user",
  // HRD routes
  "/hrd/attendance",
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
