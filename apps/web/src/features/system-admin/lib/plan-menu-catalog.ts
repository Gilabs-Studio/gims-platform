import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import type { PlanCategory } from "../types";

export interface PlanMenuItem {
  label: string;
  url: string;
  section: string;
  parents: string[];
}

const POS_EXACT_MENU_URLS = [
  "/dashboard",
  "/pos",
  "/pos/fb/floor-layout",
  "/pos/fb/terminal",
  "/pos/feedback",
  "/pos/feedback/response",
  "/pos/feedback/forms",
  "/pos/loyalty",
  "/pos/loyalty/config",
  "/pos/loyalty/members",
  "/sales/orders",
  "/sales/invoices",
  "/sales/payments",
  "/purchase/purchase-orders",
  "/purchase/supplier-invoices",
  "/purchase/payments",
  "/stock/inventory",
  "/stock/movements",
  "/finance/journals/purchase",
  "/finance/journals/sales",
  "/finance/bank-accounts",
  "/finance/settings/fiscal-years",
] as const;

function normalizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function collectCatalogItems(items: NavItem[], parents: string[] = []): PlanMenuItem[] {
  const catalogItems: PlanMenuItem[] = [];

  for (const item of items) {
    const nextParents = item.name === "Dashboard" ? parents : [...parents, item.name];
    const children = item.children ?? [];
    const normalizedUrl = normalizeUrl(item.url);

    if (normalizedUrl) {
      catalogItems.push({
        label: item.name,
        url: normalizedUrl,
        section: parents[0] ?? item.name,
        parents,
      });
    }

    if (children.length > 0) {
      catalogItems.push(...collectCatalogItems(children, nextParents));
    }
  }

  return catalogItems;
}

const fullCatalog = Array.from(
  collectCatalogItems(navigationConfig)
    .filter((item) => item.url !== "/ai-chatbot" && item.url !== "/ai-settings")
    .reduce((acc, item) => {
      if (!acc.has(item.url)) {
        acc.set(item.url, item);
      }
      return acc;
    }, new Map<string, PlanMenuItem>())
    .values(),
);
const catalogByURL = new Map(fullCatalog.map((item) => [item.url, item]));

function uniqueMenuURLs(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawUrl of urls) {
    const url = normalizeUrl(rawUrl);
    if (!url || seen.has(url) || !catalogByURL.has(url)) {
      continue;
    }
    seen.add(url);
    result.push(url);
  }

  return result;
}

function selectByPrefix(prefixes: string[]): string[] {
  const normalizedPrefixes = prefixes.map((prefix) => normalizeUrl(prefix));
  return fullCatalog
    .filter((item) =>
      normalizedPrefixes.some((prefix) => item.url === prefix || item.url.startsWith(`${prefix}/`)),
    )
    .map((item) => item.url);
}

export function expandMasterDataMenuURLs(urls: readonly string[]): string[] {
  const normalized = uniqueMenuURLs(urls);
  if (!normalized.includes("/master-data")) {
    return normalized;
  }
  return uniqueMenuURLs([...normalized, ...selectByPrefix(["/master-data"])]);
}

export function getPlanMenuCatalog(): PlanMenuItem[] {
  return fullCatalog;
}

export function getDefaultMenuURLsForPlan(options: {
  slug?: string;
  category?: PlanCategory;
  existingMenuURLs?: string[];
}): string[] {
  if (options.existingMenuURLs && options.existingMenuURLs.length > 0) {
    return uniqueMenuURLs(options.existingMenuURLs);
  }

  const slug = (options.slug ?? "").toLowerCase();
  const category = options.category;
  const masterDataURLs = selectByPrefix(["/master-data"]);

  if (slug.startsWith("pos_") || category === "pos") {
    return uniqueMenuURLs([...POS_EXACT_MENU_URLS, ...masterDataURLs]);
  }

  if (slug.startsWith("erp_") || category === "erp") {
    return uniqueMenuURLs([
      "/dashboard",
      "/sales",
      "/purchase",
      "/stock",
      "/finance",
      ...masterDataURLs,
    ]);
  }

  if (slug.startsWith("crm_") || category === "crm") {
    return uniqueMenuURLs([
      "/dashboard",
      "/crm",
      ...masterDataURLs,
    ]);
  }

  if (slug.startsWith("hr_") || category === "hr") {
    return uniqueMenuURLs([
      "/dashboard",
      "/hrd",
      ...masterDataURLs,
    ]);
  }

  if (category === "bundle") {
    return uniqueMenuURLs([
      "/dashboard",
      "/pos",
      "/sales",
      "/purchase",
      "/stock",
      "/finance",
      "/crm",
      "/hrd",
      ...masterDataURLs,
    ]);
  }

  return uniqueMenuURLs(["/dashboard", ...masterDataURLs]);
}

export function getMenuSectionSummary(menuURLs: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const menuURL of menuURLs) {
    const item = catalogByURL.get(normalizeUrl(menuURL));
    if (!item) {
      continue;
    }
    counts[item.section] = (counts[item.section] ?? 0) + 1;
  }
  return counts;
}
