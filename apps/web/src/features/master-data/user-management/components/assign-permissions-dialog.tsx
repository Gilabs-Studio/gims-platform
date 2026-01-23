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
import { Badge } from "@/components/ui/badge";
import { cn, sortOptions } from "@/lib/utils";
import { CheckSquare, Square, Search, X } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMenuIcon } from "@/lib/menu-icons";
import { ButtonLoading } from "@/components/loading";
import type { Permission } from "../types";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Get category order for sorting
  const getCategoryOrder = (perm: Permission): number => {
    if (!perm.menu) return 999;
    const menuForOrder = perm.menu.parent || perm.menu;
    return menuForOrder.order ?? 999;
  };

  // Get menu order for sorting
  const getMenuOrder = (perm: Permission): number => {
    if (!perm.menu) return 999;
    return perm.menu.order ?? 999;
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

    // Sort permissions within each menu by name
    Object.keys(grouped).forEach(category => {
      Object.keys(grouped[category]).forEach(menuName => {
        grouped[category][menuName].sort((a, b) => a.name.localeCompare(b.name));
      });
    });

    return grouped;
  }, [permissions]);

  // Define categories from grouped data, sorted by menu order (like sidebar)
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { order: number; icon: string }>();
    
    // Build map of category name to order and icon
    permissions.forEach(perm => {
      if (!perm.menu) return;
      const category = getCategory(perm);
      const menuForOrder = perm.menu.parent || perm.menu;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          order: menuForOrder.order ?? 999,
          icon: menuForOrder.icon || "database"
        });
      }
    });
    
    // Sort categories by order (same as sidebar)
    return Object.keys(groupedByCategory).sort((a, b) => {
      const orderA = categoryMap.get(a)?.order ?? 999;
      const orderB = categoryMap.get(b)?.order ?? 999;
      return orderA - orderB;
    });
  }, [groupedByCategory, permissions]);
  
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || "");

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return permissions;
    
    const query = searchQuery.toLowerCase();
    return permissions.filter(perm => 
      perm.name.toLowerCase().includes(query) ||
      perm.code.toLowerCase().includes(query) ||
      perm.menu?.name.toLowerCase().includes(query) ||
      perm.menu?.parent?.name.toLowerCase().includes(query)
    );
  }, [permissions, searchQuery]);

  // Group filtered permissions for search results
  const searchGroupedByCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedByCategory;
    
    const grouped: Record<string, Record<string, Permission[]>> = {};

    filteredPermissions.forEach(perm => {
      const category = getCategory(perm);
      const menuName = perm.menu?.name || "Other";
      
      if (!grouped[category]) grouped[category] = {};
      if (!grouped[category][menuName]) {
        grouped[category][menuName] = [];
      }
      
      grouped[category][menuName].push(perm);
    });

    return grouped;
  }, [filteredPermissions, searchQuery, groupedByCategory]);

  // Count permissions per category (use search results when searching)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; selected: number }> = {};
    const dataSource = searchQuery.trim() ? searchGroupedByCategory : groupedByCategory;
    
    categories.forEach((cat: string) => {
      const categoryPermissions = Object.values(dataSource[cat] || {}).flat();
      counts[cat] = {
        total: categoryPermissions.length,
        selected: categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length,
      };
    });
    return counts;
  }, [groupedByCategory, searchGroupedByCategory, selectedPermissions, categories, searchQuery]);

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

  // Select all permissions in current category (use search results when searching)
  const handleSelectAll = () => {
    const dataSource = searchQuery.trim() ? searchGroupedByCategory : groupedByCategory;
    const categoryPermissions = Object.values(dataSource[activeCategory] || {}).flat();
    const categoryIds = new Set(categoryPermissions.map(p => p.id));
    
    setSelectedPermissions(prev => {
      const withoutCategory = prev.filter(id => !categoryIds.has(id));
      return [...withoutCategory, ...categoryIds];
    });
  };

  // Unselect all permissions in current category (use search results when searching)
  const handleUnselectAll = () => {
    const dataSource = searchQuery.trim() ? searchGroupedByCategory : groupedByCategory;
    const categoryPermissions = Object.values(dataSource[activeCategory] || {}).flat();
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

  const dataSource = searchQuery.trim() ? searchGroupedByCategory : groupedByCategory;
  const currentCategoryPermissions = dataSource[activeCategory] || {};
  const currentCount = categoryCounts[activeCategory] || { total: 0, selected: 0 };

  // Calculate total search results
  const totalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return filteredPermissions.length;
  }, [searchQuery, filteredPermissions]);

  return (
    <div className="flex h-full">
      {/* Left Skip categories with no results when searching
            if (searchQuery.trim() && count.total === 0) return null;
            
            // Sidebar - Category Navigation */}
      <div className="w-56 border-r bg-muted/30 flex flex-col">
        {/* Search Bar */}
        <div className="p-3 border-b">
          <div className="relative">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 text-xs text-muted-foreground">
              {totalSearchResults} result{totalSearchResults !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
        
        <nav className="flex-1 py-2 overflow-y-auto">
          {categories.map((category: string) => {
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
              className="text-xs h-7 cursor-pointer"
            >
              Unselect all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs h-7 cursor-pointer"
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
                            className="cursor-pointer"
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
                            className="cursor-pointer"
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
          <Button variant="outline" onClick={onClose} disabled={assignPermissions.isPending} className="cursor-pointer">
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={assignPermissions.isPending} className="cursor-pointer">
            <ButtonLoading loading={assignPermissions.isPending} loadingText={t("saving") || "Saving..."}>
              {t("save") || "Save"}
            </ButtonLoading>
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
