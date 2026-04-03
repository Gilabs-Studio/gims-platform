"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { useUserPermission } from "@/hooks/use-user-permission";

import { batchUpsertFinanceSettingsSchema, BatchUpsertFinanceSettingsFormData } from "../schemas";
import { useFinanceSettings, useBatchUpsertFinanceSettings } from "../hooks/use-finance-settings";
import { useFinanceChartOfAccounts } from "@/features/finance/coa/hooks/use-finance-coa";
import type { FinanceSetting } from "../types";

export const AccountingMappingForm = () => {
  const t = useTranslations("financeSettings");
  const { data: settings, isLoading: isSettingsLoading } = useFinanceSettings();
  const { data: _coaData, isLoading: isCoaLoading } = useFinanceChartOfAccounts({ per_page: 100 });
  const { mutate: batchUpsert, isPending } = useBatchUpsertFinanceSettings();
  const canUpdate = useUserPermission("finance_settings.update");

  const coaList = useMemo(() => {
    return _coaData?.data || [];
  }, [_coaData]);

  const form = useForm<BatchUpsertFinanceSettingsFormData>({
    resolver: zodResolver(batchUpsertFinanceSettingsSchema as any),
    defaultValues: {
      settings: [],
    },
  });

  useEffect(() => {
    if (settings?.data) {
      form.reset({
        settings: settings.data.map((s: FinanceSetting) => ({
          setting_key: s.setting_key,
          value: s.value || "",
          description: s.description || "",
          category: s.category || "coa",
        })),
      });
    }
  }, [settings, form]);

  const onSubmit = (data: BatchUpsertFinanceSettingsFormData) => {
    // Ensure description is never undefined for the API
    const payload = {
      settings: data.settings.map(s => ({
        ...s,
        description: s.description || "",
      }))
    };
    batchUpsert(payload);
  };

  if (isSettingsLoading || isCoaLoading) {
    return (
      <div className="p-12 text-center bg-muted/10 rounded-xl border border-dashed animate-pulse">
        <div className="h-6 w-32 bg-muted/30 mx-auto rounded-md mb-2"></div>
        <div className="text-muted-foreground text-sm">Syncing Ledger Definitions...</div>
      </div>
    );
  }

  if (settings?.success === false || _coaData?.success === false) {
    return (
      <div className="p-12 text-center bg-destructive/10 text-destructive rounded-xl border border-destructive/20 font-medium">
        Sync Failed: Access Denied or Module Unreachable.
      </div>
    );
  }

  const requiredMappings = [
    { key: "coa.inventory_asset", label: "Inventory Asset Account", targetType: "ASSET" },
    { key: "coa.cogs", label: "Cost of Goods Sold (COGS)", targetType: "EXPENSE" },
    { key: "coa.revenue", label: "Sales Revenue", targetType: "INCOME" },
    { key: "coa.ap", label: "Accounts Payable (AP)", targetType: "LIABILITY" },
    { key: "coa.ar", label: "Accounts Receivable (AR)", targetType: "ASSET" },
    { key: "coa.cash", label: "Default Cash/Bank Account", targetType: "CASH_BANK" },
    { key: "coa.gr_ir", label: "Goods Receipt / Invoice Receipt (GR/IR)", targetType: "LIABILITY" },
    { key: "coa.inventory_gain", label: "Inventory Gain (Adjustment)", targetType: "INCOME" },
    { key: "coa.inventory_loss", label: "Inventory Loss (Adjustment)", targetType: "EXPENSE" },
    { key: "coa.tax_input", label: "VAT Input (PPN Masukan)", targetType: "ASSET" },
    { key: "coa.tax_output", label: "VAT Output (PPN Keluaran)", targetType: "LIABILITY" },
    { key: "coa.sales_advance", label: "Customer Advance (DP)", targetType: "LIABILITY" },
    { key: "coa.purchase_advance", label: "Supplier Advance (DP)", targetType: "ASSET" },
    { key: "coa.retained_earnings", label: "Retained Earnings", targetType: "EQUITY" },
    { key: "coa.non_trade_payable", label: "Non-Trade Payable", targetType: "LIABILITY" },
    { key: "coa.travel_expense", label: "Travel/Up-Country Expense", targetType: "EXPENSE" },
  ];

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-xl font-semibold">Accounting Mapping Settings</CardTitle>
        <CardDescription className="text-base">
          Map your system transactions to the appropriate Chart of Account. Accounts are filtered strictly based on the required account type to ensure financial integrity.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            {requiredMappings.map((mapping) => {
              const fields = form.watch("settings") || [];
              const fieldIndex = fields.findIndex((f) => f.setting_key === mapping.key);

              if (fieldIndex === -1) return null;

              const validCOAs = coaList.filter((c: any) => {
                const type = c.type?.toUpperCase();
                const target = mapping.targetType?.toUpperCase();
                
                // Group-based matching
                switch (target) {
                  case "ASSET":
                    return type === "ASSET" || type === "CURRENT_ASSET" || type === "FIXED_ASSET";
                  case "LIABILITY":
                    return type === "LIABILITY" || type === "TRADE_PAYABLE";
                  case "EQUITY":
                    return type === "EQUITY" || type === "RETAINED_EARNINGS"; // Handle retained earnings subtype if exists
                  case "INCOME":
                  case "REVENUE":
                    return type === "REVENUE" || type === "INCOME";
                  case "EXPENSE":
                    return type === "EXPENSE" || type === "COST_OF_GOODS_SOLD" || type === "SALARY_WAGES" || type === "OPERATIONAL";
                  case "CASH_BANK":
                    return type === "CASH_BANK";
                  default:
                    return type === target;
                }
              });

              const error = form.formState.errors.settings?.[fieldIndex]?.value;

              return (
                <Field key={mapping.key} className="space-y-3">
                  <FieldLabel className="text-sm font-semibold text-foreground/80">
                    {mapping.label}
                  </FieldLabel>
                  <Select
                    value={form.watch(`settings.${fieldIndex}.value`)}
                    onValueChange={(val) => form.setValue(`settings.${fieldIndex}.value`, val, { shouldDirty: true, shouldValidate: true })}
                  >
                    <SelectTrigger className="h-11 bg-background shadow-sm hover:border-primary/50 transition-all">
                      <SelectValue placeholder={`Choose an ${mapping.targetType} account...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {validCOAs.length > 0 ? (
                        validCOAs.map((coa: any) => (
                          <SelectItem key={coa.id} value={coa.code} className="py-2.5">
                            <span className="font-medium mr-2">{coa.code}</span>
                            <span className="text-muted-foreground">- {coa.name}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No {mapping.targetType} accounts found.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-xs italic text-muted-foreground/70">
                    Standard Mapping Class: <strong>{mapping.targetType}</strong>
                  </FieldDescription>
                  {error && <FieldError className="mt-1">{error.message}</FieldError>}
                </Field>
              );
            })}
          </div>
          <div className="flex justify-end pt-8 border-t">
            <Button 
              type="submit" 
              size="lg" 
              className="px-8 h-12 text-base font-semibold shadow-md active:scale-95 transition-all" 
              disabled={isPending || !form.formState.isDirty || !canUpdate}
            >
              {!canUpdate ? "View Only" : isPending ? "Syncing Logic..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
