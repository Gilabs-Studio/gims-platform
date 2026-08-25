"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useCashBankTransactions } from "@/features/finance/cash-bank-transactions/hooks/use-cash-bank-transactions";
import {
  useAutoMatchBankReconciliation,
  useBankReconciliation,
  useBankReconciliationFormData,
  useConfirmBankReconciliation,
  useExcludeBankReconciliationLine,
  useImportBankReconciliation,
  useLockBankReconciliation,
  useMatchBankReconciliationLine,
} from "../hooks/use-bank-reconciliation";

type Step = 1 | 2 | 3 | 4;

export function BankReconciliationWizard() {
  const t = useTranslations("financeBankReconciliation");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<Step>(1);
  const [companyId, setCompanyId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalanceInput, setStatementBalanceInput] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<"csv" | "mt940" | "ofx">("csv");
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [reconciliationId, setReconciliationId] = useState("");

  const [manualMatchMap, setManualMatchMap] = useState<Record<string, string>>({});
  const [excludeReasonMap, setExcludeReasonMap] = useState<Record<string, string>>({});

  const { data: companiesData } = useCompanies({ page: 1, per_page: 100, is_active: true });
  const { data: formData } = useBankReconciliationFormData(companyId || undefined, { enabled: !!companyId });
  const { data: detailData } = useBankReconciliation(reconciliationId, { enabled: !!reconciliationId });

  const importMutation = useImportBankReconciliation();
  const autoMatchMutation = useAutoMatchBankReconciliation();
  const matchLineMutation = useMatchBankReconciliationLine();
  const excludeLineMutation = useExcludeBankReconciliationLine();
  const confirmMutation = useConfirmBankReconciliation();
  const lockMutation = useLockBankReconciliation();

  const detail = detailData?.data;
  const lines = useMemo(() => detail?.bank_statement_lines ?? [], [detail?.bank_statement_lines]);

  const transactionDateRange = useMemo(() => {
    if (!statementDate) {
      return { from: undefined, to: undefined };
    }
    const base = new Date(statementDate);
    const from = new Date(base);
    from.setDate(base.getDate() - 3);
    const to = new Date(base);
    to.setDate(base.getDate() + 3);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, [statementDate]);

  const { data: transactionData, isLoading: transactionsLoading } = useCashBankTransactions({
    page: 1,
    per_page: 20,
    company_id: companyId || undefined,
    bank_account_id: bankAccountId || undefined,
    date_from: transactionDateRange.from,
    date_to: transactionDateRange.to,
    status: "posted",
    sort_by: "date",
    sort_dir: "desc",
  });

  const transactionItems = transactionData?.data ?? [];

  const summary = useMemo(() => {
    const matched = lines.filter((line) => ["auto_matched", "manual_matched"].includes(line.status)).length;
    const excluded = lines.filter((line) => line.status === "excluded").length;
    const unmatched = lines.filter((line) => line.status === "unmatched").length;
    return { matched, excluded, unmatched };
  }, [lines]);

  const importStatement = async () => {
    if (!companyId || !bankAccountId || !statementDate || !statementFile) {
      toast.error(t("toast.failed"));
      return;
    }

    const statementBalanceTrimmed = statementBalanceInput.trim();
    let statementBalance: number | undefined;
    if (statementBalanceTrimmed !== "") {
      const parsedStatementBalance = Number(statementBalanceTrimmed);
      if (!Number.isFinite(parsedStatementBalance)) {
        toast.error(t("toast.failed"));
        return;
      }
      statementBalance = parsedStatementBalance;
    }

    try {
      const result = await importMutation.mutateAsync({
        company_id: companyId,
        bank_account_id: bankAccountId,
        statement_date: statementDate,
        statement_balance: statementBalance,
        file_format: fileFormat,
        file: statementFile,
      });
      setReconciliationId(result.data.id);
      setStep(2);
      toast.success(t("toast.imported"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const runAutoMatch = async () => {
    if (!reconciliationId) return;
    try {
      await autoMatchMutation.mutateAsync(reconciliationId);
      setStep(3);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleMatchLine = async (lineId: string) => {
    const txId = manualMatchMap[lineId]?.trim();
    if (!txId) {
      toast.error(t("toast.failed"));
      return;
    }

    try {
      await matchLineMutation.mutateAsync({
        reconciliationId,
        lineId,
        payload: { cash_bank_transaction_id: txId },
      });
      toast.success(t("toast.matched"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleExcludeLine = async (lineId: string) => {
    const reason = excludeReasonMap[lineId]?.trim() || "Excluded during reconciliation review";

    try {
      await excludeLineMutation.mutateAsync({
        reconciliationId,
        lineId,
        payload: { reason },
      });
      toast.success(t("toast.excluded"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const confirmReconciliation = async () => {
    if (!reconciliationId) return;
    try {
      await confirmMutation.mutateAsync(reconciliationId);
      toast.success(t("toast.confirmed"));
      setStep(4);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const lockReconciliation = async () => {
    if (!reconciliationId) return;
    try {
      await lockMutation.mutateAsync(reconciliationId);
      toast.success(t("toast.locked"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const resetWizard = () => {
    setStep(1);
    setCompanyId("");
    setBankAccountId("");
    setStatementDate(new Date().toISOString().slice(0, 10));
    setStatementBalanceInput("");
    setFileFormat("csv");
    setStatementFile(null);
    setReconciliationId("");
    setManualMatchMap({});
    setExcludeReasonMap({});
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className={step === item ? "border-primary" : "border-border"}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Step {item}</div>
              <div className="text-sm font-medium">
                {item === 1 && t("steps.setup")}
                {item === 2 && t("steps.import")}
                {item === 3 && t("steps.matching")}
                {item === 4 && t("steps.summary")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("steps.setup")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.company")}</Label>
                <Select
                  value={companyId}
                  onValueChange={(value) => {
                    setCompanyId(value);
                    setBankAccountId("");
                  }}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("fields.company")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(companiesData?.data ?? []).map((company) => (
                      <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.bankAccount")}</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("fields.bankAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData?.data?.bank_accounts ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.statementDate")}</Label>
                <Input type="date" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.statementBalance")}</Label>
                <Input
                  type="number"
                  value={statementBalanceInput}
                  onChange={(event) => setStatementBalanceInput(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.fileFormat")}</Label>
                <Select value={fileFormat} onValueChange={(value) => setFileFormat(value as "csv" | "mt940" | "ofx")}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("fields.fileFormat")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData?.data?.file_formats ?? []).map((format) => (
                      <SelectItem key={format.value} value={format.value} className="cursor-pointer">
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.file")}</Label>
                <Input type="file" onChange={(event) => setStatementFile(event.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" className="cursor-pointer" onClick={() => void importStatement()} disabled={importMutation.isPending}>
                {t("actions.import")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("steps.import")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <p>{t("fields.statementDate")}: {formatDate(detail?.statement_date)}</p>
              <p>{t("fields.statementBalance")}: {formatCurrency(detail?.statement_balance ?? 0)}</p>
              <p>{t("fields.status")}: {detail?.status ? t(`status.${detail.status}`) : "-"}</p>
            </div>

            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.lineDate")}</TableHead>
                    <TableHead>{t("fields.reference")}</TableHead>
                    <TableHead>{t("fields.description")}</TableHead>
                    <TableHead>{t("fields.amount")}</TableHead>
                    <TableHead>{t("fields.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{formatDate(line.date)}</TableCell>
                      <TableCell>{line.reference || "-"}</TableCell>
                      <TableCell>{line.description || "-"}</TableCell>
                      <TableCell>{formatCurrency(line.amount)}</TableCell>
                      <TableCell>{t(`status.${line.status}`)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStep(1)}>
                {t("actions.back")}
              </Button>
              <Button type="button" className="cursor-pointer" onClick={() => void runAutoMatch()} disabled={autoMatchMutation.isPending}>
                {t("actions.autoMatch")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("steps.matching")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fields.reference")}</TableHead>
                      <TableHead>{t("fields.amount")}</TableHead>
                      <TableHead>{t("fields.status")}</TableHead>
                      <TableHead>{tCommon("action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{line.reference || "-"}</p>
                            <p className="text-xs text-muted-foreground">{line.description || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(line.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t(`status.${line.status}`)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Input
                              placeholder={t("fields.matchTransactionId")}
                              value={manualMatchMap[line.id] ?? ""}
                              onChange={(event) =>
                                setManualMatchMap((prev) => ({
                                  ...prev,
                                  [line.id]: event.target.value,
                                }))
                              }
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => void handleMatchLine(line.id)}
                                disabled={matchLineMutation.isPending}
                              >
                                {t("actions.match")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => void handleExcludeLine(line.id)}
                                disabled={excludeLineMutation.isPending}
                              >
                                {t("actions.exclude")}
                              </Button>
                            </div>
                            <Textarea
                              placeholder={t("fields.reason")}
                              value={excludeReasonMap[line.id] ?? ""}
                              onChange={(event) =>
                                setExcludeReasonMap((prev) => ({
                                  ...prev,
                                  [line.id]: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStep(2)}>
                  {t("actions.back")}
                </Button>
                <Button type="button" className="cursor-pointer" onClick={() => setStep(4)}>
                  {t("actions.next")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cash-Bank Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          {tCommon("loading")}
                        </TableCell>
                      </TableRow>
                    ) : transactionItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          -
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactionItems.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="max-w-[170px] truncate font-mono text-xs">{transaction.id}</TableCell>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>{transaction.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("steps.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="text-xl font-semibold">{summary.matched}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Excluded</p>
                <p className="text-xl font-semibold">{summary.excluded}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Unmatched</p>
                <p className="text-xl font-semibold">{summary.unmatched}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{t("fields.difference")}</p>
                <p className="text-xl font-semibold">{formatCurrency(detail?.difference ?? 0)}</p>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                {t("fields.bookBalance")}: {formatCurrency(detail?.book_balance ?? 0)} | {t("fields.statementBalance")}: {formatCurrency(detail?.statement_balance ?? 0)}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStep(3)}>
                  {t("actions.back")}
                </Button>
                <Button type="button" variant="outline" className="cursor-pointer" onClick={resetWizard}>
                  {t("actions.reset")}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => void confirmReconciliation()}
                  disabled={confirmMutation.isPending || detail?.status === "locked"}
                >
                  {t("actions.confirm")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => void lockReconciliation()}
                  disabled={lockMutation.isPending || detail?.status !== "reconciled"}
                >
                  {t("actions.lock")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
