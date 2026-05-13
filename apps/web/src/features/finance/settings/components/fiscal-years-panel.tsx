"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { CheckCircle2, Lock, Trash2 } from "lucide-react";

import {
  useActivateFiscalYear,
  useCreateFiscalYear,
  useDeleteFiscalYear,
  useFiscalYears,
  useLockFiscalYear,
} from "../hooks/use-finance-settings";
import type { FiscalYear, FiscalYearStatus } from "../types";

function statusVariant(status: FiscalYearStatus): "secondary" | "success" | "destructive" {
  if (status === "active") return "success";
  if (status === "locked") return "destructive";
  return "secondary";
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function FiscalYearsPanel() {
  const t = useTranslations("financeSettings");
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("FY 2026");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies({
    per_page: 100,
    is_active: true,
  });

  const companies = companiesData?.data ?? [];
  const defaultCompanyId = companies[0]?.id ?? "";
  const companyIdValue = companyId.trim() || defaultCompanyId;

  const params = useMemo(
    () => ({ company_id: companyIdValue, page: 1, per_page: 20 as const }),
    [companyIdValue],
  );

  const canWrite = useHasPermission("fiscal_year.write");
  const canDeletePermission = useHasPermission("fiscal_year.delete");
  const { data, isLoading } = useFiscalYears(params);
  const createMutation = useCreateFiscalYear();
  const activateMutation = useActivateFiscalYear();
  const lockMutation = useLockFiscalYear();
  const deleteMutation = useDeleteFiscalYear();

  const items = (data?.data ?? []) as FiscalYear[];
  const selectedCompany = companies.find((company) => company.id === companyIdValue) ?? null;

  const onCreate = (event: FormEvent) => {
    event.preventDefault();

    if (!companyIdValue) {
      return;
    }

    createMutation.mutate({
      company_id: companyIdValue,
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
    });
  };

  const isDisabledCreate = !canWrite || createMutation.isPending || !companyIdValue;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-12">
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor="company_id" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("company")}
          </Label>
          <Select value={companyIdValue} onValueChange={setCompanyId} disabled={isLoadingCompanies}>
            <SelectTrigger id="company_id" className="h-10 rounded-full cursor-pointer">
              <SelectValue placeholder={t("selectCompany")} />
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

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="fy_name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("name")}
          </Label>
          <Input
            id="fy_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 rounded-full"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fy_start" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("startDate")}
          </Label>
          <Input
            id="fy_start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-10 rounded-full"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fy_end" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("endDate")}
          </Label>
          <Input
            id="fy_end"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-10 rounded-full"
          />
        </div>

        <div className="flex items-end justify-between gap-3 md:col-span-12">
          <div className="min-h-5 text-xs text-muted-foreground">
            {selectedCompany ? (
              <span>
                {t("defaultCompanyApplied")}: <span className="font-medium text-foreground">{selectedCompany.name}</span>
              </span>
            ) : isLoadingCompanies ? (
              t("loadingCompanies")
            ) : (
              t("selectCompanyPrompt")
            )}
          </div>

          <Button
            type="submit"
            disabled={isDisabledCreate}
            onClick={onCreate}
            className="h-10 rounded-full px-5 cursor-pointer"
          >
            {t("createFiscalYear")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">{t("fiscalYearList")}</h2>
              <p className="text-sm text-muted-foreground">{t("fiscalYearListDescription")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fiscalYear")}</TableHead>
                <TableHead>{t("period")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("loadingFiscalYears")}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("noFiscalYearsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const canActivate = canWrite && item.status === "draft" && !activateMutation.isPending && companyIdValue.length > 0;
                  const canLock = canWrite && item.status === "active" && !lockMutation.isPending && companyIdValue.length > 0;
                  const canDelete =
                    canDeletePermission && item.status === "draft" && !deleteMutation.isPending && companyIdValue.length > 0;

                  const onDelete = () => {
                    if (!canDelete) {
                      return;
                    }

                    const confirmed = window.confirm(
                      t("confirmDeleteFiscalYear", { name: item.name }),
                    );

                    if (!confirmed) {
                      return;
                    }

                    deleteMutation.mutate({ id: item.id, companyId: companyIdValue });
                  };

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-primary">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            FY {new Date(item.start_date).getFullYear()} / {new Date(item.end_date).getFullYear()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{formatPeriod(item.start_date, item.end_date)}</div>
                          <div className="text-xs text-muted-foreground">{t("periodNote")}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)} className="text-xs font-medium">
                          {t(`statusValues.${item.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canActivate && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full px-3 text-xs cursor-pointer"
                              onClick={() => activateMutation.mutate({ id: item.id, companyId: companyIdValue })}
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              {t("activate")}
                            </Button>
                          )}
                          {canLock && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full px-3 text-xs cursor-pointer"
                              onClick={() => lockMutation.mutate({ id: item.id, companyId: companyIdValue })}
                            >
                              <Lock className="mr-1.5 h-3.5 w-3.5" />
                              {t("lock")}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 rounded-full px-3 text-xs cursor-pointer"
                              onClick={onDelete}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              {t("delete")}
                            </Button>
                          )}
                          {!canActivate && !canLock && !canDelete && <span className="text-xs text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
