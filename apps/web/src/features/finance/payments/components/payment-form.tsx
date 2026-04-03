"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useFinanceCoaTree, useFinanceChartOfAccounts } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccount, ChartOfAccountTreeNode } from "@/features/finance/coa/types";
import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { paymentFormSchema, type PaymentFormValues } from "../schemas/payment.schema";
import { useCreateFinancePayment, useFinancePayment, useUpdateFinancePayment } from "../hooks/use-finance-payments";
import { useFinanceSettings } from "@/features/finance/settings/hooks/use-finance-settings";
import { useSupplierInvoices } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";
import { useFinanceNonTradePayables } from "@/features/finance/non-trade-payables/hooks/use-finance-non-trade-payables";
import { AsyncSelect } from "@/components/ui/async-select";
import { supplierInvoicesService } from "@/features/purchase/supplier-invoices/services/supplier-invoices-service";
import { financeNonTradePayablesService } from "@/features/finance/non-trade-payables/services/finance-non-trade-payables-service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  id?: string | null;
};

type CoaOption = { id: string; code: string; name: string };

function flattenCoa(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const out: CoaOption[] = [];
  const walk = (ns: ChartOfAccountTreeNode[]) => {
    ns.forEach((n) => {
      out.push({ id: n.id, code: n.code, name: n.name });
      if (n.children?.length) walk(n.children);
    });
  };
  walk(nodes);
  return out;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DocumentFetcherProps = {
  refType?: string | null;
  value?: string | null;
  onChange: (value: string, item?: any) => void;
  placeholder?: string;
};

// Define local document item type
type DocItem = { id: string; label: string; balance?: number };

function DocumentFetcher({ refType, value, onChange, placeholder }: DocumentFetcherProps) {
  const t = useTranslations("financePayments");

  const fetcher = useCallback(async (query: string) => {
    if (!refType) return [];
    
    try {
      console.log(`DocumentFetcher: Fetching ${refType} with query "${query}"`);
      if (refType === "SUPPLIER_INVOICE") {
        const res = await supplierInvoicesService.list({ search: query, per_page: 100 });
        console.log("DocumentFetcher: Invoices result:", res);
        if (!res?.data || !Array.isArray(res.data)) return [];

        const items = res.data
          .filter(si => si.remaining_amount > 0 && 
                  ["APPROVED", "UNPAID", "PARTIAL", "WAITING_PAYMENT"].includes(si.status))
          .map(si => ({ 
            id: si.id, 
            label: `${si.code} - ${si.invoice_number} (${si.supplier_name})`,
            balance: Number(si.remaining_amount || 0)
          }));
        console.log(`DocumentFetcher: Found ${items.length} payable invoices`);
        return items;
      } 
      
      if (refType === "NON_TRADE_PAYABLE") {
        const res = await financeNonTradePayablesService.list({ search: query, per_page: 100 });
        console.log("DocumentFetcher: NTP result:", res);
        if (!res?.data || !Array.isArray(res.data)) return [];

        const items = res.data
          .filter(ntp => ntp.amount > 0 && ntp.status !== "PAID")
          .map(ntp => ({ 
            id: ntp.id, 
            label: `${ntp.code} - ${ntp.description}`,
            balance: Number(ntp.amount || 0)
          }));
        console.log(`DocumentFetcher: Found ${items.length} payable NTPs`);
        return items;
      }

      if (refType === "UP_COUNTRY_COST") {
        // Mocking for now, will implement actual Travel Reimbursement service later
        return [];
      }
    } catch (err) {
      console.error("DocumentFetcher error:", err);
    }
    return [];
  }, [refType]);

  return (
    <AsyncSelect
      label="Document"
      placeholder={placeholder || t("fields.selectDocument")}
      value={value || ""}
      fetcher={fetcher}
      preload={true}
      getLabel={(it: any) => it.label}
      getValue={(it: any) => it.id}
      renderOption={(it: any) => (
        <div className="flex flex-col py-1">
          <span className="font-medium text-sm">{it.label}</span>
          {it.balance !== undefined && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Balance: Rp {it.balance.toLocaleString()}
            </span>
          )}
        </div>
      )}
      onChange={(v) => onChange(v)}
      width="w-full"
    />
  );
}

