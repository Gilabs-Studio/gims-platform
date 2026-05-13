"use client";

import { useState, useMemo, useCallback, memo, startTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "@/components/ui/drawer";
import { usePermissions } from "../hooks/use-permissions";
import { useRole, useAssignPermissionsToRole } from "../hooks/use-roles";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Search, X, Info, Lock, Zap } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMenuIcon } from "@/lib/menu-icons";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import { isValidRoute } from "@/lib/route-validator";
import { ButtonLoading } from "@/components/loading";
import type { Permission, PermissionScope } from "../types";
import { Input } from "@/components/ui/input";
import { billingService } from "@/features/settings/services/billing-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignPermissionsDrawerProps {
  readonly roleId: string;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCOPE_OPTIONS: PermissionScope[] = ["OWN", "DIVISION", "AREA", "WAREHOUSE", "OUTLET", "ALL"];

const SCOPE_I18N_KEYS: Record<PermissionScope, string> = {
  OWN: "scope.own",
  DIVISION: "scope.division",
  AREA: "scope.area",
  WAREHOUSE: "scope.warehouse",
  OUTLET: "scope.outlet",
  ALL: "scope.all",
};

const SCOPE_DESC_KEYS: Record<PermissionScope, string> = {
  OWN: "scope.ownDescription",
  DIVISION: "scope.divisionDescription",
  AREA: "scope.areaDescription",
  WAREHOUSE: "scope.warehouseDescription",
  OUTLET: "scope.outletDescription",
  ALL: "scope.allDescription",
};

// Deterministic ordering for actions within a resource row
const ACTION_ORDER: Record<string, number> = {
  view: 0, read: 1, create: 2, update: 3, edit: 4,
  delete: 5, manage: 6, approve: 7, reject: 8, assign_permissions: 9,
  export: 10, import: 11,
};

function parsePermissionCode(code?: string): { resource: string; action: string } {
  if (!code) {
    return { resource: "", action: "" };
  }

  const parts = code
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { resource: "", action: "" };
  }

  if (parts.length === 1) {
    return { resource: parts[0] ?? "", action: "" };
  }

  return {
    resource: parts.slice(0, -1).join("."),
    action: parts[parts.length - 1] ?? "",
  };
}

/**
 * Maps normalized section names (lowercase) to the module slug returned by
 * /billing/entitlements. Used to determine whether a permission section is
 * available on the tenant's current plan.
 */
const SECTION_TO_MODULE: Record<string, string> = {
  pos: "pos",
  "point of sale": "pos",
  hrd: "hr",
  hr: "hr",
  hrm: "hr",
  "human resources": "hr",
  crm: "crm",
  finance: "finance",
  sales: "sales",
  purchase: "purchase",
  inventory: "inventory",
  "master data": "core",
};

const MODULE_LABELS: Record<string, string> = {
  pos: "POS",
  sales: "Sales",
  purchase: "Purchase",
  inventory: "Stock",
  finance: "Finance",
  crm: "CRM",
  hr: "HR",
  core: "Master Data",
};

const ALWAYS_ALLOWED_PERMISSION_PREFIXES = [
  "role.",
  "permission.",
  "company.",
  // Finance Accounting module - never protected by entitlements
  "coa.",
  "journal.",
  "sales_journal.",
  "purchase_journal.",
  "adjustment_journal.",
  "financial_closing.",
] as const;
const SYSTEM_ADMIN_ONLY_PERMISSION_CODES = new Set(["currency.create", "currency.update", "currency.delete"]);

function isSystemAdminOnlyPermission(permission: Permission): boolean {
  return SYSTEM_ADMIN_ONLY_PERMISSION_CODES.has(permission.code.trim().toLowerCase());
}

