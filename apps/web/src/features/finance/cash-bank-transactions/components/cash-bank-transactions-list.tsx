"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

import {
  useCashBankTransactionFormData,
  useCashBankTransactions,
  useCreateCashBankTransaction,
  useReverseCashBankTransaction,
} from "../hooks/use-cash-bank-transactions";
import type {
  CashBankTransaction,
  CashBankTransactionStatus,
  CashBankTransactionType,
  CreateCashBankTransactionInput,
} from "../types";

const DEFAULT_FORM: CreateCashBankTransactionInput = {
  company_id: "",
  bank_account_id: "",
  type: "payment_in",
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  reference: "",
  description: "",
  contra_account_id: null,
  attachment_url: null,
  auto_post: true,
};

export function CashBankTransactionsList() {
  const t = useTranslations("financeCashBankTransactions");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CashBankTransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CashBankTransactionStatus>("all");
  const [companyId, setCompanyId] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateCashBankTransactionInput>(DEFAULT_FORM);

  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [reversingId, setReversingId] = useState("");
  const [reverseReason, setReverseReason] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const { data: companiesData } = useCompanies({ page: 1, per_page: 100, is_active: true });
  const companies = companiesData?.data ?? [];

  const { data: formData } = useCashBankTransactionFormData(companyId || undefined, {
    enabled: isCreateOpen,
  });

  const { data, isLoading, isError } = useCashBankTransactions({
    page,
    per_page: pageSize,
    company_id: companyId || undefined,
    search: debouncedSearch || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    sort_by: "date",
    sort_dir: "desc",
  });

  const createMutation = useCreateCashBankTransaction();
  const reverseMutation = useReverseCashBankTransaction();

  const transactions = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const companyOptions = useMemo(() => companies.map((company) => ({ id: company.id, name: company.name })), [companies]);

  const openCreateDialog = () => {
    setForm((prev) => ({
      ...DEFAULT_FORM,
      company_id: companyId || prev.company_id,
    }));
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!form.company_id || !form.bank_account_id || !form.contra_account_id || form.amount <= 0) {
      toast.error(t("toast.failed"));
      return;
    }

    try {
      const response = await createMutation.mutateAsync(form);
      toast.success(t("toast.created"));
      setIsCreateOpen(false);
      setForm(DEFAULT_FORM);
      if (response?.data?.journal_entry_number) {
        toast.success(`${t("fields.journal")}: ${response.data.journal_entry_number}`);
      }
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitReverse = async () => {
    if (!reversingId || !reverseReason.trim()) {
      toast.error(t("toast.failed"));
      return;
    }

    try {
      await reverseMutation.mutateAsync({
        id: reversingId,
        data: { reason: reverseReason },
      });
      toast.success(t("toast.reversed"));
      setIsReverseOpen(false);
      setReversingId("");
      setReverseReason("");
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  if (isError) {
    return <div className="py-8 text-center text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button className="cursor-pointer" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t("actions.create")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={companyId || "all"}
          onValueChange={(value) => {
            setCompanyId(value === "all" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("fields.company")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">All Company</SelectItem>
            {companyOptions.map((company) => (
              <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as "all" | CashBankTransactionType);
              setPage(1);
            }}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder={t("fields.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">All</SelectItem>
              <SelectItem value="payment_in" className="cursor-pointer">{t("types.payment_in")}</SelectItem>
              <SelectItem value="payment_out" className="cursor-pointer">{t("types.payment_out")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as "all" | CashBankTransactionStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder={t("fields.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">All</SelectItem>
              <SelectItem value="draft" className="cursor-pointer">{t("status.draft")}</SelectItem>
              <SelectItem value="posted" className="cursor-pointer">{t("status.posted")}</SelectItem>
              <SelectItem value="reversed" className="cursor-pointer">{t("status.reversed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.referenceNumber")}</TableHead>
              <TableHead>{t("fields.date")}</TableHead>
              <TableHead>{t("fields.type")}</TableHead>
              <TableHead>{t("fields.amount")}</TableHead>
              <TableHead>{t("fields.journal")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <TableHead className="text-right">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((item: CashBankTransaction) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.reference_number}</TableCell>
                  <TableCell>{formatDate(item.date)}</TableCell>
                  <TableCell>{t(`types.${item.type}`)}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>{item.journal_entry_number || "-"}</TableCell>
                  <TableCell>{t(`status.${item.status}`)}</TableCell>
                  <TableCell className="text-right">
                    {item.status === "posted" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          setReversingId(item.id);
                          setReverseReason("");
                          setIsReverseOpen(true);
                        }}
                      >
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        {t("actions.reverse")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("form.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("fields.company")}</Label>
              <Select value={form.company_id} onValueChange={(value) => setForm((prev) => ({ ...prev, company_id: value }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.company")} />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.bankAccount")}</Label>
              <Select value={form.bank_account_id} onValueChange={(value) => setForm((prev) => ({ ...prev, bank_account_id: value }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.bankAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.data?.bank_accounts ?? []).map((bankAccount) => (
                    <SelectItem key={bankAccount.id} value={bankAccount.id} className="cursor-pointer">
                      {bankAccount.code} - {bankAccount.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.type")}</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as CashBankTransactionType }))}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_in" className="cursor-pointer">{t("types.payment_in")}</SelectItem>
                  <SelectItem value="payment_out" className="cursor-pointer">{t("types.payment_out")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.date")}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("fields.amount")}</Label>
              <Input
                type="number"
                min="0"
                value={form.amount || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("fields.contraAccount")}</Label>
              <Select
                value={form.contra_account_id ?? ""}
                onValueChange={(value) => setForm((prev) => ({ ...prev, contra_account_id: value || null }))}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.contraAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.data?.contra_accounts ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.reference")}</Label>
            <Input
              value={form.reference ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.description")}</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.journal")}</Label>
            <p className="text-xs text-muted-foreground">Auto post is enabled by default for every new cash-bank transaction.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsCreateOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" onClick={() => void submitCreate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? tCommon("loading") : t("form.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReverseOpen} onOpenChange={setIsReverseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reverse.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("reverse.description")}</p>
          <div className="space-y-2">
            <Label>{t("fields.reason")}</Label>
            <Textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsReverseOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" className="cursor-pointer" onClick={() => void submitReverse()} disabled={reverseMutation.isPending}>
              {reverseMutation.isPending ? t("actions.reversing") : t("actions.reverse")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
