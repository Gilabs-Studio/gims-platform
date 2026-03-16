"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useRouter } from "@/i18n/routing";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { useCurrencies } from "@/features/master-data/currencies/hooks/use-currencies";

import type { BankAccount, UnifiedBankAccount } from "../types";
import { useDeleteFinanceBankAccount, useFinanceBankAccounts, useUpdateFinanceBankAccount } from "../hooks/use-finance-bank-accounts";
import { financeBankAccountsService } from "../services/finance-bank-accounts-service";
import { BankAccountForm } from "./bank-account-form";

function getOwnerBadgeVariant(ownerType: UnifiedBankAccount["owner_type"]) {
  if (ownerType === "company") return "default" as const;
  if (ownerType === "customer") return "success" as const;
  return "warning" as const;
}

export function BankAccountsList() {
  const t = useTranslations("financeBankAccounts");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const canCreate = useUserPermission("bank_account.create");
  const canUpdate = useUserPermission("bank_account.update");
  const canDelete = useUserPermission("bank_account.delete");
  const canViewCustomer = useUserPermission("customer.read");
  const canViewSupplier = useUserPermission("supplier.read");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [ownerFilter, setOwnerFilter] = useState<"all" | "company" | "customer" | "supplier">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<BankAccount | null>(null);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [customerDetailId, setCustomerDetailId] = useState<string | null>(null);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const [supplierDetailId, setSupplierDetailId] = useState<string | null>(null);

  const { data: currencyData } = useCurrencies({ page: 1, per_page: 100, sort_by: "code", sort_dir: "asc" });
  const currencyOptions = currencyData?.data ?? [];

  const { data, isLoading, isError } = useFinanceBankAccounts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    owner_type: ownerFilter === "all" ? undefined : ownerFilter,
    currency_id: currencyFilter === "all" ? undefined : currencyFilter,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeleteFinanceBankAccount();
  const updateMutation = useUpdateFinanceBankAccount();

  const handleOwnerClick = (item: UnifiedBankAccount) => {
    if (!item.owner_id) return;
    if (item.owner_type === "customer") {
      if (!canViewCustomer) {
        toast.error(tCommon("error"));
        return;
      }
      setCustomerDetailId(item.owner_id);
      setCustomerDetailOpen(true);
      return;
    }
    if (item.owner_type === "supplier") {
      if (!canViewSupplier) {
        toast.error(tCommon("error"));
        return;
      }
      setSupplierDetailId(item.owner_id);
      setSupplierDetailOpen(true);
    }
  };

  const handleToggleStatus = async (item: UnifiedBankAccount) => {
    if (!canUpdate || item.source_type !== "company") return;
    try {
      const detailRes = await financeBankAccountsService.getById(item.id);
      const entity = detailRes.data;
      if (!entity.currency_id) {
        toast.error(t("toast.failed"));
        return;
      }
      await updateMutation.mutateAsync({
        id: item.id,
        data: {
          name: entity.name,
          account_number: entity.account_number,
          account_holder: entity.account_holder,
          currency_id: entity.currency_id,
          chart_of_account_id: entity.chart_of_account_id ?? null,
          village_id: entity.village_id ?? null,
          bank_address: entity.bank_address,
          bank_phone: entity.bank_phone,
          is_active: !item.is_active,
        },
      });
      toast.success(t("toast.updated"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
        <Select
          value={ownerFilter}
          onValueChange={(value) => {
            setOwnerFilter(value as "all" | "company" | "customer" | "supplier");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[220px] cursor-pointer">
            <SelectValue placeholder={t("filters.ownerType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("filters.ownerAll")}</SelectItem>
            <SelectItem value="company" className="cursor-pointer">{t("ownerTypes.company")}</SelectItem>
            <SelectItem value="customer" className="cursor-pointer">{t("ownerTypes.customer")}</SelectItem>
            <SelectItem value="supplier" className="cursor-pointer">{t("ownerTypes.supplier")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currencyFilter}
          onValueChange={(value) => {
            setCurrencyFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[220px] cursor-pointer">
            <SelectValue placeholder={t("filters.currency")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("filters.currencyAll")}</SelectItem>
            {currencyOptions.map((currency) => (
              <SelectItem key={currency.id} value={currency.id} className="cursor-pointer">
                {currency.code} - {currency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                      <Badge variant={getOwnerBadgeVariant(item.owner_type)} className="text-[10px] uppercase">
                        {t(`ownerTypes.${item.owner_type}`)}
                      </Badge>
                      {item.owner_type !== "company" && item.owner_id ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOwnerClick(item)}
                            className="text-xs text-primary underline-offset-4 hover:underline cursor-pointer disabled:no-underline disabled:text-muted-foreground disabled:cursor-not-allowed"
                            disabled={(item.owner_type === "customer" && !canViewCustomer) || (item.owner_type === "supplier" && !canViewSupplier)}
                          >
                            {item.owner_name}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{item.owner_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => void handleToggleStatus(item)}
                        disabled={!canUpdate || item.source_type !== "company" || updateMutation.isPending}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{item.is_active ? t("status.active") : t("status.inactive")}</span>
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
                            if (item.source_type !== "company") {
                              toast.error(t("detail.externalOwnerHint"));
                              return;
                            }
                            router.push(`/finance/bank-accounts/${item.id}`);
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
        rowCount={pagination?.total ?? 0}
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

      <CustomerDetailModal
        open={customerDetailOpen}
        onOpenChange={(open) => {
          setCustomerDetailOpen(open);
          if (!open) setCustomerDetailId(null);
        }}
        customerId={customerDetailId}
      />

      <SupplierDetailModal
        open={supplierDetailOpen}
        onOpenChange={(open) => {
          setSupplierDetailOpen(open);
          if (!open) setSupplierDetailId(null);
        }}
        supplierId={supplierDetailId}
      />
    </div>
  );
}
