"use client";

import { useState, useMemo, memo } from "react";
import { Edit, Trash2, Plus, Search, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DynamicIcon } from "@/lib/icon-utils";
import { MenuForm } from "./menu-form";
import { useMenuList } from "../hooks/use-menu-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { cn } from "@/lib/utils";
import type { Menu } from "../types";
import type { CreateMenuFormData, UpdateMenuFormData } from "../schemas/menu.schema";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MenuWithChildren = Menu & { children: MenuWithChildren[] };

interface TreeItemProps {
  item: MenuWithChildren;
  level?: number;
  isLast?: boolean;
  onEdit: (menuId: number) => void;
  onDelete: (menuId: number) => void;
  canEdit: boolean;
  canDelete: boolean;
  t: ReturnType<typeof useTranslations>;
  expandedMenus: Set<number>;
  onToggleExpand: (menuId: number) => void;
}

const TreeItem = memo(function TreeItem({
  item,
  level = 0,
  isLast = false,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  t,
  expandedMenus,
  onToggleExpand,
}: TreeItemProps) {
  const isExpanded = expandedMenus.has(item.id);
  const hasChildren = item.children && item.children.length > 0;

  // Calculate indent and line positioning
  const indentBase = 20;
  const indent = level * indentBase;
  const lineOffset = indent - indentBase + 8;

  if (hasChildren) {
    const children = item.children ?? [];
    const lastChildIndex = children.length - 1;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(item.id)}>
        <div className="group/line relative">
          {/* Tree lines for parent items */}
          {level > 0 && (
            <>
              <div
                className="absolute w-px transition-opacity duration-200 z-20"
                style={{
                  left: `${lineOffset}px`,
                  top: 0,
                  height: "50%",
                  backgroundColor: "hsl(var(--primary) / 0.5)",
                }}
              />
              <div
                className="absolute h-px transition-opacity duration-200 z-20"
                style={{
                  left: `${lineOffset}px`,
                  top: "50%",
                  width: `${indentBase - 8}px`,
                  transform: "translateY(-50%)",
                  backgroundColor: "hsl(var(--primary) / 0.5)",
                }}
              />
              {!isLast && (
                <div
                  className="absolute w-px transition-opacity duration-200 z-20"
                  style={{
                    left: `${lineOffset}px`,
                    top: "50%",
                    height: "100%",
                    backgroundColor: "hsl(var(--primary) / 0.5)",
                  }}
                />
              )}
            </>
          )}

          <div className="flex items-center w-full">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group relative z-10 flex flex-1 min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-200 text-left",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                style={{ paddingLeft: `${indent + 12}px` }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {isExpanded ? (
                    <FolderOpen
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        "text-primary"
                      )}
                    />
                  ) : (
                    <Folder
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        "text-primary/50"
                      )}
                    />
                  )}
                  <DynamicIcon name={item.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="font-mono truncate">{item.code}</span>
                    </div>
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-1 shrink-0 ml-2 pr-2">
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{t("list.actions.edit")}</TooltipContent>
                </Tooltip>
              )}

              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{t("list.actions.delete")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <CollapsibleContent className="overflow-hidden">
            <div className="relative">
              {children.length > 0 && isExpanded && (
                <div
                  className="absolute w-px transition-opacity duration-200 z-20"
                  style={{
                    left: `${indent + 8}px`,
                    top: 0,
                    backgroundColor: "hsl(var(--primary) / 0.5)",
                    height: children.length > 1 
                      ? `calc(100% - 20px)`
                      : "20px",
                  }}
                />
              )}

              {children.map((child, index) => {
                const isChildLast = index === lastChildIndex;
                return (
                  <TreeItem
                    key={child.id}
                    item={child as MenuWithChildren}
                    level={level + 1}
                    isLast={isChildLast}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    t={t}
                    expandedMenus={expandedMenus}
                    onToggleExpand={onToggleExpand}
                  />
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Leaf node
  return (
    <div className="group/line relative">
      {/* Tree lines for leaf items */}
      {level > 0 && (
        <>
          <div
            className="absolute w-px transition-opacity duration-200 z-20"
            style={{
              left: `${lineOffset}px`,
              top: 0,
              height: "50%",
              backgroundColor: "hsl(var(--primary) / 0.5)",
            }}
          />
          <div
            className="absolute h-px transition-opacity duration-200 z-20"
            style={{
              left: `${lineOffset}px`,
              top: "50%",
              width: `${indentBase - 8}px`,
              transform: "translateY(-50%)",
              backgroundColor: "hsl(var(--primary) / 0.5)",
            }}
          />
          {!isLast && (
            <div
              className="absolute w-px transition-opacity duration-200 z-20"
              style={{
                left: `${lineOffset}px`,
                top: "50%",
                height: "100%",
                backgroundColor: "hsl(var(--primary) / 0.5)",
              }}
            />
          )}
        </>
      )}

      <div className="flex items-center w-full">
        <button
          type="button"
          className={cn(
            "group relative z-10 flex flex-1 min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-200 text-left",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <DynamicIcon name={item.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-1">
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span className="font-mono truncate">{item.code}</span>
              </div>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 ml-2 pr-2">
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item.id)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t("list.actions.edit")}</TooltipContent>
            </Tooltip>
          )}

          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t("list.actions.delete")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
});

export function MenuList() {
  const {
    search,
    setSearch,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingMenu,
    setEditingMenu,
    menus,
    editingMenuData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    deletingMenuId,
    setDeletingMenuId,
    createMenu,
    updateMenu,
  } = useMenuList();

  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  const t = useTranslations("menuManagement");

  // Permission checks
  const { canView, canCreate, canEdit, canDelete, isLoading: permsLoading } = useHasPermission();

  const toggleExpand = (menuId: number) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };


  // Build menu tree structure
  const menuTree = useMemo(() => {
    const menuMap = new Map<number, MenuWithChildren>();
    const rootMenus: MenuWithChildren[] = [];

    // Initialize all menus with empty children array
    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // Build tree structure
    menus.forEach((menu) => {
      const menuWithChildren = menuMap.get(menu.id);
      if (!menuWithChildren) return;

      // Check if menu has no parent (treat null, undefined as root)
      if (!menu.parent_id || menu.parent_id === null) {
        rootMenus.push(menuWithChildren);
      } else {
        const parent = menuMap.get(menu.parent_id);
        if (parent) {
          parent.children.push(menuWithChildren);
        }
      }
    });

    return rootMenus;
  }, [menus]);

  // Filter menus based on search
  const filteredMenuTree = useMemo(() => {
    if (!search) {
      return menuTree;
    }

    const searchLower = search.toLowerCase();
    const filterMenu = (menu: MenuWithChildren): MenuWithChildren | null => {
      const matches =
        menu.name.toLowerCase().includes(searchLower) ||
        menu.code.toLowerCase().includes(searchLower) ||
        menu.url_path.toLowerCase().includes(searchLower);

      const filteredChildren = menu.children
        .map((child) => filterMenu(child as MenuWithChildren))
        .filter((child): child is MenuWithChildren => child !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...menu, children: filteredChildren };
      }

      return null;
    };

    const result = menuTree
      .map((menu) => filterMenu(menu))
      .filter((menu): menu is MenuWithChildren => menu !== null);

    return result;
  }, [menuTree, search]);

  const expandAll = () => {
    const allMenuIds = new Set<number>();
    const collectIds = (menuList: MenuWithChildren[]) => {
      menuList.forEach((menu) => {
        if (menu.children.length > 0) {
          allMenuIds.add(menu.id);
          collectIds(menu.children);
        }
      });
    };
    collectIds(filteredMenuTree);
    setExpandedMenus(allMenuIds);
  };

  const collapseAll = () => {
    setExpandedMenus(new Set());
  };

  // Handle loading state
  if (permsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Handle no permission state
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t("permissions.noPermission")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="cursor-pointer">
            {t("list.tree.expand")}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="cursor-pointer">
            {t("list.tree.collapse")}
          </Button>
          {canCreate && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer">
              <Plus className="mr-2 size-4" />
              {t("list.createButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Menu Tree */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading menus...</p>
          </div>
        </div>
      ) : filteredMenuTree.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <p className="text-lg font-semibold">{t("list.noData")}</p>
          <p className="text-sm text-muted-foreground mt-2">{t("list.noDataDescription")}</p>
          {canCreate && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4 cursor-pointer">
              <Plus className="mr-2 size-4" />
              {t("list.createButton")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-0.5 pl-1 pr-3 py-2">
          {filteredMenuTree.map((menu, index) => (
            <TreeItem
              key={menu.id}
              item={menu}
              level={0}
              isLast={index === filteredMenuTree.length - 1}
              onEdit={setEditingMenu}
              onDelete={handleDeleteClick}
              canEdit={canEdit}
              canDelete={canDelete}
              t={t}
              expandedMenus={expandedMenus}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("form.create.title")}</DialogTitle>
          </DialogHeader>
          <MenuForm
            mode="create"
            parentMenus={menus}
            onSubmit={(data) => handleCreate(data as CreateMenuFormData)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMenu.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMenu} onOpenChange={(open) => !open && setEditingMenu(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("form.edit.title")}</DialogTitle>
          </DialogHeader>
          {editingMenuData?.data && (
            <MenuForm
              mode="edit"
              initialData={editingMenuData.data}
              parentMenus={menus}
              onSubmit={(data) => handleUpdate(data as UpdateMenuFormData)}
              onCancel={() => setEditingMenu(null)}
              isLoading={updateMenu.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingMenuId}
        onOpenChange={(open) => !open && setDeletingMenuId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("delete.title")}
        description={t("delete.description")}
      />
    </div>
  );
}
