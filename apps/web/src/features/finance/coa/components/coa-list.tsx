"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, MinusCircle, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
      depth,
    });
    if (Array.isArray(n.children) && n.children.length > 0) {
      out.push(...flatten(n.children, depth + 1));
    }
  }
  return out;
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

  const { data, isLoading, isError } = useFinanceCoaTree({ only_active: false });
  const deleteMutation = useDeleteFinanceCoa();
  const updateMutation = useUpdateFinanceCoa();

  const tree = data?.data;
  const flat = useMemo(() => flatten(tree ?? []), [tree]);

  const filtered = useMemo(() => {
    const s = (debouncedSearch ?? "").trim().toLowerCase();
    if (!s) return flat;
    return flat.filter((x) => `${x.code} ${x.name}`.toLowerCase().includes(s));
  }, [flat, debouncedSearch]);

  const parentOptions = useMemo(
    () => flat.map((x) => ({ id: x.id, code: x.code, name: x.name })),
    [flat],
  );

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
    };
  }, [editingId, flat]);

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleActiveChange = async (row: FlatNode, is_active: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        data: {
          code: row.code,
          name: row.name,
          type: row.type,
          parent_id: row.parent_id ?? null,
          is_active,
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
              <TableHead>{t("fields.isActive")}</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell>
                    <div style={{ paddingLeft: row.depth * 16 }}>{row.name}</div>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.is_active}
                        onCheckedChange={(checked) => handleActiveChange(row, checked)}
                        disabled={!canUpdate || updateMutation.isPending}
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
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeletingId(row.id)}
                            className="cursor-pointer text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
