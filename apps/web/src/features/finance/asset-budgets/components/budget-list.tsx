"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useDebounce } from "@/hooks/use-debounce";

import {
  useAssetBudgets,
  useDeleteAssetBudget,
  useChangeAssetBudgetStatus,
} from "../hooks/use-asset-budgets";
import type { AssetBudget, AssetBudgetStatus } from "../types";

interface BudgetListProps {
  onCreate: () => void;
  onEdit: (budget: AssetBudget) => void;
  onView: (budget: AssetBudget) => void;
}

function getStatusBadge(status: AssetBudgetStatus) {
  switch (status) {
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "active":
      return <Badge variant="success">Aktif</Badge>;
    case "closed":
      return <Badge variant="secondary">Ditutup</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Dibatalkan</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function BudgetList({ onCreate, onEdit, onView }: BudgetListProps) {
  const t = useTranslations("assetBudget");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [deleteBudget, setDeleteBudget] = useState<AssetBudget | null>(null);
  const [actionBudget, setActionBudget] = useState<{
    budget: AssetBudget;
    action: "activate" | "close";
  } | null>(null);

  const canCreate = useUserPermission("asset_budget.create");
  const canUpdate = useUserPermission("asset_budget.update");
  const canDelete = useUserPermission("asset_budget.delete");

  const { data, isLoading } = useAssetBudgets({
    page,
    per_page: 10,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = useDeleteAssetBudget();
  const changeStatusMutation = useChangeAssetBudgetStatus();

  const budgets = data?.data || [];
  const meta = data?.meta?.pagination;

  const handleDelete = async () => {
    if (!deleteBudget) return;
    await deleteMutation.mutateAsync(deleteBudget.id);
    setDeleteBudget(null);
  };

  const handleStatusChange = async () => {
    if (!actionBudget) return;
    const newStatus = actionBudget.action === "activate" ? "active" : "closed";
    await changeStatusMutation.mutateAsync({
      id: actionBudget.budget.id,
      data: { status: newStatus as AssetBudgetStatus },
    });
    setActionBudget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("placeholders.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={onCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.budgetCode")}</TableHead>
              <TableHead>{t("fields.budgetName")}</TableHead>
              <TableHead>{t("fields.fiscalYear")}</TableHead>
              <TableHead className="text-right">
                {t("fields.totalBudget")}
              </TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("messages.noBudgets")}
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-mono">
                    {budget.budget_code}
                  </TableCell>
                  <TableCell>{budget.budget_name}</TableCell>
                  <TableCell>{budget.fiscal_year}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(budget.total_budget)}
                  </TableCell>
                  <TableCell>{getStatusBadge(budget.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => onView(budget)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        {canUpdate && budget.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => onEdit(budget)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && budget.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-green-600 focus:text-green-600"
                            onClick={() =>
                              setActionBudget({ budget, action: "activate" })
                            }
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("actions.activate")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && budget.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-orange-600 focus:text-orange-600"
                            onClick={() =>
                              setActionBudget({ budget, action: "close" })
                            }
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t("actions.close")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && budget.status === "draft" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleteBudget(budget)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {meta.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
            disabled={page >= meta.total_pages}
          >
            Next
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteBudget}
        onOpenChange={() => setDeleteBudget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!actionBudget}
        onOpenChange={() => setActionBudget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionBudget?.action === "activate"
                ? t("actions.activate")
                : t("actions.close")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionBudget?.action === "activate"
                ? t("messages.confirmActivate")
                : t("messages.confirmClose")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              {actionBudget?.action === "activate"
                ? t("actions.activate")
                : t("actions.close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