function isAlwaysSafePermissionCode(code: string): boolean {
  const lower = code.trim().toLowerCase();
  return ALWAYS_ALLOWED_PERMISSION_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function matchesEntitledMenuPath(menuURL: string, entitledMenuURLSet: Set<string>): boolean {
  if (entitledMenuURLSet.has(menuURL)) {
    return true;
  }

  if (entitledMenuURLSet.has("/master-data") && menuURL.startsWith("/master-data/")) {
    return true;
  }

  return false;
}

function normalizeModuleSlug(module?: string): string {
  const value = (module ?? "").trim().toLowerCase();
  if (!value) {
    return "";
  }
  if (value === "hrd") {
    return "hr";
  }
  if (value === "master_data" || value === "master-data") {
    return "core";
  }
  if (value === "stock") {
    return "inventory";
  }
  return value;
}

function isAlwaysAllowedPermission(permissionCode: string): boolean {
  const code = permissionCode.trim().toLowerCase();
  if (!code) {
    return true;
  }
  return ALWAYS_ALLOWED_PERMISSION_PREFIXES.some((prefix) => code.startsWith(prefix));
}

function normalizePath(path?: string): string {
  if (!path) return "";
  const trimmed = path.trim().toLowerCase();
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function detectNodeModule(node: PermissionTreeNode): string | undefined {
  const url = normalizePath(node.url);
  if (!url) {
    return SECTION_TO_MODULE[node.name.toLowerCase()];
  }

  if (url.startsWith("/hrd")) return "hr";
  if (url.startsWith("/stock")) return "inventory";
  if (url.startsWith("/pos")) return "pos";
  if (url.startsWith("/crm")) return "crm";
  if (url.startsWith("/finance")) return "finance";
  if (url.startsWith("/sales")) return "sales";
  if (url.startsWith("/purchase")) return "purchase";
  if (url.startsWith("/master-data")) return "core";

  return SECTION_TO_MODULE[node.name.toLowerCase()];
}

function getNodeLockMetaForPlan(
  node: PermissionTreeNode,
  options: {
    entitledModuleSet: Set<string>;
    hasEntitlementRestriction: boolean;
    hasModuleEntitlements: boolean;
    isPermissionAllowedByPlan: (permission: Permission) => boolean;
  },
): { locked: boolean; moduleLabel?: string } {
  const moduleSlug = normalizeModuleSlug(detectNodeModule(node));
  const moduleLabel = moduleSlug ? MODULE_LABELS[moduleSlug] : undefined;

  if (node.type === "resource") {
    const perms = node.permissions ?? [];
    if (perms.length === 0) {
      return { locked: false, moduleLabel };
    }
    const allowedCount = perms.filter((permission) => options.isPermissionAllowedByPlan(permission)).length;
    return { locked: allowedCount === 0, moduleLabel };
  }

  if (!options.hasEntitlementRestriction) {
    return { locked: false, moduleLabel };
  }

  if (options.hasModuleEntitlements && moduleSlug && !options.entitledModuleSet.has(moduleSlug)) {
    return { locked: true, moduleLabel };
  }

  const childNodes = node.children ?? [];
  if (childNodes.length === 0) {
    return { locked: false, moduleLabel };
  }

  const allChildrenLocked = childNodes.every((child) =>
    getNodeLockMetaForPlan(child, options).locked,
  );
  return { locked: allChildrenLocked, moduleLabel };
}

function detectPermissionModule(permission: Permission): string | undefined {
  const menuUrl = normalizePath(permission.menu?.url);
  if (menuUrl.startsWith("/hrd")) return "hr";
  if (menuUrl.startsWith("/stock")) return "inventory";
  if (menuUrl.startsWith("/pos")) return "pos";
  if (menuUrl.startsWith("/crm")) return "crm";
  if (menuUrl.startsWith("/finance")) return "finance";
  if (menuUrl.startsWith("/sales")) return "sales";
  if (menuUrl.startsWith("/purchase")) return "purchase";
  if (menuUrl.startsWith("/master-data")) return "core";

  const menuName = permission.menu?.name?.toLowerCase();
  if (menuName && SECTION_TO_MODULE[menuName]) {
    return SECTION_TO_MODULE[menuName];
  }

  const { resource } = parsePermissionCode(permission.code.toLowerCase());
  if (resource.startsWith("crm")) return "crm";
  if (resource.startsWith("pos")) return "pos";
  if (resource.startsWith("sales")) return "sales";
  if (resource.startsWith("purchase")) return "purchase";
  if (resource.startsWith("finance")) return "finance";
  if (resource.startsWith("inventory") || resource.startsWith("stock")) return "inventory";
  if (resource.startsWith("hr") || resource.startsWith("hrd")) return "hr";

  return undefined;
}


function actionSortKey(perm: Permission): number {
  const { action } = parsePermissionCode(perm.code);
  return ACTION_ORDER[action ?? ""] ?? 99;
}

// Actions that don't need scope (creating new resources has no ownership yet)
function isScopeApplicable(action?: string): boolean {
  if (!action) return true;
  return action.toLowerCase() !== "create";
}

// ---------------------------------------------------------------------------
// Action Badge
// ---------------------------------------------------------------------------

function getActionBadgeVariant(action: string):
  | "default" | "secondary" | "destructive" | "outline"
  | "success" | "warning" | "active" | "inactive" {
  switch (action) {
    case "view": case "read": return "default";
    case "create": return "success";
    case "update": case "edit": return "warning";
    case "delete": return "destructive";
    default: return "inactive";
  }
}

// ---------------------------------------------------------------------------
// Tree Data Types
// ---------------------------------------------------------------------------

interface PermissionTreeNode {
  id: string;
  name: string;
  icon: string;
  url?: string;
  type: "section" | "group" | "resource";
  children?: PermissionTreeNode[];
  resource?: string;
  permissions?: Permission[];
}

interface TreeCounts {
  total: number;
  selected: number;
}

// ---------------------------------------------------------------------------
// Build Permission Tree from navigationConfig + API permissions
// ---------------------------------------------------------------------------

function buildPermissionTree(
  navConfig: NavItem[],
  permissions: Permission[],
  tNav?: (key: string) => string
): PermissionTreeNode[] {
  const normalizeRoute = (path?: string): string => {
    if (!path) return "";
    const trimmed = path.trim().replace(/^\/+|\/+$/g, "");
    return trimmed ? `/${trimmed}` : "";
  };

  const getResourceFromCode = (code?: string): string => parsePermissionCode(code).resource;

  const toTitle = (value: string): string =>
    value
      .replace(/\./g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const permsByResource = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const resource = getResourceFromCode(permission.code);
    if (!resource) continue;
    if (!permsByResource.has(resource)) permsByResource.set(resource, []);
    permsByResource.get(resource)!.push(permission);
  }
  for (const groupedPerms of permsByResource.values()) {
    groupedPerms.sort((a, b) => actionSortKey(a) - actionSortKey(b));
  }

  const usedPermissionIds = new Set<string>();

  const getUnmatchedPerms = (perms: Permission[]): Permission[] =>
    perms.filter((perm) => !usedPermissionIds.has(perm.id));

  const getUnmatchedPermsByMenuUrl = (menuUrl: string): Permission[] => {
    if (!menuUrl) return [];

    return permissions
      .filter((perm) => !usedPermissionIds.has(perm.id))
      .filter((perm) => normalizeRoute(perm.menu?.url) === menuUrl)
      .sort((a, b) => actionSortKey(a) - actionSortKey(b));
  };

  const markUsed = (perms: Permission[]): void => {
    for (const perm of perms) {
      usedPermissionIds.add(perm.id);
    }
  };

  const makeResourceNode = (
    id: string,
    name: string,
    icon: string,
    resource: string,
    perms: Permission[],
    url?: string,
  ): PermissionTreeNode => ({
    id,
    name,
    icon,
    url,
    type: "resource",
    resource,
    permissions: perms,
  });

  function processNode(nav: NavItem, depth: number): PermissionTreeNode | null {
    const translatedName = nav.i18nKey && tNav ? tNav(nav.i18nKey) || nav.name : nav.name;
    const normalizedUrl = normalizeRoute(nav.url);
    const hasChildren = Boolean(nav.children?.length);
    const navResource = getResourceFromCode(nav.permission);
    const selfPerms = navResource
      ? getUnmatchedPerms(permsByResource.get(navResource) ?? [])
      : [];

    if (!hasChildren) {
      let resourceToUse = "";
      let permsToUse: Permission[] = [];

      // Case 1: nav item has permission field with matching permissions
      if (navResource && selfPerms.length > 0) {
        resourceToUse = navResource;
        permsToUse = selfPerms;
        markUsed(selfPerms);
      } else if (normalizedUrl) {
        // Case 2: derive permissions from permission.menu.url
        const menuMatchedPerms = getUnmatchedPermsByMenuUrl(normalizedUrl);
        if (menuMatchedPerms.length > 0) {
          const groupedByResource = new Map<string, Permission[]>();
          for (const perm of menuMatchedPerms) {
            const resource = getResourceFromCode(perm.code);
            if (!resource) continue;
            if (!groupedByResource.has(resource)) groupedByResource.set(resource, []);
            groupedByResource.get(resource)!.push(perm);
          }

          if (groupedByResource.size > 0) {
            const [primaryResource, primaryPerms] = Array.from(groupedByResource.entries())[0];
            resourceToUse = primaryResource;
            permsToUse = primaryPerms;

            // Merge all permissions under primary resource
            for (const [resource, perms] of groupedByResource) {
              if (resource !== primaryResource) {
                permsToUse = [...permsToUse, ...perms];
              }
            }
            permsToUse.sort((a, b) => actionSortKey(a) - actionSortKey(b));
            markUsed(permsToUse);
          }
        }
      }

      // Case 3: no nav.permission and no menu.url permission match
      // Still create node to preserve navigation structure, with empty permissions
      if (!resourceToUse) {
        resourceToUse = nav.name.toLowerCase().replace(/\s+/g, "_");
      }

      return makeResourceNode(
        `resource-${resourceToUse}-${normalizedUrl.replace(/[^a-zA-Z0-9]/g, "-")}`,
        translatedName,
        nav.icon,
        resourceToUse,
        permsToUse,
        normalizedUrl || undefined,
      );
    }

    const children: PermissionTreeNode[] = [];

    // Keep branch-level permissions visible (example: /reports -> report.view).
    if (navResource && selfPerms.length > 0) {
      markUsed(selfPerms);
      children.push(
        makeResourceNode(
          `resource-${navResource}-${normalizedUrl.replace(/[^a-zA-Z0-9]/g, "-")}`,
          translatedName,
          nav.icon,
          navResource,
          selfPerms,
          normalizedUrl || undefined,
        ),
      );
    }

    for (const child of nav.children ?? []) {
      const node = processNode(child, depth + 1);
      if (node) children.push(node);
    }

    if (children.length === 0) return null;

    return {
      id: `${depth === 0 ? "section" : "group"}-${translatedName}`,
      name: translatedName,
      icon: nav.icon,
      url: normalizedUrl || undefined,
      type: depth === 0 ? "section" : "group",
      children,
    };
  }

  const tree: PermissionTreeNode[] = [];
  for (const nav of navConfig) {
    const node = processNode(nav, 0);
    if (node) tree.push(node);
  }

  const urlIndex = new Map<string, { node: PermissionTreeNode; parent: PermissionTreeNode | null }>();
  const topSectionsByUrl = new Map<string, PermissionTreeNode>();

  const indexTree = (nodes: PermissionTreeNode[], parent: PermissionTreeNode | null): void => {
    for (const node of nodes) {
      const nodeUrl = normalizeRoute(node.url);
      if (nodeUrl) {
        urlIndex.set(nodeUrl, { node, parent });
        if (!parent && node.type === "section") {
          topSectionsByUrl.set(nodeUrl, node);
        }
      }
      if (node.children?.length) {
        indexTree(node.children, node);
      }
    }
  };

  indexTree(tree, null);

  const createOrphanNode = (resource: string, perms: Permission[]): PermissionTreeNode => {
    const menuIcon = perms.find((perm) => perm.menu?.icon)?.menu?.icon;
    const menuUrl = normalizeRoute(perms.find((perm) => perm.menu?.url)?.menu?.url);
    return {
      id: `resource-${resource}`,
      name: toTitle(resource),
      icon: menuIcon ?? "file",
      url: menuUrl || undefined,
      type: "resource",
      resource,
      permissions: perms,
    };
  };

  const globalOrphans: PermissionTreeNode[] = [];

  for (const [resource, allPerms] of permsByResource) {
    const remainingPerms = getUnmatchedPerms(allPerms);
    if (remainingPerms.length === 0) continue;

    const menuUrl = normalizeRoute(remainingPerms[0]?.menu?.url);
    let targetContainer: PermissionTreeNode | null = null;

    if (menuUrl && (isValidRoute(menuUrl) || urlIndex.has(menuUrl))) {
      const indexedTarget = urlIndex.get(menuUrl);
      if (indexedTarget) {
        targetContainer =
          indexedTarget.node.type === "resource"
            ? indexedTarget.parent
            : indexedTarget.node;
      } else {
        const topLevelSegment = menuUrl.split("/")[1];
        if (topLevelSegment) {
          targetContainer = topSectionsByUrl.get(`/${topLevelSegment}`) ?? null;
        }
      }
    }

    if (targetContainer?.children) {
      const existingNode = targetContainer.children.find(
        (child) => child.type === "resource" && child.resource === resource,
      );

      if (existingNode?.permissions) {
        const mergedById = new Map(existingNode.permissions.map((perm) => [perm.id, perm]));
        for (const perm of remainingPerms) {
          mergedById.set(perm.id, perm);
        }
        existingNode.permissions = Array.from(mergedById.values()).sort(
          (a, b) => actionSortKey(a) - actionSortKey(b),
        );
      } else {
        targetContainer.children.push(createOrphanNode(resource, remainingPerms));
      }

      markUsed(remainingPerms);
      continue;
    }

    globalOrphans.push(createOrphanNode(resource, remainingPerms));
  }

  if (globalOrphans.length > 0) {
    tree.push({
      id: "section-Other",
      name: "Other",
      icon: "more-horizontal",
      type: "section",
      children: globalOrphans,
    });
  }

  return tree;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Collect all permission IDs reachable from a subtree */
function collectPermissionIds(node: PermissionTreeNode): string[] {
  if (node.type === "resource") return node.permissions?.map((p) => p.id) ?? [];
  return node.children?.flatMap(collectPermissionIds) ?? [];
}

/** Compute { total, selected } counts for every node, stored in a flat map */
function computeCountsMap(
  nodes: PermissionTreeNode[],
  selected: Record<string, string>,
): Map<string, TreeCounts> {
  const map = new Map<string, TreeCounts>();

  function walk(node: PermissionTreeNode): TreeCounts {
    if (node.type === "resource") {
      const total = node.permissions?.length ?? 0;
      const sel = node.permissions?.filter((p) => p.id in selected).length ?? 0;
      const c = { total, selected: sel };
      map.set(node.id, c);
      return c;
    }
    let t = 0, s = 0;
    for (const child of node.children ?? []) {
      const cc = walk(child);
      t += cc.total;
      s += cc.selected;
    }
    const c = { total: t, selected: s };
    map.set(node.id, c);
    return c;
  }

  for (const n of nodes) walk(n);
  return map;
}

/** Filter tree to only nodes matching a search query */
function filterTree(nodes: PermissionTreeNode[], query: string): PermissionTreeNode[] {
  const q = query.toLowerCase();
  return nodes.reduce<PermissionTreeNode[]>((acc, node) => {
    if (node.type === "resource") {
      const matches =
        node.name.toLowerCase().includes(q) ||
        node.resource?.toLowerCase().includes(q) ||
        node.permissions?.some(
          (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
        );
      if (matches) acc.push(node);
    } else if (node.children) {
      const filtered = filterTree(node.children, q);
      if (filtered.length > 0) acc.push({ ...node, children: filtered });
    }
    return acc;
  }, []);
}

// ---------------------------------------------------------------------------
// Tree Node Components (memoised for progressive rendering)
// ---------------------------------------------------------------------------

/** Single resource row - shows inline action checkboxes + scope */
const TreeResourceRow = memo(function TreeResourceRow({
  node,
  depth,
  selected,
  onToggle,
  onToggleAll,
  onUpdateScope,
  t,
  isLocked = false,
}: {
  node: PermissionTreeNode;
  depth: number;
  selected: Record<string, string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onUpdateScope: (id: string, scope: PermissionScope) => void;
  t: ReturnType<typeof useTranslations>;
  isLocked?: boolean;
}) {
  const perms = useMemo(() => node.permissions ?? [], [node.permissions]);
  const permIds = useMemo(() => perms.map((p) => p.id), [perms]);

  const selectedCount = useMemo(() => perms.filter((p) => p.id in selected).length, [perms, selected]);
  const allSelected = selectedCount === perms.length && perms.length > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  // Determine the scope to display (common scope across selected perms)
  const scopeApplicablePerms = useMemo(
    () =>
      perms.filter((p) => {
        const { action } = parsePermissionCode(p.code);
        return p.id in selected && isScopeApplicable(action);
      }),
    [perms, selected],
  );
  const displayScope = scopeApplicablePerms.length > 0
    ? (selected[scopeApplicablePerms[0].id] ?? "ALL")
    : "ALL";
  const hasMixedScopes = scopeApplicablePerms.length > 1 &&
    scopeApplicablePerms.some((p) => selected[p.id] !== displayScope);

  const handleMasterToggle = useCallback(() => {
    onToggleAll(permIds, !allSelected);
  }, [permIds, allSelected, onToggleAll]);

  const handleScopeChange = useCallback(
    (scope: string) => {
      for (const p of scopeApplicablePerms) {
        onUpdateScope(p.id, scope as PermissionScope);
      }
    },
    [scopeApplicablePerms, onUpdateScope],
  );

  const paddingLeft = 16 + depth * 24;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 pr-4 border-b border-border/40 transition-colors",
        isLocked
          ? "opacity-50 pointer-events-none select-none bg-muted/10"
          : "hover:bg-muted/40",
        !isLocked && someSelected && "bg-primary/2",
        !isLocked && allSelected && "bg-primary/5",
      )}
      style={{ paddingLeft }}
    >
      {/* Resource master checkbox */}
      {isLocked ? (
        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={handleMasterToggle}
          className="cursor-pointer"
          aria-label={`Toggle all permissions for ${node.name}`}
        />
      )}

      {/* Resource icon + name */}
      <span className="shrink-0 text-muted-foreground">{getMenuIcon(node.icon)}</span>
      <span className="text-sm font-medium min-w-[120px] truncate">{node.name}</span>

      {/* Inline action checkboxes */}
      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {perms.map((perm) => {
          const { action } = parsePermissionCode(perm.code);
          const isChecked = perm.id in selected;
          const isProtected = isAlwaysSafePermissionCode(perm.code);
          
          return (
            <Tooltip key={perm.id}>
              <TooltipTrigger asChild>
                <label className={cn(
                  "inline-flex items-center gap-1 select-none",
                  !isProtected && "cursor-pointer",
                  isProtected && "cursor-not-allowed opacity-75"
                )}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => !isProtected && onToggle(perm.id)}
                    disabled={isProtected}
                    className={cn("size-3.5", isProtected && "cursor-not-allowed")}
                  />
                  <Badge
                    variant={getActionBadgeVariant(action ?? "")}
                    className="text-[10px] px-1.5 py-0 capitalize leading-5"
                  >
                    {action}
                  </Badge>
                  {isProtected && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-4">
                      {t("protected") || "Protected"}
                    </Badge>
                  )}
                </label>
              </TooltipTrigger>
              {isProtected && (
                <TooltipContent side="top" className="text-xs">
                  {t("protectedPermissionTooltip") || "This permission cannot be removed"}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>

      {/* Scope dropdown - visible when at least one scope-applicable perm is selected */}
      {!isLocked && scopeApplicablePerms.length > 0 ? (
        <Select value={displayScope} onValueChange={handleScopeChange}>
          <SelectTrigger
            className={cn(
              "w-[110px] h-7 text-xs cursor-pointer shrink-0",
              hasMixedScopes && "border-warning text-warning",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPE_OPTIONS.map((scope) => (
              <SelectItem key={scope} value={scope} className="cursor-pointer">
                <span className="text-xs">{t(SCOPE_I18N_KEYS[scope])}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="w-[110px] shrink-0" />
      )}
    </div>
  );
});

/** Collapsible group or section node */
const TreeBranchNode = memo(function TreeBranchNode({
  node,
  depth,
  expanded,
  onToggleExpand,
  counts,
  selected,
  onToggle,
  onToggleAll,
  onUpdateScope,
  t,
  searchActive,
  isLocked,
  lockedModuleLabel,
  getNodeLockMeta,
}: {
  node: PermissionTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  counts: Map<string, TreeCounts>;
  selected: Record<string, string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onUpdateScope: (id: string, scope: PermissionScope) => void;
  t: ReturnType<typeof useTranslations>;
  searchActive: boolean;
  isLocked?: boolean;
  lockedModuleLabel?: string;
  getNodeLockMeta: (node: PermissionTreeNode) => { locked: boolean; moduleLabel?: string };
}) {
  const isExpanded = searchActive || expanded.has(node.id);
  const count = counts.get(node.id) ?? { total: 0, selected: 0 };
  const allSelected = count.selected === count.total && count.total > 0;
  const someSelected = count.selected > 0 && !allSelected;
  const isSection = node.type === "section";

  const handleToggleExpand = useCallback(() => {
    startTransition(() => {
      onToggleExpand(node.id);
    });
  }, [node.id, onToggleExpand]);

  const handleMasterToggle = useCallback(() => {
    const ids = collectPermissionIds(node);
    onToggleAll(ids, !allSelected);
  }, [node, allSelected, onToggleAll]);

  const paddingLeft = 8 + depth * 24;

  return (
    <div className="relative">
      {/* Header row */}
      <div
        className={cn(
          "flex items-center gap-2 pr-4 border-b cursor-pointer transition-colors select-none",
          isSection
            ? "bg-muted/50 hover:bg-muted/70 py-2.5"
            : "bg-muted/20 hover:bg-muted/40 py-2",
          isLocked && "opacity-50 pointer-events-none",
        )}
        style={{ paddingLeft }}
        onClick={handleToggleExpand}
        role="button"
        tabIndex={isLocked ? -1 : 0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
      >
        {isLocked ? (
          <Lock className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform shrink-0",
              isExpanded && "rotate-90",
            )}
          />
        )}
        {!isLocked && (
          <span
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleMasterToggle();
            }}
            role="button"
            tabIndex={0}
            aria-label={`Toggle all in ${node.name}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleMasterToggle();
              }
            }}
          >
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              className="cursor-pointer"
              tabIndex={-1}
            />
          </span>
        )}
        <span className={cn("shrink-0", isSection ? "text-primary" : "text-muted-foreground")}>
          {getMenuIcon(node.icon)}
        </span>
        <span
          className={cn(
            "text-sm font-medium flex-1 truncate",
            isSection && "font-semibold",
          )}
        >
          {node.name}
        </span>
        {isLocked && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {t("moduleLocked")}
          </span>
        )}
        {isLocked && lockedModuleLabel && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {lockedModuleLabel}
          </span>
        )}
        {!isLocked && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {count.selected}/{count.total}
          </span>
        )}
      </div>

      {/* Children - only rendered when expanded (progressive loading) */}
      {isExpanded && node.children && !isLocked && (
        <div>
          {node.children.map((child) =>
            child.type === "resource" ? (
              <TreeResourceRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selected={selected}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
                onUpdateScope={onUpdateScope}
                t={t}
                isLocked={getNodeLockMeta(child).locked}
              />
            ) : (
              <TreeBranchNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                counts={counts}
                selected={selected}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
                onUpdateScope={onUpdateScope}
                t={t}
                searchActive={searchActive}
                isLocked={getNodeLockMeta(child).locked}
                lockedModuleLabel={getNodeLockMeta(child).moduleLabel}
                getNodeLockMeta={getNodeLockMeta}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Permission Selector (inner component)
// ---------------------------------------------------------------------------

function PermissionsSelector({
  role,
  permissions,
  roleId,
  onClose,
}: {
  readonly role: NonNullable<ReturnType<typeof useRole>["data"]>;
  readonly permissions: Permission[];
  readonly roleId: string;
  readonly onClose: () => void;
}) {
  const assignPermissions = useAssignPermissionsToRole();
  const t = useTranslations("userManagement.assignPermissions");
  const tNav = useTranslations("navigation");
  const locale = useLocale();
  const isSystemAdmin = useAuthStore((state) => state.user?.role.code === "system_admin");
  const upgradeHref = `/${locale}/profile?tab=billing`;
  const visiblePermissions = useMemo(
    () => permissions.filter((permission) => isSystemAdmin || !isSystemAdminOnlyPermission(permission)),
    [isSystemAdmin, permissions],
  );

  // Provide a stable, typed translator function for buildPermissionTree
  const tNavFn = useMemo(() => (key: string) => tNav(key), [tNav]);

  // Fetch tenant entitlements to determine which module sections are locked.
  const { data: entitlementData } = useQuery({
    queryKey: ["my-entitlements"],
    queryFn: () => billingService.getMyEntitlements(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const permissionByID = useMemo(
    () => new Map(visiblePermissions.map((permission) => [permission.id, permission])),
    [visiblePermissions],
  );

  const permissionIdByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const permission of visiblePermissions) {
      const normalizedCode = permission.code.trim().toLowerCase();
      if (!normalizedCode) {
        continue;
      }
      if (!map.has(normalizedCode)) {
        map.set(normalizedCode, permission.id);
      }
    }
    return map;
  }, [visiblePermissions]);

  const effectiveEntitledModules = useMemo(
    () =>
      (entitlementData?.modules ?? [])
      .map((moduleSlug) => normalizeModuleSlug(moduleSlug))
      .filter(Boolean),
    [entitlementData?.modules],
  );

  const entitledMenuURLSet = useMemo(
    () =>
      new Set(
        (entitlementData?.menu_urls ?? [])
          .map((menuURL) => normalizePath(menuURL))
          .filter(Boolean),
      ),
    [entitlementData?.menu_urls],
  );

  const entitledPermissionCodeSet = useMemo(
    () =>
      new Set(
        (entitlementData?.permission_codes ?? [])
          .map((code) => code.trim().toLowerCase())
          .filter(Boolean),
      ),
    [entitlementData?.permission_codes],
  );

  const entitledModuleSet = useMemo(() => new Set(effectiveEntitledModules), [effectiveEntitledModules]);
  const hasGranularPolicy = entitledMenuURLSet.size > 0 || entitledPermissionCodeSet.size > 0;
  const hasModuleEntitlements = entitledModuleSet.size > 0;
  const roleCode = role.code.trim().toLowerCase();
  const bypassEntitlementRestriction =
    isSystemAdmin || roleCode === "system_admin" || roleCode === "admin";
  const hasEntitlementRestriction =
    !bypassEntitlementRestriction && (hasModuleEntitlements || hasGranularPolicy);

  const isPermissionAllowedByPlanPolicy = useCallback(
    (permission: Permission): boolean => {
      if (!hasGranularPolicy) {
        return true;
      }

      const code = permission.code.trim().toLowerCase();
      if (code && entitledPermissionCodeSet.has(code)) {
        return true;
      }

      const menuURL = normalizePath(permission.menu?.url);
      if (!menuURL) {
        return true;
      }

      return matchesEntitledMenuPath(menuURL, entitledMenuURLSet);
    },
    [entitledMenuURLSet, entitledPermissionCodeSet, hasGranularPolicy],
  );

  const isPermissionAllowedByPlan = useCallback(
    (permission: Permission): boolean => {
      if (bypassEntitlementRestriction) {
        return true;
      }
      if (isAlwaysAllowedPermission(permission.code)) {
        return true;
      }
      if (!hasEntitlementRestriction) {
        return true;
      }
      const permissionModule = normalizeModuleSlug(detectPermissionModule(permission));
      if (!permissionModule) {
        return isPermissionAllowedByPlanPolicy(permission);
      }
      if (hasModuleEntitlements && !entitledModuleSet.has(permissionModule)) {
        return false;
      }
      return isPermissionAllowedByPlanPolicy(permission);
    },
    [
      bypassEntitlementRestriction,
      entitledModuleSet,
      hasEntitlementRestriction,
      hasModuleEntitlements,
      isPermissionAllowedByPlanPolicy,
    ],
  );

  const getNodeLockMeta = useMemo(
    () => (node: PermissionTreeNode) =>
      getNodeLockMetaForPlan(node, {
        entitledModuleSet,
        hasEntitlementRestriction,
        hasModuleEntitlements,
        isPermissionAllowedByPlan,
      }),
    [entitledModuleSet, hasEntitlementRestriction, hasModuleEntitlements, isPermissionAllowedByPlan],
  );

  // Build tree from navConfig + permissions (stable across renders)
  const tree = useMemo(
    () => buildPermissionTree(navigationConfig, visiblePermissions, tNavFn),
    [visiblePermissions, tNavFn],
  );

  // No hardcoded tree alteration needed, relies on API returned module entitlements
  const planScopedTree = tree;

  // Valid permission ID set for filtering stale IDs from the role
  const validPermIds = useMemo(() => new Set(visiblePermissions.map((permission) => permission.id)), [visiblePermissions]);

  // Initialize state - filter out stale permission IDs that no longer exist
  const initialPermissions = useMemo(() => {
    const map: Record<string, string> = {};
    if (role?.permissions?.length) {
      for (const p of role.permissions) {
        let targetPermissionId = p.id;
        if (!validPermIds.has(targetPermissionId)) {
          const fallbackId = permissionIdByCode.get(p.code.trim().toLowerCase());
          if (!fallbackId) {
            continue;
          }
          targetPermissionId = fallbackId;
        }

        const permission = permissionByID.get(targetPermissionId);
        if (!permission || !isPermissionAllowedByPlan(permission)) {
          continue;
        }

        map[targetPermissionId] = p.scope ?? "ALL";
      }
    }
    return map;
  }, [role, validPermIds, permissionByID, permissionIdByCode, isPermissionAllowedByPlan]);

  const [selectedPermissions, setSelectedPermissions] =
    useState<Record<string, string>>(initialPermissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const searchActive = searchQuery.trim().length > 0;



  // Filtered tree for search
  const displayTree = useMemo(() => {
    if (!searchActive) return planScopedTree;
    return filterTree(planScopedTree, searchQuery.trim());
  }, [planScopedTree, searchQuery, searchActive]);

  // Counts map
  const countsMap = useMemo(
    () => computeCountsMap(displayTree, selectedPermissions),
    [displayTree, selectedPermissions],
  );

  // Total counts
  const totalCounts = useMemo(() => {
    let total = 0,
      selected = 0;
    for (const node of displayTree) {
      const c = countsMap.get(node.id);
      if (c) {
        total += c.total;
        selected += c.selected;
      }
    }
    return { total, selected };
  }, [displayTree, countsMap]);

  const hasLockedNode = useMemo(
    () => displayTree.some((node) => getNodeLockMeta(node).locked),
    [displayTree, getNodeLockMeta],
  );

  // Toggle expand/collapse
  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Toggle single permission with auto-select view/read logic
  const handleToggle = useCallback(
    (permissionId: string) => {
      const targetPerm = visiblePermissions.find((permission) => permission.id === permissionId);
      if (!targetPerm) return;
      const { resource, action } = parsePermissionCode(targetPerm.code);
      if (!resource) {
        return;
      }

      setSelectedPermissions((prev: Record<string, string>) => {
        const next = { ...prev };
        const isSelected = permissionId in next;

        if (isSelected) {
          delete next[permissionId];
          // If removing view/read, also remove dependent actions for same resource
          if (action === "view" || action === "read") {
            for (const permission of visiblePermissions) {
              if (permission.code.startsWith(`${resource}.`) && permission.id !== permissionId) {
                delete next[permission.id];
              }
            }
          }
        } else {
          next[permissionId] = "ALL";
          // Auto-select view/read when selecting other actions
          if (action !== "view" && action !== "read") {
            const viewPerm = visiblePermissions.find(
              (permission) =>
                permission.code === `${resource}.view` || permission.code === `${resource}.read`,
            );
            if (viewPerm && !(viewPerm.id in next)) {
              next[viewPerm.id] = "ALL";
            }
          }
        }
        return next;
      });
    },
    [visiblePermissions],
  );

  // Batch toggle for select-all / deselect-all
  const handleToggleAll = useCallback(
    (ids: string[], select: boolean) => {
      setSelectedPermissions((prev: Record<string, string>) => {
        const next = { ...prev };
        if (select) {
          for (const id of ids) {
            const permission = permissionByID.get(id);
            if (!permission || !isPermissionAllowedByPlan(permission)) {
              continue;
            }
            if (isAlwaysSafePermissionCode(permission.code)) {
              continue;
            }
            if (!(id in next)) next[id] = "ALL";
          }
        } else {
          for (const id of ids) {
            const permission = permissionByID.get(id);
            if (permission && isAlwaysSafePermissionCode(permission.code)) {
              continue;
            }
            delete next[id];
          }
        }
        return next;
      });
    },
    [permissionByID, isPermissionAllowedByPlan],
  );

  // Update scope for a single permission
  const handleUpdateScope = useCallback(
    (id: string, scope: PermissionScope) => {
      setSelectedPermissions((prev) => ({ ...prev, [id]: scope }));
    },
    [],
  );

  // Select/unselect all visible
  const handleSelectAllVisible = useCallback(() => {
    const ids: string[] = [];
    const walk = (node: PermissionTreeNode): void => {
      if (getNodeLockMeta(node).locked) {
        return;
      }
      if (node.type === "resource") {
        for (const permission of node.permissions ?? []) {
          if (isPermissionAllowedByPlan(permission)) {
            ids.push(permission.id);
          }
        }
        return;
      }
      for (const child of node.children ?? []) {
        walk(child);
      }
    };
    for (const node of displayTree) {
      walk(node);
    }
    handleToggleAll(ids, true);
  }, [displayTree, handleToggleAll, getNodeLockMeta, isPermissionAllowedByPlan]);

  const handleUnselectAllVisible = useCallback(() => {
    const ids = displayTree.flatMap(collectPermissionIds);
    handleToggleAll(ids, false);
  }, [displayTree, handleToggleAll]);

  // Expand / collapse all
  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    function walk(nodes: PermissionTreeNode[]) {
      for (const n of nodes) {
        if (n.children) {
          allIds.add(n.id);
          walk(n.children);
        }
      }
    }
    walk(tree);
    setExpanded(allIds);
  }, [tree]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    try {
      const nextSelected = { ...selectedPermissions };
      for (const existingPermission of role.permissions ?? []) {
        if (isAlwaysAllowedPermission(existingPermission.code)) {
          if (!(existingPermission.id in nextSelected)) {
            nextSelected[existingPermission.id] = existingPermission.scope ?? "ALL";
          }
        }
      }

      const nextAssignments = Object.entries(nextSelected).map(([permissionId, scope]) => ({
        permission_id: permissionId,
        scope,
      }));

      const currentScopeById = new Map(
        (role.permissions ?? []).map((permission) => [permission.id, permission.scope ?? "ALL"]),
      );
      const hasScopeChanges = nextAssignments.some(({ permission_id, scope }) => {
        return (currentScopeById.get(permission_id) ?? "ALL") !== scope;
      });
      const hasPermissionChanges =
        (role.permissions ?? []).length !== nextAssignments.length ||
        nextAssignments.some(({ permission_id }) => !currentScopeById.has(permission_id));

      if (!hasScopeChanges && !hasPermissionChanges) {
        toast.success(t("save") || "No changes to save");
        onClose();
        return;
      }

      await assignPermissions.mutateAsync({
        roleId,
        permissionIds: [],
        assignments: nextAssignments,
      });
      setSelectedPermissions(nextSelected);
      toast.success(t("save") || "Permissions saved successfully");
      onClose();
    } catch (error: unknown) {
      // Display error without closing dialog - user can retry
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : t("saveFailed") || "Failed to save permissions";
      
      // Check if error mentions protected/mandatory permissions or role requirements
      if (errorMessage.toLowerCase().includes("always safe") || 
          errorMessage.toLowerCase().includes("mandatory") ||
          errorMessage.toLowerCase().includes("protected") ||
          errorMessage.toLowerCase().includes("requires")) {
        toast.error(
          t("protectedPermissionsError") || 
          "Some permissions are protected and cannot be removed. Please keep them checked."
        );
      } else {
        toast.error(errorMessage);
      }
    }
  }, [selectedPermissions, role.permissions, assignPermissions, roleId, t, onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar - search + summary */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors cursor-pointer"
              aria-label={t("clearSearch")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Counts */}
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {t("selectedCount", { selected: totalCounts.selected, total: totalCounts.total })}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {hasLockedNode && (
            <a
              href={upgradeHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 mr-1"
            >
              <Zap className="h-3.5 w-3.5" />
              {t("upgradePlan")}
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnselectAllVisible}
            className="text-xs h-7 cursor-pointer"
          >
            {t("unselectAll")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAllVisible}
            className="text-xs h-7 cursor-pointer"
          >
            {t("selectAll")}
          </Button>
          <span className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            className="text-xs h-7 cursor-pointer"
          >
            {t("expand")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="text-xs h-7 cursor-pointer"
          >
            {t("collapse")}
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {displayTree.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchActive
              ? t("noSearchResults")
              : t("noPermissions")}
          </div>
        ) : (
          displayTree.map((node) =>
            node.type === "resource" ? (
              <TreeResourceRow
                key={node.id}
                node={node}
                depth={0}
                selected={selectedPermissions}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onUpdateScope={handleUpdateScope}
                t={t}
                isLocked={getNodeLockMeta(node).locked}
              />
            ) : (
              <TreeBranchNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggleExpand={handleToggleExpand}
                counts={countsMap}
                selected={selectedPermissions}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onUpdateScope={handleUpdateScope}
                t={t}
                searchActive={searchActive}
                isLocked={getNodeLockMeta(node).locked}
                lockedModuleLabel={getNodeLockMeta(node).moduleLabel}
                getNodeLockMeta={getNodeLockMeta}
              />
            ),
          )
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-background">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
              <Info className="size-3.5" />
              <span>{t("scope.tooltipSummary")}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              {SCOPE_OPTIONS.map((s) => (
                <div key={s}>
                  <strong>{t(SCOPE_I18N_KEYS[s])}</strong> -{" "}
                  {t(SCOPE_DESC_KEYS[s])}
                </div>
              ))}
              <div className="pt-1 text-muted-foreground">
                {t("scope.createNote")}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assignPermissions.isPending}
            className="cursor-pointer"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignPermissions.isPending}
            className="cursor-pointer"
          >
            <ButtonLoading
              loading={assignPermissions.isPending}
              loadingText={t("saving") || "Saving..."}
            >
              {t("save") || "Save"}
            </ButtonLoading>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outer Drawer Wrapper
// ---------------------------------------------------------------------------

export function AssignPermissionsDrawer({
  roleId,
  onClose,
}: AssignPermissionsDrawerProps) {
  const {
    data: permissionsData,
    isLoading: isLoadingPermissions,
    error: permissionsError,
  } = usePermissions();
  const {
    data: roleData,
    isLoading: isLoadingRole,
    error: roleError,
  } = useRole(roleId);
  const t = useTranslations("userManagement.assignPermissions");

  const permissions = useMemo(() => permissionsData?.data ?? [], [permissionsData?.data]);
  const role = roleData;
  const permissionsRevision = useMemo(
    () => permissions.map((permission) => permission.id).join("|"),
    [permissions],
  );

  const drawerContent = (() => {
    if (permissionsError || roleError) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-4">
            <div className="text-destructive font-medium text-lg">
              Error loading data
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {permissionsError && <div>Failed to load permissions</div>}
              {roleError && (
                <div>
                  Failed to load role: {roleError.message}
                  {roleError.message?.includes("404") && (
                    <div className="mt-2 text-xs">
                      Role not found. The database may have been reseeded. Please
                      refresh the page.
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      );
    }

    if (isLoadingPermissions || isLoadingRole || !role) {
      return (
        <div className="flex flex-col h-full">
          {/* Top bar skeleton */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-24 ml-auto" />
          </div>
          {/* Tree skeleton */}
          <div className="flex-1 p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <PermissionsSelector
        key={`${role.id}:${permissionsRevision}`}
        role={role}
        permissions={permissions}
        roleId={roleId}
        onClose={onClose}
      />
    );
  })();

  return (
    <Drawer
      open={!!roleId}
      onOpenChange={(open) => !open && onClose()}
      title={t("title", { roleName: role?.name ?? "" })}
      description={t("description")}
      side="right"
      defaultWidth={900}
      minWidth={700}
      maxWidth={1400}
      resizable
    >
      {drawerContent}
    </Drawer>
  );
}

// Keep backward compatibility alias
export { AssignPermissionsDrawer as AssignPermissionsDialog };
