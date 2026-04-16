"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { ChartOfAccount } from "@/features/finance/coa/types";
import {
  getMappingDefinitionByKey,
  SYSTEM_ACCOUNT_MAPPING_DEFINITIONS,
  type SystemAccountMappingDefinition,
} from "../types";

export const AccountingMappingForm = () => {
  const t = useTranslations("financeSettings");
  const { data: settingsResponse, isLoading: isSettingsLoading } = useFinanceSettings();
  const { data: coaResponse, isLoading: isCoaLoading } = useFinanceChartOfAccounts({ per_page: 100 });
  const { mutate: batchUpsert, isPending } = useBatchUpsertFinanceSettings();
  const canUpdate = useUserPermission("account_mappings.update");

  const settings = settingsResponse?.data ?? [];
  const UNMAPPED_VALUE = "__UNMAPPED__";

  const coaList = useMemo<ChartOfAccount[]>(() => coaResponse?.data ?? [], [coaResponse?.data]);

  const mappingDefinitions = useMemo<SystemAccountMappingDefinition[]>(() => {
    const existingKeys = new Set(SYSTEM_ACCOUNT_MAPPING_DEFINITIONS.map((item) => item.key));
    const dynamicMappings: SystemAccountMappingDefinition[] = settings
      .filter((setting) => !existingKeys.has(setting.key))
      .map((setting) => ({
        key: setting.key,
        label: setting.label || setting.key,
        description: setting.label || t("dynamicDescription"),
        category: setting.key.split(".")[0] ?? "general",
        allowedAccountTypes: [
          "ASSET",
          "CURRENT_ASSET",
          "FIXED_ASSET",
          "LIABILITY",
          "TRADE_PAYABLE",
          "EQUITY",
          "REVENUE",
          "EXPENSE",
          "CASH_BANK",
          "COST_OF_GOODS_SOLD",
          "SALARY_WAGES",
          "OPERATIONAL",
        ],
      }));

    return [...SYSTEM_ACCOUNT_MAPPING_DEFINITIONS, ...dynamicMappings];
  }, [settings, t]);

  type ZodResolverSchemaArg = Parameters<typeof zodResolver>[0];

  const form = useForm<BatchUpsertFinanceSettingsFormData>({
    resolver:
      zodResolver(batchUpsertFinanceSettingsSchema as unknown as ZodResolverSchemaArg) as unknown as Resolver<BatchUpsertFinanceSettingsFormData>,
    defaultValues: {
      settings: [],
    },
  });

  useEffect(() => {
    if (!settingsResponse?.data) {
      return;
    }

    const settingsByKey = new Map(settingsResponse.data.map((setting) => [setting.key, setting]));
    const hydratedSettings = mappingDefinitions.map((definition) => {
      const existing = settingsByKey.get(definition.key);
      return {
        setting_key: definition.key,
        value: existing?.coa_code ?? "",
        description: existing?.label ?? definition.description,
        category: definition.category,
      };
    });

    if (hydratedSettings.length > 0) {
      form.reset({
        settings: hydratedSettings,
      });
    }
  }, [form, mappingDefinitions, settingsResponse?.data]);

  const settingRows = form.watch("settings") ?? [];
  const fieldIndexByKey = useMemo(() => {
    return new Map(settingRows.map((row, index) => [row.setting_key, index]));
  }, [settingRows]);

  const missingRequiredCount = useMemo(() => {
    return mappingDefinitions.filter((definition) => {
      if (!definition.required) return false;
      const index = fieldIndexByKey.get(definition.key);
      if (index === undefined) return true;
      const value = settingRows[index]?.value?.trim() ?? "";
      return value.length === 0;
    }).length;
  }, [fieldIndexByKey, mappingDefinitions, settingRows]);

  const getFilteredAccounts = (definition: SystemAccountMappingDefinition) => {
    const allowedTypes = definition.allowedAccountTypes;
    return coaList.filter((coa) => {
      if (!coa.is_active) return false;
      if (coa.is_postable === false) return false;
      if (allowedTypes.length === 0) return true;
      return allowedTypes.includes(coa.type);
    });
  };

  const onSubmit = (data: BatchUpsertFinanceSettingsFormData) => {
    let hasValidationError = false;

    mappingDefinitions.forEach((definition) => {
      if (!definition.required) return;

      const index = data.settings.findIndex((row) => row.setting_key === definition.key);
      if (index === -1 || (data.settings[index]?.value?.trim() ?? "") === "") {
        hasValidationError = true;
        form.setError(`settings.${index === -1 ? 0 : index}.value`, {
          type: "manual",
          message: t("requiredValue"),
        });
      }
    });

    if (hasValidationError) {
      return;
    }

    // Ensure description is never undefined for the API
    const payload = {
      settings: data.settings.map((s) => ({
        ...s,
        description: s.description || "",
      })),
    };

    batchUpsert(payload);
  };

  if (isSettingsLoading || isCoaLoading) {
    return (
      <div className="p-12 text-center bg-muted/10 rounded-xl border border-dashed animate-pulse">
        <div className="h-6 w-32 bg-muted/30 mx-auto rounded-md mb-2"></div>
        <div className="text-muted-foreground text-sm">{t("loading")}</div>
      </div>
    );
  }

  if (settingsResponse?.success === false || coaResponse?.success === false) {
    return (
      <div className="p-12 text-center bg-destructive/10 text-destructive rounded-xl border border-destructive/20 font-medium">
        {t("loadFailed")}
      </div>
    );
  }

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-xl font-semibold">{t("title")}</CardTitle>
        <CardDescription className="text-base">
          {t("description")}
        </CardDescription>
        {missingRequiredCount > 0 && (
          <div className="mt-3 inline-flex w-fit rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
            {t("missingRequired", { count: missingRequiredCount })}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            {mappingDefinitions.map((mapping) => {
              const fieldIndex = fieldIndexByKey.get(mapping.key);
              if (fieldIndex === undefined) return null;

              const validCOAs = getFilteredAccounts(mapping);
              const selectedCode = settingRows[fieldIndex]?.value ?? "";
              const selectedAccount = coaList.find((coa) => coa.code === selectedCode);
              const selectedAccountInvalidType =
                !!selectedAccount &&
                mapping.allowedAccountTypes.length > 0 &&
                !mapping.allowedAccountTypes.includes(selectedAccount.type);

              const error = form.formState.errors.settings?.[fieldIndex]?.value;
              const mappingDefinition = getMappingDefinitionByKey(mapping.key);

              return (
                <Field key={mapping.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FieldLabel className="text-sm font-semibold text-foreground/80">
                      {mapping.label}
                    </FieldLabel>
                    {mapping.required && <Badge variant="warning">{t("required")}</Badge>}
                    {!mappingDefinition && <Badge variant="outline">{t("customKey")}</Badge>}
                  </div>
                  <Select
                    value={form.watch(`settings.${fieldIndex}.value`) || UNMAPPED_VALUE}
                    onValueChange={(val) =>
                      form.setValue(
                        `settings.${fieldIndex}.value`,
                        val === UNMAPPED_VALUE ? "" : val,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    disabled={!canUpdate}
                  >
                    <SelectTrigger className="h-11 bg-background shadow-sm hover:border-primary/50 transition-all cursor-pointer">
                      <SelectValue placeholder={t("selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED_VALUE} className="cursor-pointer">
                        {t("notMapped")}
                      </SelectItem>
                      {validCOAs.length > 0 ? (
                        validCOAs.map((coa) => (
                          <SelectItem key={coa.id} value={coa.code} className="py-2.5 cursor-pointer">
                            <span className="font-medium mr-2">{coa.code}</span>
                            <span className="text-muted-foreground">- {coa.name}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t("noMatchingAccount")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-xs italic text-muted-foreground/70 space-y-1">
                    <span className="block">{mapping.description}</span>
                    <span className="block font-mono text-[11px] not-italic">{mapping.key}</span>
                    {mapping.allowedAccountTypes.length > 0 && (
                      <span className="block not-italic">
                        {t("allowedTypes")}: <strong>{mapping.allowedAccountTypes.join(", ")}</strong>
                      </span>
                    )}
                    {selectedAccountInvalidType && (
                      <span className="block not-italic text-destructive font-medium">
                        {t("selectedTypeMismatch", { type: selectedAccount?.type ?? "-" })}
                      </span>
                    )}
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
              {!canUpdate ? t("viewOnly") : isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
