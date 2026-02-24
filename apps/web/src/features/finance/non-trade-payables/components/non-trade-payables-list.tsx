"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";

import type { NonTradePayable } from "../types";
import {
  useDeleteFinanceNonTradePayable,
  useFinanceNonTradePayables,
  useApproveFinanceNonTradePayable
} from "../hooks/use-finance-non-trade-payables";
import { NonTradePayableForm } from "./non-trade-payable-form";
import { PayNonTradePayableDialog } from "./pay-dialog";
import { Badge } from "@/components/ui/badge";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-500",
  APPROVED: "bg-blue-500",
  PAID: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export function NonTradePayablesList() {
  const t = useTranslations("financeNonTradePayables");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("non_trade_payable.create");
  const canUpdate = useUserPermission("non_trade_payable.update");
  const canDelete = useUserPermission("non_trade_payable.delete");
  const canApprove = useUserPermission("non_trade_payable.update");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<NonTradePayable | null>(null);
  const [deleting, setDeleting] = useState<NonTradePayable | null>(null);
  const [paying, setPaying] = useState<NonTradePayable | null>(null);

  const { data, isLoading, isError } = useFinanceNonTradePayables({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "transaction_date",
    sort_dir: "desc",
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;
  const deleteMutation = useDeleteFinanceNonTradePayable();
  const approveMutation = useApproveFinanceNonTradePayable();

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("toast.approved"));
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
              <TableHead>{t("fields.transactionDate")}</TableHead>
              <TableHead>{t("fields.vendorName")}</TableHead>
              <TableHead>{t("fields.amount")}</TableHead>
              <TableHead>{t("fields.dueDate")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>{formatDate(item.transaction_date)}</TableCell>
                  <TableCell>{item.vendor_name || "-"}</TableCell>
                  <TableCell>{item.amount?.toLocaleString?.() ?? item.amount}</TableCell>
                  <TableCell>{item.due_date ? formatDate(item.due_date) : "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[item.status] || "bg-slate-500"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status === "DRAFT" && canUpdate && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setFormMode("edit");
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {item.status === "DRAFT" && canApprove && (
                          <DropdownMenuItem
                            className="cursor-pointer text-blue-600"
                            onClick={() => handleApprove(item.id)}
                          >
                            {t("actions.approve")}
                          </DropdownMenuItem>
                        )}
                        {item.status === "APPROVED" && canApprove && (
                          <DropdownMenuItem
                            className="cursor-pointer text-green-600 font-bold"
                            onClick={() => setPaying(item)}
                          >
                            {t("actions.pay")}
                          </DropdownMenuItem>
                        )}
                        {item.status === "DRAFT" && canDelete && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setDeleting(item)}>
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

      <NonTradePayableForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} initialData={editing} />

      <PayNonTradePayableDialog
        open={!!paying}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
        item={paying}
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
    </div>
  );
}
