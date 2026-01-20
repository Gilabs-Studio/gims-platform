"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer } from "@/components/ui/drawer";
import { usePermissions } from "../hooks/use-permissions";
import { useRole, useAssignPermissionsToRole } from "../hooks/use-roles";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMenuIcon } from "@/lib/menu-icons";
import type { Permission } from "../types";

interface AssignPermissionsDrawerProps {
  readonly roleId: string;
  readonly onClose: () => void;
}

// Map permission action to Badge variant from badge.tsx for consistent theme
function getActionBadgeVariant(action: string):
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "active"
  | "inactive" {
  switch (action) {
    case "view":
    case "read":
      return "default";
    case "create":
      return "success";
    case "update":
    case "edit":
      return "warning";
    case "delete":
      return "destructive";
    default:
      return "inactive";
  }
}

// Action badge component using `Badge` to keep visual consistency
function ActionBadge({ action }: { readonly action: string }) {
  const variant = getActionBadgeVariant(action);
  return (
    <Badge variant={variant} className="text-xs px-2 py-0.5 capitalize">
      {action}
    </Badge>
  );
}

// Inner component that only renders when role data is loaded
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

  // Initialize state directly from role.permissions
  const initialPermissions = useMemo(
    () => (role?.permissions?.length ? role.permissions.map((p) => p.id) : []),
    [role]
  );

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPermissions);

  // Get category from menu hierarchy
  const getCategory = (perm: Permission): string => {
    if (!perm.menu) return "Other";
    
    // If menu has parent, use parent name as category
    if (perm.menu.parent) {
      return perm.menu.parent.name;
    }
    
    // If no parent, this is root level menu
    return perm.menu.name;
  };

  // Group permissions by Category (parent menu) -> Menu
  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Record<string, Permission[]>> = {};

    permissions.forEach(perm => {
      const category = getCategory(perm);
      const menuName = perm.menu?.name || "Other";
      
      if (!grouped[category]) grouped[category] = {};
      if (!grouped[category][menuName]) {
        grouped[category][menuName] = [];
      }
      
      grouped[category][menuName].push(perm);
    });

    return grouped;
  }, [permissions]);

  // Define categories from grouped data, sorted by menu order
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    // Build map of category name to order
    permissions.forEach(perm => {
      if (!perm.menu) return;
      const category = getCategory(perm);
      const menuForOrder = perm.menu.parent || perm.menu;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, menuForOrder.order || 999);
      }
    });
    
    // Sort categories by order
    return Object.keys(groupedByCategory).sort((a, b) => {
      const orderA = categoryMap.get(a) || 999;
      const orderB = categoryMap.get(b) || 999;
      return orderA - orderB;
    });
  }, [groupedByCategory, permissions]);
  
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || "");

  // Count permissions per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; selected: number }> = {};
    categories.forEach(cat => {
      const categoryPermissions = Object.values(groupedByCategory[cat] || {}).flat();
      counts[cat] = {
        total: categoryPermissions.length,
        selected: categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length,
      };
    });
    return counts;
  }, [groupedByCategory, selectedPermissions, categories]);

  const togglePermission = (permissionId: string) => {
    const targetPermission = permissions.find((p) => p.id === permissionId);
    if (!targetPermission) return;

    const isCurrentlySelected = selectedPermissions.includes(permissionId);
    const [resource, action] = targetPermission.code.split(".");

    setSelectedPermissions((prev) => {
      let next = [...prev];

      if (isCurrentlySelected) {
        next = next.filter((id) => id !== permissionId);

        if (action === "view" || action === "read") {
          const relatedPermissions = permissions.filter(
            (p) => p.code.startsWith(`${resource}.`) && p.id !== permissionId
          );
          const relatedIds = new Set(relatedPermissions.map((p) => p.id));
          next = next.filter((id) => !relatedIds.has(id));
        }
      } else {
        next.push(permissionId);
        
        const viewPermission = permissions.find(
          (p) => p.code === `${resource}.view` || p.code === `${resource}.read`
        );
        if (viewPermission && !next.includes(viewPermission.id)) {
          next.push(viewPermission.id);
        }
      }

      return next;
    });
  };

  // Select all permissions in current category
  const handleSelectAll = () => {
    const categoryPermissions = Object.values(groupedByCategory[activeCategory] || {}).flat();
    const categoryIds = new Set(categoryPermissions.map(p => p.id));
    
    setSelectedPermissions(prev => {
      const withoutCategory = prev.filter(id => !categoryIds.has(id));
      return [...withoutCategory, ...categoryIds];
    });
  };

  // Unselect all permissions in current category
  const handleUnselectAll = () => {
    const categoryPermissions = Object.values(groupedByCategory[activeCategory] || {}).flat();
    const categoryIds = new Set(categoryPermissions.map(p => p.id));
    
    setSelectedPermissions(prev => prev.filter(id => !categoryIds.has(id)));
  };

  const handleSubmit = async () => {
    try {
      await assignPermissions.mutateAsync({
        roleId,
        permissionIds: selectedPermissions,
      });
      toast.success(t("save") || "Permissions saved successfully");
      onClose();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const currentCategoryPermissions = groupedByCategory[activeCategory] || {};
  const currentCount = categoryCounts[activeCategory] || { total: 0, selected: 0 };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Category Navigation */}
      <div className="w-56 border-r bg-muted/30 flex flex-col">
        <nav className="flex-1 py-2">
          {categories.map((category) => {
            const count = categoryCounts[category];
            const isActive = activeCategory === category;
            
            // Find first menu in this category to get icon
            const firstMenu = Object.values(groupedByCategory[category] || {})
              .flat()[0]?.menu;
            const iconName = firstMenu?.parent?.icon || firstMenu?.icon || "database";
            
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-muted/80",
                  isActive && "bg-primary/10 border-l-2 border-primary text-primary"
                )}
              >
                <span className="shrink-0">{getMenuIcon(iconName)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{category}</div>
                  {count && count.total > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {count.selected}/{count.total} selected
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Content - Permissions List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Select All / Unselect All */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/20">
          <div className="text-sm text-muted-foreground">
            {currentCount.selected} of {currentCount.total} permissions selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnselectAll}
              className="text-xs h-7"
            >
              Unselect all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs h-7"
            >
              Select all
            </Button>
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(currentCategoryPermissions).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No permissions in this category
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(currentCategoryPermissions).map(([groupName, groupPermissions]) => (
                <div key={groupName}>
                  {/* Resource Group Header */}
                  <div className="px-6 py-2 bg-muted/30 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {groupName}
                    </span>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Unselect all in ${groupName}`}
                            onClick={() => {
                              const ids = new Set(groupPermissions.map((p) => p.id));
                              setSelectedPermissions((prev) => prev.filter((id) => !ids.has(id)));
                            }}
                          >
                            <Square className="size-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Unselect all</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Select all in ${groupName}`}
                            onClick={() => {
                              const ids = groupPermissions.map((p) => p.id);
                              setSelectedPermissions((prev) => {
                                const without = prev.filter((id) => !ids.includes(id));
                                return [...without, ...ids];
                              });
                            }}
                          >
                            <CheckSquare className="size-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Select all</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  
                  {/* Permission Items */}
                  <div className="divide-y divide-border/50">
                    {groupPermissions.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission.id);
                      const [, action] = permission.code.split(".");
                      
                      return (
                        <label
                          key={permission.id}
                          htmlFor={permission.id}
                          className={cn(
                            "flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors",
                            "hover:bg-muted/50",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <Checkbox
                            id={permission.id}
                            checked={isSelected}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{permission.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {permission.code}
                            </div>
                          </div>
                          {action && (
                            <ActionBadge action={action} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={onClose} disabled={assignPermissions.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={assignPermissions.isPending}>
            {assignPermissions.isPending ? (t("saving") || "Saving...") : (t("save") || "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssignPermissionsDrawer({ roleId, onClose }: AssignPermissionsDrawerProps) {
  const { data: permissionsData, isLoading: isLoadingPermissions, error: permissionsError } = usePermissions();
  const { data: roleData, isLoading: isLoadingRole, error: roleError } = useRole(roleId);
  const t = useTranslations("userManagement.assignPermissions");

  const permissions = permissionsData?.data || [];
  const role = roleData;

  // Debug logging
  if (typeof globalThis.window !== 'undefined') {
    console.log('AssignPermissionsDrawer Debug:', {
      roleId,
      isLoadingPermissions,
      isLoadingRole,
      hasPermissionsData: !!permissionsData,
      permissionsCount: permissions.length,
      hasRoleData: !!roleData,
      permissionsError,
      roleError
    });
  }

  const drawerContent = (() => {
    if (permissionsError || roleError) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-4">
            <div className="text-destructive font-medium text-lg">Error loading data</div>
            <div className="text-sm text-muted-foreground space-y-1">
              {permissionsError && <div>Failed to load permissions</div>}
              {roleError && (
                <div>
                  Failed to load role: {roleError.message}
                  {roleError.message?.includes('404') && (
                    <div className="mt-2 text-xs">
                      Role not found. The database may have been reseeded. Please refresh the page.
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      );
    }

    if (isLoadingPermissions || isLoadingRole || !role) {
      return (
        <div className="flex h-full">
          {/* Sidebar Skeleton */}
          <div className="w-56 border-r bg-muted/30 p-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          {/* Content Skeleton */}
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
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
      defaultWidth={800}
      minWidth={600}
      maxWidth={1200}
      resizable
    >
      {drawerContent}
    </Drawer>
  );
}

// Keep backward compatibility alias
export { AssignPermissionsDrawer as AssignPermissionsDialog };
