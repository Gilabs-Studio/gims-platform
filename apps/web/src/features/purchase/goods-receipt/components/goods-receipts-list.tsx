"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import {
  useConfirmGoodsReceipt,
  useDeleteGoodsReceipt,
  useGoodsReceipts,
} from "../hooks/use-goods-receipts";
import { goodsReceiptsService } from "../services/goods-receipts-service";
import type { GoodsReceiptListItem } from "../types";
import { GoodsReceiptAuditTrail } from "./goods-receipt-audit-trail";
import { GoodsReceiptDetail } from "./goods-receipt-detail";
import { GoodsReceiptForm } from "./goods-receipt-form";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

export function GoodsReceiptsList() {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<GoodsReceiptListItem | null>(null);

  const canCreate = useUserPermission("goods_receipt.create");
  const canExport = useUserPermission("goods_receipt.export");
  const canView = useUserPermission("goods_receipt.read");
  const canAuditTrail = useUserPermission("goods_receipt.audit_trail");
  const canConfirm = useUserPermission("goods_receipt.confirm");
  const canUpdate = useUserPermission("goods_receipt.update");
  const canDelete = useUserPermission("goods_receipt.delete");

  const { data, isLoading, isError } = useGoodsReceipts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: GoodsReceiptListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteGoodsReceipt();
  const confirmMutation = useConfirmGoodsReceipt();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleExport = async () => {
    try {
      const blob = await goodsReceiptsService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "goods_receipts.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const getStatusBadge = (rawStatus?: string | null) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            {t("status.draft")}
          </Badge>
        );
      case "confirmed":
        return (
          <Badge variant="success" className="text-xs font-medium">
            {t("status.confirmed")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs font-medium">
            {rawStatus ?? "-"}
          </Badge>
        );
    }
  };

  const canShowActions = canView || canAuditTrail || canConfirm || canUpdate || canDelete;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
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

        {canExport && (
          <Button variant="outline" onClick={handleExport} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
          </Button>
        )}

        {canCreate && (
          <Button
            onClick={() => {
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.code")}</TableHead>
              <TableHead>{t("columns.purchaseOrder")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.receiptDate")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.code}</TableCell>
                  <TableCell>{it.purchase_order?.code ?? "-"}</TableCell>
                  <TableCell>{it.supplier?.name ?? "-"}</TableCell>
                  <TableCell>{safeDate(it.receipt_date)}</TableCell>
                  <TableCell>{getStatusBadge(it.status)}</TableCell>
                  <TableCell className="flex items-center justify-between gap-2">
                    <span>{safeDate(it.created_at)}</span>

                    {canShowActions ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setDetailId(it.id);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actions.view")}
                            </DropdownMenuItem>
                          ) : null}

                          {canUpdate && normalizeStatus(it.status) === "draft" ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setEditingId(it.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                          ) : null}

                          {canConfirm && normalizeStatus(it.status) === "draft" ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={async () => {
                                try {
                                  await confirmMutation.mutateAsync(it.id);
                                  toast.success(t("toast.confirmed"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.confirm")}
                            </DropdownMenuItem>
                          ) : null}

                          {canAuditTrail ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setAuditId(it.id);
                                setAuditOpen(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              {t("actions.auditTrail")}
                            </DropdownMenuItem>
                          ) : null}

                          {canDelete ? (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive"
                              onClick={() => {
                                setDeletingItem(it);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <GoodsReceiptForm
        open={formOpen}
        goodsReceiptId={editingId}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
      />

      <GoodsReceiptDetail
        open={detailOpen}
        goodsReceiptId={detailId}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
      />

      <GoodsReceiptAuditTrail
        open={auditOpen}
        goodsReceiptId={auditId}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
      />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(v) => {
          if (!v) setDeletingItem(null);
        }}
        title={tCommon("delete")}
        description={tCommon("deleteConfirm")}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
            toast.success(t("toast.deleted"));
            setDeletingItem(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
