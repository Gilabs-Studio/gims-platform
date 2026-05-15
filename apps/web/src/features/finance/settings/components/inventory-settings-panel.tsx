"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";

import { useInventorySettings, useUpdateInventorySettings } from "../hooks/use-finance-settings";
import type { InventoryValuationMethod } from "../types";

const VALUATION_OPTION_VALUES: InventoryValuationMethod[] = ["average_cost", "fifo", "specific_identification"];
const EMPTY_COMPANIES: never[] = [];

export function InventorySettingsPanel() {
  const t = useTranslations("financeSettings.inventory");
  const [companyId, setCompanyId] = useState("");
  const [valuationMethod, setValuationMethod] = useState<InventoryValuationMethod>("average_cost");

  const canWrite = useHasPermission("inventory_settings.write");
  const { data: companiesData } = useCompanies({ per_page: 100, is_active: true });
  const { data: inventorySettingsData, isLoading } = useInventorySettings(companyId);
  const updateMutation = useUpdateInventorySettings();

  const companies = companiesData?.data ?? EMPTY_COMPANIES;

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId],
  );

  const valuationOptions = useMemo(
    () =>
      VALUATION_OPTION_VALUES.map((value) => ({
        value,
        label: t(`valuationOptions.${value}.label`),
        description: t(`valuationOptions.${value}.description`),
      })),
    [t],
  );

  const isLocked = inventorySettingsData?.data?.is_locked ?? false;

  useEffect(() => {
    if (!companyId) {
      queueMicrotask(() => setValuationMethod("average_cost"));
      return;
    }

    if (!inventorySettingsData?.data) return;

    queueMicrotask(() => setValuationMethod(inventorySettingsData.data.valuation_method));
  }, [companyId, inventorySettingsData?.data]);

  const syncFormWithSettings = () => {
    if (!inventorySettingsData?.data) return;
    setValuationMethod(inventorySettingsData.data.valuation_method);
  };

  const saveSettings = () => {
    if (!companyId.trim()) return;
    updateMutation.mutate({
      company_id: companyId,
      valuation_method: valuationMethod,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="inv_company">{t("fields.company")}</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="inv_company" className="cursor-pointer">
                <SelectValue placeholder={t("placeholders.selectCompany")} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {companyId && (
            <>
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {isLoading
                  ? t("status.loading")
                  : t("status.currentLockStatus", { status: isLocked ? t("status.locked") : t("status.unlocked") })}
              </div>

              {isLocked && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{t("notices.locked")}</span>
                </div>
              )}

              <div>
                <Label htmlFor="inv_method">{t("fields.valuationMethod")}</Label>
                <Select
                  value={valuationMethod}
                  onValueChange={(value) => setValuationMethod(value as InventoryValuationMethod)}
                  disabled={isLocked}
                >
                  <SelectTrigger id="inv_method" className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.selectValuationMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {valuationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {valuationOptions.find((option) => option.value === valuationMethod)?.description}
                </p>
              </div>

              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {t("notices.roundingManaged")}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={syncFormWithSettings} className="cursor-pointer">
                  {t("actions.refresh")}
                </Button>
                <Button
                  type="button"
                  onClick={saveSettings}
                  disabled={!canWrite || isLocked || updateMutation.isPending}
                  className="cursor-pointer"
                >
                  {t("actions.save")}
                </Button>
              </div>
            </>
          )}

          {selectedCompany && (
            <p className="text-xs text-muted-foreground">
              {t("fields.company")}: {selectedCompany.name}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
