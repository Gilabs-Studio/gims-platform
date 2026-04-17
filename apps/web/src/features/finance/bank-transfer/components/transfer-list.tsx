"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus, Search, XCircle } from "lucide-react";
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
import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getFinanceErrorMessage } from "@/features/finance/shared/finance-error-utils";

import {
  useBankTransfers,
  useCancelBankTransfer,
  useCompleteBankTransfer,
  useCreateBankTransfer,
} from "../hooks/use-bank-transfer";
import type { BankTransferStatus, CreateBankTransferInput } from "../types";

const DEFAULT_FORM: CreateBankTransferInput = {
  company_id: "",
  from_bank_account_id: "",
  to_bank_account_id: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  reference: "",
  description: "",
};

export function BankTransferList() {
  const t = useTranslations("financeBankTransfer");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BankTransferStatus>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBankTransferInput>(DEFAULT_FORM);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const { data: companiesData } = useCompanies({ page: 1, per_page: 100, is_active: true });
  const { data: bankAccountsData } = useFinanceBankAccounts({ page: 1, per_page: 100, owner_type: "company" });

  const { data, isLoading, isError } = useBankTransfers({
    page,
    per_page: pageSize,
    company_id: companyId || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    sort_by: "date",
    sort_dir: "desc",
  });

  const createMutation = useCreateBankTransfer();
  const completeMutation = useCompleteBankTransfer();
  const cancelMutation = useCancelBankTransfer();

  const transfers = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const companyOptions = useMemo(() => companiesData?.data ?? [], [companiesData?.data]);
  const bankOptions = useMemo(() => {
    const allBanks = bankAccountsData?.data ?? [];
    if (!createForm.company_id) {
      return allBanks;
    }
    return allBanks.filter(
      (bank) => bank.owner_type === "company" && bank.owner_id === createForm.company_id,
    );
  }, [bankAccountsData?.data, createForm.company_id]);

  const submitCreate = async () => {
    if (
      !createForm.company_id ||
      !createForm.from_bank_account_id ||
      !createForm.to_bank_account_id ||
      createForm.from_bank_account_id === createForm.to_bank_account_id ||
      createForm.amount <= 0
    ) {
      toast.error(t("toast.failed"));
      return;
    }

    try {
      await createMutation.mutateAsync(createForm);
      toast.success(t("toast.created"));
      setCreateForm(DEFAULT_FORM);
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, t("toast.failed")));
    }
  };

  const submitComplete = async (id: string) => {
    try {
      await completeMutation.mutateAsync(id);
      toast.success(t("toast.completed"));
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, t("toast.failed")));
    }
  };

  const submitCancel = async () => {
    if (!cancelId || !cancelReason.trim()) {
      toast.error(t("toast.failed"));
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: cancelId,
        data: { reason: cancelReason },
      });
      toast.success(t("toast.cancelled"));
      setCancelDialogOpen(false);
      setCancelId("");
      setCancelReason("");
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, t("toast.failed")));
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
        <Button
          className="cursor-pointer"
          onClick={() => {
            setCreateForm((prev) => ({ ...DEFAULT_FORM, company_id: companyId || prev.company_id }));
            setIsCreateOpen(true);
          }}
        >
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

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as "all" | BankTransferStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={t("fields.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">All</SelectItem>
            <SelectItem value="pending" className="cursor-pointer">{t("status.pending")}</SelectItem>
            <SelectItem value="completed" className="cursor-pointer">{t("status.completed")}</SelectItem>
            <SelectItem value="cancelled" className="cursor-pointer">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.transferNumber")}</TableHead>
              <TableHead>{t("fields.date")}</TableHead>
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
                  <TableCell colSpan={6}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  -
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                  <TableCell>{formatDate(transfer.date)}</TableCell>
                  <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                  <TableCell>{transfer.journal_entry_id || "-"}</TableCell>
                  <TableCell>{t(`status.${transfer.status}`)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {transfer.status === "pending" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => void submitComplete(transfer.id)}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t("actions.complete")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => {
                              setCancelDialogOpen(true);
                              setCancelId(transfer.id);
                              setCancelReason("");
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {t("actions.cancel")}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
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
              <Select
                value={createForm.company_id}
                onValueChange={(value) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    company_id: value,
                    from_bank_account_id: "",
                    to_bank_account_id: "",
                  }));
                  setCompanyId(value);
                }}
              >
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
              <Label>{t("fields.date")}</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("fields.fromBankAccount")}</Label>
              <Select
                value={createForm.from_bank_account_id}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, from_bank_account_id: value }))}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.fromBankAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                      {account.name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.toBankAccount")}</Label>
              <Select
                value={createForm.to_bank_account_id}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, to_bank_account_id: value }))}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("fields.toBankAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                      {account.name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.amount")}</Label>
              <Input
                type="number"
                min="0"
                value={createForm.amount || ""}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: Number(event.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("fields.reference")}</Label>
              <Input
                value={createForm.reference ?? ""}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.description")}</Label>
            <Textarea
              value={createForm.description ?? ""}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            />
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

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.cancel")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("fields.reason")}</Label>
            <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setCancelDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" className="cursor-pointer" onClick={() => void submitCancel()} disabled={cancelMutation.isPending}>
              {t("actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
