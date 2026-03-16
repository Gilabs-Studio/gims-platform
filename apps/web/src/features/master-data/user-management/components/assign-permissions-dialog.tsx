"use client";

import { useState, useMemo, useCallback, memo, startTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "@/components/ui/drawer";
import { usePermissions } from "../hooks/use-permissions";
import { useRole, useAssignPermissionsToRole } from "../hooks/use-roles";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Search, X, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMenuIcon } from "@/lib/menu-icons";
import { navigationConfig, type NavItem } from "@/lib/navigation-config";
import { ButtonLoading } from "@/components/loading";
import type { Permission, PermissionScope } from "../types";
import { Input } from "@/components/ui/input";
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

const SCOPE_OPTIONS: PermissionScope[] = ["OWN", "DIVISION", "AREA", "ALL"];

const SCOPE_I18N_KEYS: Record<PermissionScope, string> = {
  OWN: "scope.own",
  DIVISION: "scope.division",
  AREA: "scope.area",
  ALL: "scope.all",
};

const SCOPE_DESC_KEYS: Record<PermissionScope, string> = {
  OWN: "scope.ownDescription",
  DIVISION: "scope.divisionDescription",
  AREA: "scope.areaDescription",
  ALL: "scope.allDescription",
};

// Deterministic ordering for actions within a resource row
const ACTION_ORDER: Record<string, number> = {
  view: 0, read: 1, create: 2, update: 3, edit: 4,
  delete: 5, approve: 6, reject: 7, assign_permissions: 8,
  export: 9, import: 10,
};

