import { navigationConfig, type NavItem } from "@/lib/navigation-config";

function flattenNavigationRoutes(items: readonly NavItem[]): string[] {
  const routes: string[] = [];

  for (const item of items) {
    if (item.url) {
      routes.push(item.url);
    }

    if (item.children && item.children.length > 0) {
      routes.push(...flattenNavigationRoutes(item.children));
    }
  }

  return routes;
}

const EXTRA_VALID_ROUTES = [
  "/stock/movements/create",
  "/finance/journals/inventory",
] as const;

const VALID_DASHBOARD_ROUTES = Array.from(
  new Set([...flattenNavigationRoutes(navigationConfig), ...EXTRA_VALID_ROUTES]),
).sort();

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
