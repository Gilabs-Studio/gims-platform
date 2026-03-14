"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, MinusCircle, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { Link } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";

import type { BankAccount, UnifiedBankAccount } from "../types";
import { useDeleteFinanceBankAccount, useFinanceBankAccount, useFinanceBankAccounts } from "../hooks/use-finance-bank-accounts";
import { BankAccountForm } from "./bank-account-form";

function getOwnerHref(item: UnifiedBankAccount) {
  if (item.owner_type === "customer") return "/master-data/customers";
  if (item.owner_type === "supplier") return "/master-data/suppliers";
  if (item.owner_type === "company") return "/master-data/company";
  return null;
}

export function BankAccountsList() {
  const t = useTranslations("financeBankAccounts");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("bank_account.create");
  const canUpdate = useUserPermission("bank_account.update");
  const canDelete = useUserPermission("bank_account.delete");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<BankAccount | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<UnifiedBankAccount | null>(null);

  const { data, isLoading, isError } = useFinanceBankAccounts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteFinanceBankAccount();
  const { data: detailData, isLoading: isLoadingDetail } = useFinanceBankAccount(detailItem?.id ?? "", {
    enabled: detailOpen && detailItem?.source_type === "company" && !!detailItem.id,
  });
  const detail = detailData?.data;
  const transactions = detail?.transaction_history ?? [];

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
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
              setSelectedId(null);
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
              <TableHead>{t("fields.name")}</TableHead>
              <TableHead>{t("fields.accountNumber")}</TableHead>
              <TableHead>{t("fields.currency")}</TableHead>
              <TableHead>{t("fields.owner")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.bank_name ?? t("ownerTypes.company")}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.account_number}</TableCell>
                  <TableCell>{item.currency_detail?.code ?? item.currency}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {t(`ownerTypes.${item.owner_type}`)}
                      </Badge>
                      {getOwnerHref(item) ? (
                        <div>
                          <Link href={getOwnerHref(item) || "/"} className="text-xs text-primary underline-offset-4 hover:underline">
                            {item.owner_name}
                          </Link>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{item.owner_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "success" : "inactive"} className="text-xs font-medium">
                      {item.is_active ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />{t("status.active")}</>
                      ) : (
                        <><MinusCircle className="h-3 w-3 mr-1" />{t("status.inactive")}</>
                      )}
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
                        {canUpdate && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            disabled={item.source_type !== "company"}
                            onClick={() => {
                              if (item.source_type !== "company") return;
                              setFormMode("edit");
                              setSelectedId(item.id);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setDetailItem(item);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t("actions.viewDetails")}
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            disabled={item.source_type !== "company"}
                            onClick={() => {
                              if (item.source_type !== "company") return;
                              setDeletingItem(item as BankAccount);
                            }}
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
        rowCount={pagination?.total ?? items.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <BankAccountForm open={formOpen} onOpenChange={setFormOpen} mode={formMode} id={selectedId} />

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title={t("actions.delete")}
        description=""
        onConfirm={async () => {
          const id = deletingItem?.id ?? "";
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            toast.success(t("toast.deleted"));
            setDeletingItem(null);
          } catch {
            toast.error(t("toast.failed"));
          }
        }}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>

          {isLoadingDetail ? (
            <Skeleton className="h-28 w-full" />
          ) : detail ? (
            <div className="space-y-4">
              <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{t("fields.name")}: </span>{detail?.name ?? detailItem?.name}</div>
                <div><span className="text-muted-foreground">{t("fields.accountNumber")}: </span>{detail?.account_number ?? detailItem?.account_number}</div>
                <div><span className="text-muted-foreground">{t("fields.accountHolder")}: </span>{detail?.account_holder ?? detailItem?.account_holder}</div>
                <div><span className="text-muted-foreground">{t("fields.currency")}: </span>{detail?.currency_detail?.code ?? detail?.currency ?? detailItem?.currency}</div>
                <div><span className="text-muted-foreground">{t("fields.owner")}: </span>{detailItem?.owner_name}</div>
                <div><span className="text-muted-foreground">{t("fields.ownerType")}: </span>{detailItem ? t(`ownerTypes.${detailItem.owner_type}`) : "-"}</div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("detail.transactionHistory")}</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("fields.transactionDate")}</TableHead>
                        <TableHead>{t("fields.transactionType")}</TableHead>
                        <TableHead>{t("fields.referenceType")}</TableHead>
                        <TableHead>{t("fields.referenceNumber")}</TableHead>
                        <TableHead>{t("fields.relatedEntity")}</TableHead>
                        <TableHead className="text-right">{t("fields.amount")}</TableHead>
                        <TableHead>{t("fields.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailItem?.source_type !== "company" ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            {t("detail.externalOwnerHint")}
                          </TableCell>
                        </TableRow>
                      ) : transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            {t("detail.noTransactions")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((row) => (
                          <TableRow key={`${row.transaction_type}-${row.id}`}>
                            <TableCell>{new Date(row.transaction_date).toLocaleString()}</TableCell>
                            <TableCell>{row.transaction_type}</TableCell>
                            <TableCell>{row.reference_type}</TableCell>
                            <TableCell className="font-mono text-xs">{row.reference_number ?? row.reference_id}</TableCell>
                            <TableCell>{row.related_entity_label ?? "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                            <TableCell>{row.status}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{tCommon("error")}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
