"use client";

import { Fragment, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { ChartOfAccountTreeNode, CoaType } from "../types";
import { useDeleteFinanceCoa, useFinanceCoaTree, useUpdateFinanceCoa } from "../hooks/use-finance-coa";
import { CoaForm } from "./coa-form";

const COA_TYPE_BADGES: Record<CoaType, { labelKey: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "info" | "active" | "inactive" | "soft" | "destructive" }> = {
  ASSET: { labelKey: "asset", variant: "default" },
  CASH_BANK: { labelKey: "cash_bank", variant: "success" },
  CURRENT_ASSET: { labelKey: "current_asset", variant: "secondary" },
  COST_OF_GOODS_SOLD: { labelKey: "cost_of_goods_sold", variant: "outline" },
  EQUITY: { labelKey: "equity", variant: "secondary" },
  EXPENSE: { labelKey: "expense", variant: "destructive" },
  FIXED_ASSET: { labelKey: "fixed_asset", variant: "secondary" },
  LIABILITY: { labelKey: "liability", variant: "warning" },
  OPERATIONAL: { labelKey: "operational", variant: "soft" },
  REVENUE: { labelKey: "revenue", variant: "success" },
  SALARY_WAGES: { labelKey: "salary_wages", variant: "secondary" },
  TRADE_PAYABLE: { labelKey: "trade_payable", variant: "outline" },
};

type FlatNode = {
  id: string;
  code: string;
  name: string;
  type: CoaType;
  parent_id?: string | null;
  is_active: boolean;
  is_postable: boolean;
  is_protected: boolean;
  opening_balance: number;
  opening_date?: string | null;
  depth: number;
};

function flatten(nodes: ChartOfAccountTreeNode[], depth = 0): FlatNode[] {
  const out: FlatNode[] = [];
  for (const n of nodes) {
    out.push({
      id: n.id,
      code: n.code,
      name: n.name,
      type: n.type,
      parent_id: n.parent_id ?? null,
      is_active: n.is_active,
      is_postable: n.is_postable ?? true,
      is_protected: n.is_protected ?? false,
      opening_balance: n.opening_balance ?? 0,
      opening_date: n.opening_date ?? null,
      depth,
    });
    if (Array.isArray(n.children) && n.children.length > 0) {
      out.push(...flatten(n.children, depth + 1));
    }
  }
  return out;
}

function toFlatNode(n: ChartOfAccountTreeNode, depth = 0): FlatNode {
  return {
    id: n.id,
    code: n.code,
    name: n.name,
    type: n.type,
    parent_id: n.parent_id ?? null,
    is_active: n.is_active,
    is_postable: n.is_postable ?? true,
    is_protected: n.is_protected ?? false,
    opening_balance: n.opening_balance ?? 0,
    opening_date: n.opening_date ?? null,
    depth,
  };
}

function nodeMatchesSearch(node: ChartOfAccountTreeNode, searchTerm: string): boolean {
  const selfMatch = `${node.code} ${node.name}`.toLowerCase().includes(searchTerm);
  if (selfMatch) {
    return true;
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return false;
  }

  return node.children.some((child) => nodeMatchesSearch(child, searchTerm));
}

export function CoaList() {
  const t = useTranslations("financeCoa");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("coa.create");
  const canUpdate = useUserPermission("coa.update");
  const canDelete = useUserPermission("coa.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useFinanceCoaTree({ only_active: false });
  const deleteMutation = useDeleteFinanceCoa();
  const updateMutation = useUpdateFinanceCoa();

  const tree = data?.data ?? [];
  const flat = useMemo(() => flatten(tree), [tree]);
  const parentRows = useMemo(() => tree.map((node) => toFlatNode(node, 0)), [tree]);

  const childRowsByParentId = useMemo(() => {
    const mapped = new Map<string, FlatNode[]>();
    for (const parent of tree) {
      const children = Array.isArray(parent.children) ? flatten(parent.children, 1) : [];
      mapped.set(parent.id, children);
    }
    return mapped;
  }, [tree]);

  const filtered = useMemo(() => {
    const s = (debouncedSearch ?? "").trim().toLowerCase();
    if (!s) {
      return parentRows;
    }
    return tree.filter((node) => nodeMatchesSearch(node, s)).map((node) => toFlatNode(node, 0));
  }, [debouncedSearch, parentRows, tree]);

  const parentOptions = useMemo(
    () => flat.map((x) => ({ id: x.id, code: x.code, name: x.name })),
    [flat],
  );

  const isSearchActive = (debouncedSearch ?? "").trim().length > 0;

  const matchesSearch = (row: FlatNode): boolean => {
    const s = (debouncedSearch ?? "").trim().toLowerCase();
    if (!s) {
      return true;
    }
    return `${row.code} ${row.name}`.toLowerCase().includes(s);
  };

  const toggleParentExpansion = (parentId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const editingItem = useMemo(() => {
    if (!editingId) return null;
    const item = flat.find((x) => x.id === editingId);
    if (!item) return null;
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      parent_id: item.parent_id ?? null,
      is_active: item.is_active,
      is_protected: item.is_protected,
      opening_balance: item.opening_balance,
      opening_date: item.opening_date,
    };
  }, [editingId, flat]);

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleActiveChange = async (row: FlatNode, is_active: boolean) => {
    if (row.is_protected) {
      toast.error(t("messages.protectedAction"));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: row.id,
        data: {
          code: row.code,
          name: row.name,
          type: row.type,
          parent_id: row.parent_id ?? null,
          is_active,
          opening_balance: row.opening_balance,
          opening_date: row.opening_date ?? null,
        },
      });
      toast.success(t("toast.updated"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canCreate && (
          <Button
            onClick={() => {
              setFormMode("create");
              setEditingId(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.code")}</TableHead>
              <TableHead>{t("fields.name")}</TableHead>
              <TableHead>{t("fields.type")}</TableHead>
              <TableHead>{t("fields.openingBalance")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead>{t("fields.isActive")}</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const children = childRowsByParentId.get(row.id) ?? [];
                const hasChildren = children.length > 0;
                const isExpanded = isSearchActive || (expandedParents[row.id] ?? false);
                const visibleChildren = children.filter((child) => matchesSearch(child));

                return (
                  <Fragment key={row.id}>
                    <TableRow>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{row.name}</span>
                          {!row.is_postable && (
                            <Badge variant="outline" className="text-[10px]">
                              {t("status.nonPostable")}
                            </Badge>
                          )}
                          {hasChildren && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 cursor-pointer"
                              onClick={() => toggleParentExpansion(row.id)}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="text-xs">{isExpanded ? t("actions.hideChildren") : t("actions.showChildren")}</span>
                              <Badge variant="soft" className="ml-1 text-[10px]">{children.length}</Badge>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const typeBadge = COA_TYPE_BADGES[row.type];
                          return (
                            <Badge variant={typeBadge.variant} className="text-xs font-medium capitalize">
                              {t(`types.${typeBadge.labelKey}`)}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat("id-ID", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(row.opening_balance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={row.is_postable ? "success" : "warning"}>
                            {row.is_postable ? t("status.postable") : t("status.nonPostable")}
                          </Badge>
                          {row.is_protected && <Badge variant="info">{t("status.protected")}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(checked) => handleActiveChange(row, checked)}
                            disabled={!canUpdate || updateMutation.isPending || row.is_protected}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-muted-foreground">
                            {row.is_active ? tCommon("yes") : tCommon("no")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setFormMode("edit");
                                  setEditingId(row.id);
                                  setFormOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && canDelete && <DropdownMenuSeparator />}
                            {canDelete && !row.is_protected && (
                              <DropdownMenuItem
                                onClick={() => setDeletingId(row.id)}
                                className="cursor-pointer text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("actions.delete")}
                              </DropdownMenuItem>
                            )}
                            {canDelete && row.is_protected && (
                              <DropdownMenuItem disabled>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("messages.protectedDelete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {hasChildren && isExpanded &&
                      visibleChildren.map((child) => (
                        <TableRow key={child.id} className="bg-muted/20">
                          <TableCell className="font-mono text-xs">{child.code}</TableCell>
                          <TableCell>
                            <div style={{ paddingLeft: child.depth * 16 }} className="flex items-center gap-2">
                              <span>{child.name}</span>
                              {!child.is_postable && (
                                <Badge variant="outline" className="text-[10px]">
                                  {t("status.nonPostable")}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const typeBadge = COA_TYPE_BADGES[child.type];
                              return (
                                <Badge variant={typeBadge.variant} className="text-xs font-medium capitalize">
                                  {t(`types.${typeBadge.labelKey}`)}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {new Intl.NumberFormat("id-ID", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(child.opening_balance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={child.is_postable ? "success" : "warning"}>
                                {child.is_postable ? t("status.postable") : t("status.nonPostable")}
                              </Badge>
                              {child.is_protected && <Badge variant="info">{t("status.protected")}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={child.is_active}
                                onCheckedChange={(checked) => handleActiveChange(child, checked)}
                                disabled={!canUpdate || updateMutation.isPending || child.is_protected}
                                className="cursor-pointer"
                              />
                              <span className="text-sm text-muted-foreground">
                                {child.is_active ? tCommon("yes") : tCommon("no")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canUpdate && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setFormMode("edit");
                                      setEditingId(child.id);
                                      setFormOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("actions.edit")}
                                  </DropdownMenuItem>
                                )}
                                {canUpdate && canDelete && <DropdownMenuSeparator />}
                                {canDelete && !child.is_protected && (
                                  <DropdownMenuItem
                                    onClick={() => setDeletingId(child.id)}
                                    className="cursor-pointer text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("actions.delete")}
                                  </DropdownMenuItem>
                                )}
                                {canDelete && child.is_protected && (
                                  <DropdownMenuItem disabled>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("messages.protectedDelete")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CoaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={formMode === "edit" ? editingItem : null}
        parentOptions={parentOptions}
      />

      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title={t("actions.delete")}
        description=""
        onConfirm={async () => {
          const id = deletingId ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeletingId(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