function actionSortKey(perm: Permission): number {
  const [, action] = perm.code.split(".");
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
): PermissionTreeNode[] {
  // Index permissions by resource prefix (e.g. "country" -> [country.read, country.create, ...])
  const permsByResource = new Map<string, Permission[]>();
  for (const p of permissions) {
    const [resource] = p.code.split(".");
    if (!permsByResource.has(resource)) permsByResource.set(resource, []);
    permsByResource.get(resource)!.push(p);
  }
  // Sort each resource's permissions by action order
  for (const perms of permsByResource.values()) {
    perms.sort((a, b) => actionSortKey(a) - actionSortKey(b));
  }

  const usedResources = new Set<string>();

  function processNode(nav: NavItem, depth: number): PermissionTreeNode | null {
    // Leaf - has permission and no children
    if (nav.permission && !nav.children?.length) {
      const [resource] = nav.permission.split(".");
      const perms = permsByResource.get(resource);
      if (!perms?.length) return null;
      usedResources.add(resource);
      
      const safeSuffix = nav.url ? nav.url.replace(/[^a-zA-Z0-9]/g, "-") : Math.random().toString(36).substring(7);

      return {
        id: `resource-${resource}-${safeSuffix}`,
        name: nav.name,
        icon: nav.icon,
        type: "resource",
        resource,
        permissions: perms,
      };
    }

    // Branch - has children
    if (nav.children?.length) {
      const children: PermissionTreeNode[] = [];
      for (const child of nav.children) {
        const node = processNode(child, depth + 1);
        if (node) children.push(node);
      }
      if (children.length === 0) return null;
      return {
        id: `${depth === 0 ? "section" : "group"}-${nav.name}`,
        name: nav.name,
        icon: nav.icon,
        type: depth === 0 ? "section" : "group",
        children,
      };
    }

    return null;
  }

  const tree: PermissionTreeNode[] = [];
  for (const nav of navConfig) {
    const node = processNode(nav, 0);
    if (node) tree.push(node);
  }

  // Collect orphaned permissions not matched by any navConfig leaf
  const orphaned: PermissionTreeNode[] = [];
  for (const [resource, perms] of permsByResource) {
    if (usedResources.has(resource)) continue;
    orphaned.push({
      id: `resource-${resource}`,
      name: resource.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: "file",
      type: "resource",
      resource,
      permissions: perms,
    });
  }
  if (orphaned.length > 0) {
    tree.push({
      id: "section-Other",
      name: "Other",
      icon: "more-horizontal",
      type: "section",
      children: orphaned,
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
}: {
  node: PermissionTreeNode;
  depth: number;
  selected: Record<string, string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onUpdateScope: (id: string, scope: PermissionScope) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const perms = node.permissions ?? [];
  const selectedCount = perms.filter((p) => p.id in selected).length;
  const allSelected = selectedCount === perms.length && perms.length > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  // Determine the scope to display (common scope across selected perms)
  const scopeApplicablePerms = perms.filter((p) => {
    const [, action] = p.code.split(".");
    return p.id in selected && isScopeApplicable(action);
  });
  const displayScope = scopeApplicablePerms.length > 0
    ? (selected[scopeApplicablePerms[0].id] ?? "ALL")
    : "ALL";
  const hasMixedScopes = scopeApplicablePerms.length > 1 &&
    scopeApplicablePerms.some((p) => selected[p.id] !== displayScope);

  const handleMasterToggle = useCallback(() => {
    const ids = perms.map((p) => p.id);
    onToggleAll(ids, !allSelected);
  }, [perms, allSelected, onToggleAll]);

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
        "flex items-center gap-3 py-2 pr-4 border-b border-border/40 transition-colors hover:bg-muted/40",
        someSelected && "bg-primary/2",
        allSelected && "bg-primary/5",
      )}
      style={{ paddingLeft }}
    >
      {/* Resource master checkbox */}
      <Checkbox
        checked={allSelected ? true : someSelected ? "indeterminate" : false}
        onCheckedChange={handleMasterToggle}
        className="cursor-pointer"
        aria-label={`Toggle all permissions for ${node.name}`}
      />

      {/* Resource icon + name */}
      <span className="shrink-0 text-muted-foreground">{getMenuIcon(node.icon)}</span>
      <span className="text-sm font-medium min-w-[120px] truncate">{node.name}</span>

      {/* Inline action checkboxes */}
      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {perms.map((perm) => {
          const [, action] = perm.code.split(".");
          const isChecked = perm.id in selected;
          return (
            <label
              key={perm.id}
              className="inline-flex items-center gap-1 cursor-pointer select-none"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(perm.id)}
                className="size-3.5"
              />
              <Badge
                variant={getActionBadgeVariant(action ?? "")}
                className="text-[10px] px-1.5 py-0 capitalize leading-5"
              >
                {action}
              </Badge>
            </label>
          );
        })}
      </div>

      {/* Scope dropdown - visible when at least one scope-applicable perm is selected */}
      {scopeApplicablePerms.length > 0 ? (
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
    <div>
      {/* Header row */}
      <div
        className={cn(
          "flex items-center gap-2 pr-4 border-b cursor-pointer transition-colors select-none",
          isSection
            ? "bg-muted/50 hover:bg-muted/70 py-2.5"
            : "bg-muted/20 hover:bg-muted/40 py-2",
        )}
        style={{ paddingLeft }}
        onClick={handleToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
      >
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground transition-transform shrink-0",
            isExpanded && "rotate-90",
          )}
        />
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
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {count.selected}/{count.total}
        </span>
      </div>

      {/* Children - only rendered when expanded (progressive loading) */}
      {isExpanded && node.children && (
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

  // Build tree from navConfig + permissions (stable across renders)
  const tree = useMemo(
    () => buildPermissionTree(navigationConfig, permissions),
    [permissions],
  );

  // Valid permission ID set for filtering stale IDs from the role
  const validPermIds = useMemo(() => new Set(permissions.map((p) => p.id)), [permissions]);

  // Initialize state - filter out stale permission IDs that no longer exist
  const initialPermissions = useMemo(() => {
    const map: Record<string, string> = {};
    if (role?.permissions?.length) {
      for (const p of role.permissions) {
        if (validPermIds.has(p.id)) {
          map[p.id] = p.scope ?? "ALL";
        }
      }
    }
    return map;
  }, [role, validPermIds]);

  const [selectedPermissions, setSelectedPermissions] =
    useState<Record<string, string>>(initialPermissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Start with top-level sections expanded
    return new Set(tree.filter((n) => n.type === "section").map((n) => n.id));
  });

  const searchActive = searchQuery.trim().length > 0;

  // Filtered tree for search
  const displayTree = useMemo(() => {
    if (!searchActive) return tree;
    return filterTree(tree, searchQuery.trim());
  }, [tree, searchQuery, searchActive]);

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

  // Toggle expand/collapse
  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Toggle single permission with auto-select view/read logic
  const handleToggle = useCallback(
    (permissionId: string) => {
      const targetPerm = permissions.find((p) => p.id === permissionId);
      if (!targetPerm) return;
      const [resource, action] = targetPerm.code.split(".");

      setSelectedPermissions((prev) => {
        const next = { ...prev };
        const isSelected = permissionId in next;

        if (isSelected) {
          delete next[permissionId];
          // If removing view/read, also remove dependent actions for same resource
          if (action === "view" || action === "read") {
            for (const p of permissions) {
              if (p.code.startsWith(`${resource}.`) && p.id !== permissionId) {
                delete next[p.id];
              }
            }
          }
        } else {
          next[permissionId] = "ALL";
          // Auto-select view/read when selecting other actions
          if (action !== "view" && action !== "read") {
            const viewPerm = permissions.find(
              (p) =>
                p.code === `${resource}.view` || p.code === `${resource}.read`,
            );
            if (viewPerm && !(viewPerm.id in next)) {
              next[viewPerm.id] = "ALL";
            }
          }
        }
        return next;
      });
    },
    [permissions],
  );

  // Batch toggle for select-all / deselect-all
  const handleToggleAll = useCallback(
    (ids: string[], select: boolean) => {
      setSelectedPermissions((prev) => {
        const next = { ...prev };
        if (select) {
          for (const id of ids) {
            if (!(id in next)) next[id] = "ALL";
          }
        } else {
          for (const id of ids) delete next[id];
        }
        return next;
      });
    },
    [],
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
    const ids = displayTree.flatMap(collectPermissionIds);
    handleToggleAll(ids, true);
  }, [displayTree, handleToggleAll]);

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
      const assignments = Object.entries(selectedPermissions).map(
        ([permId, scope]) => ({
          permission_id: permId,
          scope,
        }),
      );
      await assignPermissions.mutateAsync({
        roleId,
        permissionIds: Object.keys(selectedPermissions),
        assignments,
      });
      toast.success(t("save") || "Permissions saved successfully");
      onClose();
    } catch {
      // Error handled by api-client interceptor
    }
  }, [selectedPermissions, assignPermissions, roleId, t, onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar - search + summary */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Counts */}
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {totalCounts.selected}/{totalCounts.total} selected
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnselectAllVisible}
            className="text-xs h-7 cursor-pointer"
          >
            Unselect all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAllVisible}
            className="text-xs h-7 cursor-pointer"
          >
            Select all
          </Button>
          <span className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            className="text-xs h-7 cursor-pointer"
          >
            Expand
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="text-xs h-7 cursor-pointer"
          >
            Collapse
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {displayTree.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchActive
              ? "No permissions matching your search"
              : "No permissions available"}
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

  const permissions = permissionsData?.data || [];
  const role = roleData;

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
