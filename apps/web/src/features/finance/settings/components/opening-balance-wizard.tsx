"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccount, ChartOfAccountTreeNode } from "@/features/finance/coa/types";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";

import {
  useFiscalYears,
  useOpeningBalance,
  useOpeningBalanceSummary,
  usePostOpeningBalance,
  useSimulateOpeningBalance,
  useUpsertOpeningBalance,
} from "../hooks/use-finance-settings";
import type { OpeningBalanceLineInput } from "../types";

function flattenPostableAccounts(nodes: ChartOfAccountTreeNode[]): ChartOfAccount[] {
  const out: ChartOfAccount[] = [];

  const walk = (list: ChartOfAccountTreeNode[]) => {
    for (const node of list) {
      const isActive = node.is_active;
      const isPostable = node.is_postable !== false;

      if (isActive && isPostable) {
        out.push({
          id: node.id,
          code: node.code,
          name: node.name,
          type: node.type,
          parent_id: node.parent_id,
          is_active: node.is_active,
          is_postable: node.is_postable,
          is_protected: node.is_protected,
          level: node.level,
          created_at: "",
          updated_at: "",
        });
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

export function OpeningBalanceWizard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [companyId, setCompanyId] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [lines, setLines] = useState<OpeningBalanceLineInput[]>([]);

  const canWrite = useHasPermission("opening_balance.write");
  const canPost = useHasPermission("opening_balance.post");

  const { data: companiesData } = useCompanies({ per_page: 100, is_active: true });
  const fiscalYearParams = useMemo(
    () => ({ company_id: companyId, page: 1, per_page: 100 as const }),
    [companyId],
  );
  const { data: fiscalYearsData } = useFiscalYears(fiscalYearParams);
  const { data: coaTreeData } = useFinanceCoaTree({ only_active: true });

  const { data: openingBalanceData } = useOpeningBalance(companyId, fiscalYearId);
  const { data: summaryData } = useOpeningBalanceSummary(companyId, fiscalYearId);
  const saveDraftMutation = useUpsertOpeningBalance();
  const simulateMutation = useSimulateOpeningBalance();
  const postMutation = usePostOpeningBalance();

  const companies = companiesData?.data ?? [];
  const fiscalYears = fiscalYearsData?.data ?? [];
  const accounts = useMemo(() => flattenPostableAccounts(coaTreeData?.data ?? []), [coaTreeData?.data]);

  useEffect(() => {
    const backendLines = (openingBalanceData?.data ?? []) as OpeningBalanceLineInput[];
    if (!companyId || !fiscalYearId) {
      queueMicrotask(() => setLines([]));
      return;
    }

    if (backendLines.length > 0) {
      queueMicrotask(() => setLines(backendLines));
      return;
    }

    queueMicrotask(() => setLines([]));
  }, [companyId, fiscalYearId, openingBalanceData?.data]);

  useEffect(() => {
    if (!isModalOpen || step !== 2 || !companyId || !fiscalYearId) return;
    simulateMutation.mutate({ companyId, fiscalYearId });
  }, [isModalOpen, step, companyId, fiscalYearId, simulateMutation]);

  useEffect(() => {
    if (!postMutation.isSuccess) return;
    queueMicrotask(() => {
      setIsModalOpen(false);
      setStep(1);
    });
  }, [postMutation.isSuccess]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { account_id: "", debit_amount: 0, credit_amount: 0, description: "" },
    ]);
  };

  const updateLine = (index: number, patch: Partial<OpeningBalanceLineInput>) => {
    setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const totals = useMemo(() => {
    const debit = lines.reduce((acc, line) => acc + (Number(line.debit_amount) || 0), 0);
    const credit = lines.reduce((acc, line) => acc + (Number(line.credit_amount) || 0), 0);
    return {
      debit,
      credit,
      difference: debit - credit,
      balanced: Math.abs(debit - credit) < 0.005,
    };
  }, [lines]);

  const canProceedToSummary = useMemo(() => {
    if (!companyId || !fiscalYearId || lines.length === 0) return false;

    return lines.every((line) => {
      const hasAccount = line.account_id.trim() !== "";
      const debit = Number(line.debit_amount) || 0;
      const credit = Number(line.credit_amount) || 0;
      const hasAmount = debit > 0 || credit > 0;
      const singleSided = !(debit > 0 && credit > 0);
      return hasAccount && hasAmount && singleSided;
    });
  }, [companyId, fiscalYearId, lines]);

  const canCreateOpeningBalance = canWrite && !(summaryData?.data?.is_posted ?? false);
  const canPostOpeningBalance = canPost && (simulateMutation.data?.data?.is_balanced ?? totals.balanced);

  const openCreateModal = () => {
    if (!canCreateOpeningBalance) return;
    setStep(1);
    setIsModalOpen(true);
  };

  const goToSummary = async () => {
    if (!canProceedToSummary) return;

    await saveDraftMutation.mutateAsync({
      company_id: companyId,
      fiscal_year_id: fiscalYearId,
      lines,
    });

    setStep(2);
  };

  const postOpeningBalance = () => {
    if (!canPostOpeningBalance) return;
    postMutation.mutate({ company_id: companyId, fiscal_year_id: fiscalYearId });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Opening Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="ob_company">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="ob_company" className="cursor-pointer">
                  <SelectValue placeholder="Select company" />
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
              <Label htmlFor="ob_fy">Fiscal Year</Label>
              <Select value={fiscalYearId} onValueChange={setFiscalYearId}>
                <SelectTrigger id="ob_fy" className="cursor-pointer">
                  <SelectValue placeholder="Select fiscal year" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYears.map((fy) => (
                    <SelectItem key={fy.id} value={fy.id} className="cursor-pointer">
                      {fy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">One-time Opening Balance</p>
              <p className="text-xs text-muted-foreground">Create opening balance once per company and fiscal year.</p>
              {summaryData?.data?.is_posted ? (
                <p className="mt-1 text-xs text-emerald-600">
                  Posted journal: {summaryData.data.posted_journal_id ?? "-"}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={openCreateModal}
              disabled={!companyId || !fiscalYearId || !canCreateOpeningBalance}
            >
              Create Opening Balance
            </Button>
          </div>

          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Account</th>
                    <th className="p-2">Debit</th>
                    <th className="p-2">Credit</th>
                    <th className="p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const account = accounts.find((item) => item.id === line.account_id);
                    return (
                      <tr key={`${index}-${line.account_id}`} className="border-b">
                        <td className="p-2">{account?.code ?? "-"} - {account?.name ?? "Unknown"}</td>
                        <td className="p-2">{line.debit_amount.toFixed(2)}</td>
                        <td className="p-2">{line.credit_amount.toFixed(2)}</td>
                        <td className="p-2">{line.description ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Draft is saved when you click Next</span>
              <span>
                Debit {totals.debit.toFixed(2)} | Credit {totals.credit.toFixed(2)} | Difference {totals.difference.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Opening Balance Wizard</DialogTitle>
            <DialogDescription>
              Step {step} of 2 - {step === 1 ? "Input line" : "Summary & simulation"}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Account</th>
                      <th className="p-2">Debit</th>
                      <th className="p-2">Credit</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={`${index}-${line.account_id}`} className="border-b">
                        <td className="p-2 min-w-[260px]">
                          <Select value={line.account_id} onValueChange={(value) => updateLine(index, { account_id: value })}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            value={line.debit_amount}
                            onChange={(event) => updateLine(index, { debit_amount: Number(event.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            value={line.credit_amount}
                            onChange={(event) => updateLine(index, { credit_amount: Number(event.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={line.description ?? ""}
                            onChange={(event) => updateLine(index, { description: event.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <Button type="button" variant="destructive" size="sm" className="cursor-pointer" onClick={() => removeLine(index)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={addLine}>
                  Add Line
                </Button>
                <div className="text-sm text-muted-foreground">Difference {totals.difference.toFixed(2)}</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={goToSummary}
                  disabled={!canProceedToSummary || saveDraftMutation.isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                {simulateMutation.isPending ? (
                  <p className="text-muted-foreground">Running simulation...</p>
                ) : (
                  <div className="space-y-1">
                    <p>Total Debit: {(simulateMutation.data?.data?.total_debit ?? totals.debit).toFixed(2)}</p>
                    <p>Total Credit: {(simulateMutation.data?.data?.total_credit ?? totals.credit).toFixed(2)}</p>
                    <p className={(simulateMutation.data?.data?.is_balanced ?? totals.balanced) ? "text-emerald-600" : "text-destructive"}>
                      Difference: {(simulateMutation.data?.data?.difference ?? totals.difference).toFixed(2)}
                    </p>
                    <p>Valuation Status: {simulateMutation.data?.data?.valuation_status ?? "PENDING"}</p>
                    <p>Recommendation: {simulateMutation.data?.data?.recommendation ?? "-"}</p>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Account</th>
                      <th className="p-2">Debit</th>
                      <th className="p-2">Credit</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(simulateMutation.data?.data?.lines ?? []).map((line) => (
                      <tr key={`${line.account_id}-${line.account_code}`} className="border-b">
                        <td className="p-2">{line.account_code} - {line.account_name}</td>
                        <td className="p-2">{line.debit_amount.toFixed(2)}</td>
                        <td className="p-2">{line.credit_amount.toFixed(2)}</td>
                        <td className="p-2">{line.status}</td>
                        <td className="p-2">{line.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={postOpeningBalance}
                  disabled={!canPostOpeningBalance || postMutation.isPending || (summaryData?.data?.is_posted ?? false)}
                >
                  Post
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
