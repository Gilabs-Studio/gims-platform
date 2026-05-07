"use client";

import { Fragment, useMemo } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import type { ChartOfAccountTreeNode, CoaType } from "../types";

export interface CoaTreeViewProps {
  data: ChartOfAccountTreeNode[];
  isLoading: boolean;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onActiveChange: (id: string, isActive: boolean) => void;
  onAddChild?: (parentId: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  searchTerm?: string;
  getTypeBadge: (type: CoaType) => { labelKey: string; variant: string };
  getTypeLabel: (labelKey: string) => string;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

interface TreeNodeProps {
  node: ChartOfAccountTreeNode;
  depth: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onActiveChange: (isActive: boolean) => void;
  onAddChild?: () => void;
  expandedIds: Record<string, boolean>;
  onToggleExpandProp: (id: string) => void;
  onEditProp: (id: string) => void;
  onDeleteProp: (id: string) => void;
  onActiveChangeProp: (id: string, isActive: boolean) => void;
  canUpdate: boolean;
  canDelete: boolean;
  isProtected: boolean;
  getTypeBadge: (type: CoaType) => { labelKey: string; variant: string };
  getTypeLabel: (labelKey: string) => string;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

function CoaTreeNode({
  node,
  depth,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onActiveChange,
  onAddChild,
  expandedIds,
  onToggleExpandProp,
  onEditProp,
  onDeleteProp,
  onActiveChangeProp,
  canUpdate,
  canDelete,
  isProtected,
  getTypeBadge,
  getTypeLabel,
  t,
  tCommon,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isPostable = node.is_postable ?? true;

  return (
    <Fragment>
      <div
        className="group flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50 transition-colors border-b last:border-b-0"
        style={{ paddingLeft: `${depth === 0 ? 12 : 12 + depth * 20}px` }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-accent rounded transition-colors cursor-pointer flex-shrink-0"
            aria-label={isExpanded ? t("actions.hideChildren") : t("actions.showChildren")}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="p-1 flex-shrink-0" />
        )}

        {/* Code */}
        <span className="font-mono text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
          {node.code}
        </span>

        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">
          {node.name}
        </span>

        {/* Type Badge */}
        <div className="flex-shrink-0">
          {(() => {
            const typeBadge = getTypeBadge(node.type);
            return (
              <Badge variant={typeBadge.variant as React.ComponentProps<typeof Badge>["variant"]} className="text-xs font-medium">
                {getTypeLabel(typeBadge.labelKey)}
              </Badge>
            );
          })()}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <Badge
            variant={isPostable ? "success" : "warning"}
            className="text-xs"
          >
            {isPostable ? t("status.postable") : t("status.nonPostable")}
          </Badge>
        </div>

        {/* Protected Badge */}
        {isProtected && (
          <div className="flex-shrink-0">
            <Badge variant="info" className="text-xs">
              {t("status.protected")}
            </Badge>
          </div>
        )}

        {/* Child Count Badge */}
        {hasChildren && (
          <div className="flex-shrink-0">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {node.children!.length}
            </Badge>
          </div>
        )}

        {/* Active Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Switch
            checked={node.is_active}
            onCheckedChange={onActiveChange}
            disabled={!canUpdate || isProtected}
            className="cursor-pointer"
          />
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end" className="w-48">
            {canUpdate && (
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                {t("actions.edit")}
              </DropdownMenuItem>
            )}

            {hasChildren && onAddChild && (
              <DropdownMenuItem onClick={onAddChild} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                {t("actions.addChild")}
              </DropdownMenuItem>
            )}

            {canUpdate && canDelete && <DropdownMenuSeparator />}

            {canDelete && !isProtected && (
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("actions.delete")}
              </DropdownMenuItem>
            )}

            {canDelete && isProtected && (
              <DropdownMenuItem disabled className="text-muted-foreground">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("messages.protectedDelete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <>
          {node.children!.map((child) => (
            <CoaTreeNodeWrapper
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpandProp}
              onEdit={onEditProp}
              onDelete={onDeleteProp}
              onActiveChange={onActiveChangeProp}
              onAddChild={onAddChild}
              canUpdate={canUpdate}
              canDelete={canDelete}
              getTypeBadge={getTypeBadge}
              getTypeLabel={getTypeLabel}
              t={t}
              tCommon={tCommon}
            />
          ))}
        </>
      )}
    </Fragment>
  );
}

interface CoaTreeNodeWrapperProps {
  node: ChartOfAccountTreeNode;
  depth: number;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onActiveChange: (id: string, isActive: boolean) => void;
  onAddChild?: (parentId: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  getTypeBadge: (type: CoaType) => { labelKey: string; variant: string };
  getTypeLabel: (labelKey: string) => string;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

function CoaTreeNodeWrapper({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onActiveChange,
  onAddChild,
  canUpdate,
  canDelete,
  getTypeBadge,
  getTypeLabel,
  t,
  tCommon,
}: CoaTreeNodeWrapperProps) {
  return (
    <CoaTreeNode
      node={node}
      depth={depth}
      isExpanded={expandedIds[node.id] ?? false}
      onToggleExpand={() => onToggleExpand(node.id)}
      onEdit={() => onEdit(node.id)}
      onDelete={() => onDelete(node.id)}
      onActiveChange={(isActive) => onActiveChange(node.id, isActive)}
      onAddChild={onAddChild ? () => onAddChild(node.id) : undefined}
      expandedIds={expandedIds}
      onToggleExpandProp={onToggleExpand}
      onEditProp={onEdit}
      onDeleteProp={onDelete}
      onActiveChangeProp={onActiveChange}
      canUpdate={canUpdate}
      canDelete={canDelete}
      isProtected={node.is_protected ?? false}
      getTypeBadge={getTypeBadge}
      getTypeLabel={getTypeLabel}
      t={t}
      tCommon={tCommon}
    />
  );
}

export function CoaTreeView({
  data,
  isLoading,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onActiveChange,
  onAddChild,
  canUpdate,
  canDelete,
  searchTerm,
  getTypeBadge,
  getTypeLabel,
  t,
  tCommon,
}: CoaTreeViewProps) {
  const filteredData = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return data;
    }

    const search = searchTerm.toLowerCase();
    const matches = (node: ChartOfAccountTreeNode): boolean => {
      const nodeMatches = `${node.code} ${node.name}`.toLowerCase().includes(search);
      if (nodeMatches) return true;
      if (node.children) {
        return node.children.some((child) => matches(child));
      }
      return false;
    };

    return data.filter((node) => matches(node));
  }, [data, searchTerm]);

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-3 py-2.5 border-b">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="border rounded-lg bg-muted/50 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("messages.noAccounts")}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {filteredData.map((node) => (
        <CoaTreeNodeWrapper
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onActiveChange={onActiveChange}
          onAddChild={onAddChild}
          canUpdate={canUpdate}
          canDelete={canDelete}
          getTypeBadge={getTypeBadge}
          getTypeLabel={getTypeLabel}
          t={t}
          tCommon={tCommon}
        />
      ))}
    </div>
  );
}
