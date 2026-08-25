"use client";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, TrendingUp, CheckCircle2, DollarSign, FolderOpen, ListTree } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { ChartOfAccountTreeNode, CoaType } from "../types";
import { useDeleteFinanceCoa, useFinanceCoaTree, useUpdateFinanceCoa } from "../hooks/use-finance-coa";
import { CoaForm } from "./coa-form";
import { CoaTreeView } from "./coa-tree-view";

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

  const canCreate = useUserPermission(FINANCE_PERMISSIONS.COA.CREATE);
  const canUpdate = useUserPermission(FINANCE_PERMISSIONS.COA.UPDATE);
  const canDelete = useUserPermission(FINANCE_PERMISSIONS.COA.DELETE);

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

  const tree = useMemo(() => data?.data ?? [], [data?.data]);
  const flat = useMemo(() => flatten(tree), [tree]);

  const filteredTree = useMemo(() => {
    const s = (debouncedSearch ?? "").trim().toLowerCase();
    if (!s) {
      return tree;
    }

    // When searching, auto-expand matching branches
    const matches = (node: ChartOfAccountTreeNode): boolean => {
      const nodeMatches = `${node.code} ${node.name}`.toLowerCase().includes(s);
      if (nodeMatches) return true;
      if (node.children) {
        return node.children.some((child) => matches(child));
      }
      return false;
    };

    // Auto-expand all matching parents during search
    if (tree.some((node) => matches(node))) {
      tree.forEach((node) => {
        const hasMatchingChildren = (n: ChartOfAccountTreeNode): boolean => {
          if (`${n.code} ${n.name}`.toLowerCase().includes(s)) return true;
          return n.children?.some((child) => hasMatchingChildren(child)) ?? false;
        };
        if (node.children?.some((child) => hasMatchingChildren(child))) {
          setExpandedParents((prev) => ({ ...prev, [node.id]: true }));
        }
      });
    }

    return tree.filter((node) => matches(node));
  }, [tree, debouncedSearch]);

  const parentOptions = useMemo(
    () => flat.map((x) => ({ id: x.id, code: x.code, name: x.name })),
    [flat],
  );

  const totals = useMemo(() => {
    const total = flat.length;
    const active = flat.filter((x) => x.is_active).length;
    const postable = flat.filter((x) => x.is_postable).length;
    const parents = tree.length;
    const children = total - parents;
    return { total, active, postable, parents, children };
  }, [flat, tree]);

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
    };
  }, [editingId, flat]);

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleActiveChange = async (id: string, is_active: boolean) => {
    const item = flat.find((x) => x.id === id);
    if (!item) return;

    if (item.is_protected) {
      toast.error(t("messages.protectedAction"));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          code: item.code,
          name: item.name,
          type: item.type,
          parent_id: item.parent_id ?? null,
          is_active,
        },
      });
      toast.success(t("toast.updated"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleAddChild = (parentId: string) => {
    setFormMode("create");
    setEditingId(null);
    // Store the parent ID somewhere for the form to use
    // For now, we'll update the form to accept this
    const parent = flat.find((x) => x.id === parentId);
    if (parent) {
      setFormOpen(true);
      // The form will need to be updated to accept parentId prop
    }
  };

  const getTypeBadge = (type: CoaType) => COA_TYPE_BADGES[type];

  const getTypeLabel = (labelKey: string) => t(`types.${labelKey}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          icon={<ListTree className="h-4 w-4" />}
          label={t("totals.totalAccounts")}
          value={totals.total}
          color="blue"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={t("totals.active")}
          value={totals.active}
          color="green"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label={t("totals.postable")}
          value={totals.postable}
          color="purple"
        />
        <SummaryCard
          icon={<FolderOpen className="h-4 w-4" />}
          label={t("totals.parents")}
          value={totals.parents}
          color="orange"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("totals.children")}
          value={totals.children}
          color="indigo"
        />
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tree View */}
      <CoaTreeView
        data={filteredTree}
        isLoading={isLoading}
        expandedIds={expandedParents}
        onToggleExpand={(id) => {
          setExpandedParents((prev) => ({
            ...prev,
            [id]: !prev[id],
          }));
        }}
        onEdit={(id) => {
          setFormMode("edit");
          setEditingId(id);
          setFormOpen(true);
        }}
        onDelete={(id) => {
          setDeletingId(id);
        }}
        onActiveChange={handleActiveChange}
        onAddChild={handleAddChild}
        canUpdate={canUpdate}
        canDelete={canDelete}
        searchTerm={debouncedSearch}
        getTypeBadge={getTypeBadge}
        getTypeLabel={getTypeLabel}
        t={t}
        tCommon={tCommon}
      />

      {/* Form Dialog */}
      <CoaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={formMode === "edit" ? editingItem : null}
        parentOptions={parentOptions}
      />

      {/* Delete Dialog */}
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

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "purple" | "orange" | "indigo";
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: "bg-primary/10 text-primary",
    green: "bg-success/10 text-success",
    purple: "bg-purple/10 text-purple",
    orange: "bg-warning/10 text-warning",
    indigo: "bg-cyan/10 text-cyan",
  };

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