export function PaymentForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financePayments");

  const paymentQuery = useFinancePayment(id ?? "", { enabled: mode === "edit" && !!id && open });
  const createMutation = useCreateFinancePayment();
  const updateMutation = useUpdateFinancePayment();

  const { data: coaTreeData, isLoading: isCoaLoading } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaTreeData?.data ?? []), [coaTreeData?.data]);

  const { data: allCoaData, isLoading: isAllCoaLoading } = useFinanceChartOfAccounts({ per_page: 1000, is_active: true });
  const allCoas = allCoaData?.data ?? [];

  const { data: bankAccountsData, isLoading: isBankAccountsLoading } = useFinanceBankAccounts({ per_page: 100, is_active: true, sort_by: "name", sort_dir: "asc" });
  const bankAccounts = bankAccountsData?.data ?? [];

  const { data: settingsData, isLoading: isSettingsLoading } = useFinanceSettings();
  const settings = settingsData?.data ?? [];

  const isLoading = 
    isCoaLoading || isAllCoaLoading || isBankAccountsLoading || isSettingsLoading || (mode === "edit" && paymentQuery.isLoading);

  const getSetting = (key: string) => {
    const setting = settings.find((s) => s.setting_key === key);
    return setting?.value;
  };

  const getCoaIdFromMapping = (refType: string): string => {
    let key = "";
    if (refType === "SUPPLIER_INVOICE") key = "coa.purchase_payable";
    else if (refType === "NON_TRADE_PAYABLE") key = "coa.non_trade_payable";
    else if (refType === "UP_COUNTRY_COST") key = "coa.accrued_expense";

    if (!key) return "";
    const val = getSetting(key);
    if (!val) return "";
    
    // The setting value might be the COA CODE or COA ID. GIMS standard uses IDs in settings usually.
    const coa = allCoas.find((c) => c.id === val || c.code === val);
    return coa?.id ?? "";
  };

  const defaultValues: PaymentFormValues = useMemo(() => {
    if (mode === "edit") {
      const p = paymentQuery.data?.data;
      if (p) {
        return {
          payment_date: (p.payment_date ?? "").slice(0, 10) || todayISO(),
          description: p.description ?? "",
          bank_account_id: p.bank_account_id ?? "",
          total_amount: Number(p.total_amount ?? 0),
          allocations: (p.allocations ?? []).map((a) => ({
            chart_of_account_id: a.chart_of_account_id,
            amount: Number(a.amount ?? 0),
            memo: a.memo ?? "",
            reference_type: a.reference_type || "",
            reference_id: a.reference_id || "",
          })),
        };
      }
    }

    return {
      payment_date: todayISO(),
      description: "",
      bank_account_id: "",
      total_amount: 0,
      allocations: [{ chart_of_account_id: "", amount: 0, memo: "", reference_type: "SUPPLIER_INVOICE", reference_id: "" }],
    };
  }, [mode, paymentQuery.data?.data]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema as any),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "allocations" });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      const payload = {
        payment_date: values.payment_date,
        description: values.description ?? "",
        bank_account_id: values.bank_account_id,
        total_amount: values.total_amount,
        allocations: values.allocations.map((a) => ({
          chart_of_account_id: a.chart_of_account_id,
          amount: a.amount,
          memo: a.memo ?? "",
          reference_type: a.reference_type || null,
          reference_id: a.reference_id || null,
        })),
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const paymentId = id ?? "";
        if (!paymentId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: paymentId, data: payload });
        toast.success(t("toast.updated"));
      }

      onOpenChange(false);
    } catch (error: any) {
      const message = error.response?.data?.message || t("toast.failed");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        {mode === "edit" && paymentQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">{t("fields.paymentDate")}</Label>
                <Input id="payment_date" type="date" {...form.register("payment_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">{t("fields.totalAmount")}</Label>
                <Input type="number" step="0.01" {...form.register("total_amount", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Input id="description" {...form.register("description")} />
              </div>
              <div className="space-y-2">
                <Label>{t("fields.bankAccount")}</Label>
                <Select
                  value={form.watch("bank_account_id") || ""}
                  onValueChange={(v) => form.setValue("bank_account_id", v, { shouldDirty: true })}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id} className="cursor-pointer">
                        {ba.name} - {ba.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="text-sm font-medium">{t("title")}</div>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => append({ chart_of_account_id: "", amount: 0, memo: "", reference_type: "SUPPLIER_INVOICE", reference_id: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("form.addAllocation")}
                </Button>
              </div>

              <div className="p-3 space-y-6">
                {fields.map((f, idx) => {
                  const currentRefType = form.watch(`allocations.${idx}.reference_type`);
                  
                  return (
                    <div key={f.id} className="space-y-4 p-4 border rounded-xl bg-card/50 relative shadow-sm border-muted-foreground/10 transition-all hover:border-primary/20">
                      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                        <div className="w-full lg:w-[20%] space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("fields.referenceType")}</Label>
                          <Select
                            value={currentRefType || ""}
                            onValueChange={(v) => {
                              form.setValue(`allocations.${idx}.reference_type`, v);
                              form.setValue(`allocations.${idx}.reference_id`, "");
                              form.setValue(`allocations.${idx}.chart_of_account_id`, getCoaIdFromMapping(v));
                            }}
                          >
                            <SelectTrigger className="h-10 bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SUPPLIER_INVOICE" className="cursor-pointer">Purchase Invoice</SelectItem>
                              <SelectItem value="NON_TRADE_PAYABLE" className="cursor-pointer">Non-Trade Payable</SelectItem>
                              <SelectItem value="UP_COUNTRY_COST" className="cursor-pointer">Travel Reimbursement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full lg:w-[45%] space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("fields.selectDocument")}</Label>
                          <DocumentFetcher
                            refType={currentRefType}
                            value={form.watch(`allocations.${idx}.reference_id`)}
                            onChange={(v, item) => {
                              form.setValue(`allocations.${idx}.reference_id`, v, { shouldValidate: true });
                              if (item?.balance) {
                                form.setValue(`allocations.${idx}.amount`, item.balance, { shouldValidate: true });
                              }
                            }}
                            placeholder={t("fields.selectDocument")}
                          />
                        </div>

                        <div className="w-full lg:w-[25%] space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("fields.amount")}</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="pl-10 h-10 bg-background/50"
                              {...form.register(`allocations.${idx}.amount`, { valueAsNumber: true })} 
                            />
                          </div>
                        </div>

                        <div className="w-full lg:w-[10%] flex justify-end pb-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => remove(idx)}
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 border-t border-muted/30">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            {t("fields.account")}
                            <Badge variant="secondary" className="text-[10px] font-medium h-4 py-0 leading-none">SYSTEM MAPPED</Badge>
                          </Label>
                          <Select
                            value={form.watch(`allocations.${idx}.chart_of_account_id`) || ""}
                            disabled
                          >
                            <SelectTrigger className="h-10 bg-muted/50 border-dashed opacity-80 cursor-not-allowed">
                              <SelectValue placeholder={t("placeholders.systemResolve")} />
                            </SelectTrigger>
                            <SelectContent>
                              {coaOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.code} - {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <input type="hidden" {...form.register(`allocations.${idx}.chart_of_account_id`)} />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("fields.memo")}</Label>
                          <Input 
                            className="h-10 bg-background/50"
                            {...form.register(`allocations.${idx}.memo`)} 
                            placeholder={t("placeholders.optionalMemo")} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer" disabled={isSubmitting}>
                {t("form.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("form.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
