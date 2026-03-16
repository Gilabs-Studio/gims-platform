"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  CircleDashed,
  DollarSign,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { Asset } from "../types";
import {
  useDeleteFinanceAsset,
  useFinanceAssets,
} from "../hooks/use-finance-assets";
import { AssetForm } from "./asset-form";
import { AssetActionsDialogs } from "./asset-actions-dialogs";
import { AssetDetailModal } from "./asset-detail-modal";

type ActionMode =
  | "depreciate"
  | "transfer"
  | "dispose"
  | "sell"
  | "revalue"
  | "adjust";

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "active":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <CircleDashed className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "sold":
      return (
        <Badge variant="outline" className="text-xs font-medium text-blue-600">
          <DollarSign className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "disposed":
    case "closed":
      return (
        <Badge variant="outline" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {t(`status.${status}`)}
        </Badge>
      );
  }
}

export function AssetsList() {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("asset.create");
  const canUpdate = useUserPermission("asset.update");
  const canDelete = useUserPermission("asset.delete");
  const canDepreciate = useUserPermission("asset.update");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Asset | null>(null);

  const [deleting, setDeleting] = useState<Asset | null>(null);
  const deleteMutation = useDeleteFinanceAsset();

  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("depreciate");
  const [actionAsset, setActionAsset] = useState<Asset | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  const { data, isLoading, isError } = useFinanceAssets({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const pagination = data?.meta?.pagination;
  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {tCommon("error")}
      </div>
    );
  }

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
              setEditing(null);
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
              <TableHead>{t("fields.category")}</TableHead>
              <TableHead>{t("fields.location")}</TableHead>
              <TableHead className="text-right">
                {t("fields.bookValue")}
              </TableHead>
              <TableHead className="text-right">
                {t("fields.accumulatedDepreciation")}
              </TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  -
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="hover:underline cursor-pointer text-left font-mono"
                      onClick={() => {
                        setDetailAssetId(item.id);
                        setDetailOpen(true);
                      }}
                    >
                      {item.code}
                    </button>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category?.name ?? "-"}</TableCell>
                  <TableCell>{item.location?.name ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(item.book_value)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(item.accumulated_depreciation)}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status, t)}</TableCell>
                  <TableCell className="text-right">
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
                          onClick={() => {
                            setDetailAssetId(item.id);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.view")}
                        </DropdownMenuItem>
                        {canUpdate && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setFormMode("edit");
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {canDepreciate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-primary focus:text-primary"
                            onClick={() => {
                              setActionMode("depreciate");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <TrendingDown className="h-4 w-4 mr-2" />
                            {t("actions.depreciate")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setActionMode("transfer");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            {t("actions.transfer")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setActionMode("revalue");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {t("actions.revalue")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setActionMode("adjust");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            {t("actions.adjust")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-blue-600 focus:text-blue-600"
                            onClick={() => {
                              setActionMode("sell");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            {t("actions.sell")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && item.status === "active" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => {
                              setActionMode("dispose");
                              setActionAsset(item);
                              setActionOpen(true);
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {t("actions.dispose")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleting(item)}
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

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? rows.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <AssetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={editing}
      />

      <AssetActionsDialogs
        open={actionOpen}
        onOpenChange={setActionOpen}
        mode={actionMode}
        asset={actionAsset}
      />

      <DeleteDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("actions.delete")}
        description=""
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          const id = deleting?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeleting(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
      />

      <AssetDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        assetId={detailAssetId}
        onEdit={(asset) => {
          setDetailOpen(false);
          setFormMode("edit");
          setEditing(asset);
          setFormOpen(true);
        }}
        onAction={(mode, asset) => {
          setDetailOpen(false);
          setActionMode(mode as ActionMode);
          setActionAsset(asset);
          setActionOpen(true);
        }}
      />
    </div>
  );
}
