"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

import {
  useCreateTaxConfiguration,
  useTaxConfigurations,
  useToggleTaxConfigurationStatus,
} from "../hooks/use-finance-settings";
import type { TaxType } from "../types";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";
import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";

type CoaOption = {
  id: string;
  code: string;
  name: string;
};

function flattenCoaOptions(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const options: CoaOption[] = [];

  for (const node of nodes) {
    options.push({ id: node.id, code: node.code, name: node.name });

    if (Array.isArray(node.children) && node.children.length > 0) {
      options.push(...flattenCoaOptions(node.children));
    }
  }

  return options;
}

export function TaxConfigPanel() {
  const [companyId, setCompanyId] = useState("");
  const t = useTranslations("financeSettings.tax");
  const [taxCode, setTaxCode] = useState("PPN-11");
  const [taxName, setTaxName] = useState(t("list.defaultTaxName"));
  const [taxType, setTaxType] = useState<TaxType>("vat");
  const [rate, setRate] = useState("11");
  const [accountId, setAccountId] = useState("");

  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies({
    per_page: 100,
    is_active: true,
  });
  const { data: coaData, isLoading: isLoadingCoa } = useFinanceCoaTree({ only_active: true });

  const params = useMemo(
    () => ({ company_id: companyId.trim(), page: 1, per_page: 20 as const }),
    [companyId],
  );

  const canWrite = useHasPermission("tax_configuration.write");
  const { data, isLoading } = useTaxConfigurations(params);
  const createMutation = useCreateTaxConfiguration();
  const toggleMutation = useToggleTaxConfigurationStatus();

  const items = data?.data ?? [];
  const companies = companiesData?.data ?? [];
  const selectedCompany = companies.find((company) => company.id === companyId) ?? null;
  const coaOptions = useMemo(() => flattenCoaOptions(coaData?.data ?? []), [coaData?.data]);
  const selectedAccount = coaOptions.find((account) => account.id === accountId) ?? null;

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!companyId.trim() || !accountId.trim()) return;

    createMutation.mutate({
      company_id: companyId.trim(),
      tax_code: taxCode.trim(),
      tax_name: taxName.trim(),
      tax_type: taxType,
      rate: Number(rate),
      is_inclusive: false,
      account_id: accountId.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="tax_company_id">{t("fields.company")}</Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={isLoadingCompanies}>
                <SelectTrigger id="tax_company_id" className="cursor-pointer">
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
            <div>
              <Label htmlFor="tax_code">{t("fields.taxCode")}</Label>
              <Input id="tax_code" value={taxCode} onChange={(event) => setTaxCode(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax_name">{t("fields.taxName")}</Label>
              <Input id="tax_name" value={taxName} onChange={(event) => setTaxName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax_type">{t("fields.taxType")}</Label>
              <Select value={taxType} onValueChange={(value) => setTaxType(value as TaxType)}>
                <SelectTrigger id="tax_type" className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.selectTaxType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat" className="cursor-pointer">{t("types.vat")}</SelectItem>
                  <SelectItem value="income_tax" className="cursor-pointer">{t("types.incomeTax")}</SelectItem>
                  <SelectItem value="withholding_tax" className="cursor-pointer">{t("types.withholdingTax")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tax_rate">{t("fields.rate")}</Label>
              <Input id="tax_rate" type="number" value={rate} onChange={(event) => setRate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax_account_id">{t("fields.account")}</Label>
              <Select value={accountId} onValueChange={setAccountId} disabled={isLoadingCoa}>
                <SelectTrigger id="tax_account_id" className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.selectAccount")} />
                </SelectTrigger>
                <SelectContent>
                  {coaOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={!canWrite || createMutation.isPending} className="cursor-pointer">
                {t("actions.save")}
              </Button>
            </div>
          </form>
          {selectedCompany && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("fields.company")}: {selectedCompany.name}
            </p>
          )}
          {selectedAccount && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("fields.account")}: {selectedAccount.code} - {selectedAccount.name}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t("list.loading")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">{t("list.code")}</th>
                    <th className="py-2">{t("list.name")}</th>
                    <th className="py-2">{t("list.type")}</th>
                    <th className="py-2">{t("list.rate")}</th>
                    <th className="py-2">{t("list.status")}</th>
                    <th className="py-2">{t("list.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.tax_code}</td>
                      <td className="py-2">{item.tax_name}</td>
                      <td className="py-2">{item.tax_type}</td>
                      <td className="py-2">{item.rate}%</td>
                      <td className="py-2">
                        <Badge variant={item.is_active ? "success" : "secondary"}>
                          {item.is_active ? t("list.active") : t("list.inactive")}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          disabled={!canWrite || toggleMutation.isPending || !companyId.trim()}
                          onClick={() =>
                            toggleMutation.mutate({
                              id: item.id,
                              companyId: companyId.trim(),
                              isActive: !item.is_active,
                            })
                          }
                        >
                          {item.is_active ? t("list.deactivate") : t("list.activate")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
