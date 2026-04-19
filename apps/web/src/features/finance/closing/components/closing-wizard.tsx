"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";

import { formatCurrency } from "@/lib/utils";
import { getFinanceErrorMessage } from "@/features/finance/shared/finance-error-utils";
import type { FinancialClosing, FinancialClosingAnalysisResponse } from "../types";
import {
  useApproveFinanceClosing,
  useFinanceClosingAnalysis,
  useYearEndClose,
} from "../hooks/use-finance-closing";

interface ClosingWizardProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly closing?: FinancialClosing;
}

type WizardStep = "precheck" | "review" | "execute" | "complete";

export function ClosingWizard({ open, onOpenChange, closing }: ClosingWizardProps) {
  const t = useTranslations("financeClosing");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<WizardStep>("precheck");
  const [yearEndFiscalYear, setYearEndFiscalYear] = useState<number>(
    new Date().getFullYear()
  );
  const [runYearEnd, setRunYearEnd] = useState(false);

  const closingId = closing?.id ?? "";

  // Load analysis for pre-check and review
  const { data: analysisData, isLoading: analysisLoading } =
    useFinanceClosingAnalysis(closingId, {
      enabled: open && !!closingId && (step === "precheck" || step === "review"),
    });

  const analysis = analysisData?.data as
    | FinancialClosingAnalysisResponse
    | undefined;

  // Mutations
  const approveMutation = useApproveFinanceClosing();
  const yearEndMutation = useYearEndClose();

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!analysis?.rows) {
      return {
        totalAccounts: 0,
        totalClosingBalance: 0,
        totalOpeningBalance: 0,
        totalDifference: 0,
      };
    }

    return {
      totalAccounts: analysis.rows.length,
      totalClosingBalance: analysis.rows.reduce(
        (sum, row) => sum + (row.closing_balance ?? 0),
        0
      ),
      totalOpeningBalance: analysis.rows.reduce(
        (sum, row) => sum + (row.opening_balance ?? 0),
        0
      ),
      totalDifference: analysis.rows.reduce(
        (sum, row) => sum + (row.difference ?? 0),
        0
      ),
    };
  }, [analysis?.rows]);

  const handleNext = async () => {
    if (step === "precheck") {
      setStep("review");
    } else if (step === "review") {
      setStep("execute");
    } else if (step === "execute") {
      try {
        await approveMutation.mutateAsync(closingId);
        setStep("complete");
      } catch (error) {
        toast.error(getFinanceErrorMessage(error, t("toast.failed")));
      }
    }
  };

  const handleYearEnd = async () => {
    try {
      await yearEndMutation.mutateAsync(yearEndFiscalYear);
      toast.success(t("toast.yearEndClosed"));
      onOpenChange(false);
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, t("toast.failed")));
    }
  };

  const handleClose = () => {
    setStep("precheck");
    setYearEndFiscalYear(new Date().getFullYear());
    setRunYearEnd(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>{t("wizard.title") || "Financial Closing Wizard"}</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <StepIndicator
            step="precheck"
            label={t("wizard.steps.precheck") || "Pre-Check"}
            currentStep={step}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator
            step="review"
            label={t("wizard.steps.review") || "Review"}
            currentStep={step}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator
            step="execute"
            label={t("wizard.steps.execute") || "Execute"}
            currentStep={step}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator
            step="complete"
            label={t("wizard.steps.complete") || "Complete"}
            currentStep={step}
          />
        </div>

        {/* Content */}
        <div className="min-h-[400px] flex flex-col">
          {step === "precheck" && (
            <StepPreCheck
              analysis={analysis}
              isLoading={analysisLoading}
              summary={summary}
              closing={closing}
              t={t}
              tCommon={tCommon}
            />
          )}

          {step === "review" && (
            <StepReview
              analysis={analysis}
              isLoading={analysisLoading}
              summary={summary}
              closing={closing}
              t={t}
              tCommon={tCommon}
            />
          )}

          {step === "execute" && (
            <StepExecute
              closing={closing}
              isLoading={approveMutation.isPending}
              t={t}
            />
          )}

          {step === "complete" && (
            <StepComplete
              closing={closing}
              runYearEnd={runYearEnd}
              setRunYearEnd={setRunYearEnd}
              yearEndFiscalYear={yearEndFiscalYear}
              setYearEndFiscalYear={setYearEndFiscalYear}
              t={t}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step !== "complete" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="cursor-pointer"
            >
              {t("form.cancel")}
            </Button>
          )}

          {step !== "precheck" && step !== "complete" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step === "review") setStep("precheck");
                else if (step === "execute") setStep("review");
              }}
              className="cursor-pointer"
            >
              {t("form.back")}
            </Button>
          )}

          {step !== "complete" && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={
                (step === "precheck" && analysisLoading) ||
                (step === "execute" && approveMutation.isPending)
              }
              className="cursor-pointer"
            >
              {step === "execute" ? t("actions.approve") : t("form.next")}
            </Button>
          )}

          {step === "complete" && (
            <Button
              type="button"
              onClick={() => {
                if (runYearEnd) {
                  handleYearEnd();
                } else {
                  handleClose();
                }
              }}
              disabled={yearEndMutation.isPending}
              className="cursor-pointer"
            >
              {runYearEnd ? t("actions.yearEndClose") : t("form.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({
  step,
  label,
  currentStep,
}: {
  step: WizardStep;
  label: string;
  currentStep: WizardStep;
}) {
  const steps: WizardStep[] = ["precheck", "review", "execute", "complete"];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(currentStep);

  const isActive = stepIndex === currentIndex;
  const isCompleted = stepIndex < currentIndex;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
          isActive
            ? "bg-primary text-primary-foreground"
            : isCompleted
              ? "bg-success text-white"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          stepIndex + 1
        )}
      </div>
      <span className="text-xs font-medium whitespace-nowrap text-center px-1">
        {label}
      </span>
    </div>
  );
}

function StepPreCheck({
  analysis,
  isLoading,
  summary,
  closing,
  t,
  tCommon,
}: {
  analysis?: FinancialClosingAnalysisResponse;
  isLoading: boolean;
  summary: {
    totalAccounts: number;
    totalClosingBalance: number;
    totalOpeningBalance: number;
    totalDifference: number;
  };
  closing?: FinancialClosing;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t("wizard.precheck.title") || "Pre-Check Validation"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("wizard.precheck.description") ||
            "Verify all data is correct before proceeding"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-xs text-muted-foreground">{t("fields.periodEndDate")}</p>
          <p className="text-lg font-semibold">
            {closing?.period_end_date
              ? new Date(closing.period_end_date).toISOString().slice(0, 10)
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-xs text-muted-foreground">
            {t("wizard.precheck.accountCount") ||
              "Accounts Included"}
          </p>
          <p className="text-lg font-semibold">{summary.totalAccounts}</p>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-xs text-muted-foreground">
            {t("wizard.precheck.totalClosingBalance") ||
              "Total Closing Balance"}
          </p>
          <p className="text-lg font-semibold">
            {formatCurrency(summary.totalClosingBalance)}
          </p>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-xs text-muted-foreground">
            {t("wizard.precheck.totalDifference") || "Total Difference"}
          </p>
          <p className={`text-lg font-semibold ${summary.totalDifference !== 0 ? "text-primary" : ""}`}>
            {formatCurrency(summary.totalDifference)}
          </p>
        </div>
      </div>

      {summary.totalDifference !== 0 && (
        <div className="rounded-lg border border-warning bg-warning/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{t("wizard.precheck.warning") || "Warning"}</p>
            <p className="text-xs text-muted-foreground">
              {t("wizard.precheck.differenceWarning") ||
                "There are differences between opening and closing balances. Please review the trial balance."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 cursor-pointer">
              <Link href="/finance/reports/trial-balance">
                {t("wizard.precheck.openTrialBalance") || "Open Trial Balance"}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepReview({
  analysis,
  isLoading,
  summary,
  closing,
  t,
  tCommon,
}: {
  analysis?: FinancialClosingAnalysisResponse;
  isLoading: boolean;
  summary: {
    totalAccounts: number;
    totalClosingBalance: number;
    totalOpeningBalance: number;
    totalDifference: number;
  };
  closing?: FinancialClosing;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const reviewRows = analysis?.rows ?? [];
  const filteredRows = showDifferencesOnly
    ? reviewRows.filter((row) => row.difference !== 0)
    : reviewRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold mb-2">
          {t("wizard.review.title") || "Trial Balance Review"}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={showDifferencesOnly ? "default" : "outline"}
            size="sm"
            className="cursor-pointer"
            onClick={() => setShowDifferencesOnly((prev) => !prev)}
          >
            {showDifferencesOnly
              ? t("wizard.review.showAll") || "Show All"
              : t("wizard.review.showDifferencesOnly") || "Show Differences Only"}
          </Button>
          <Button asChild type="button" variant="outline" size="sm" className="cursor-pointer">
            <Link href="/finance/reports/trial-balance">
              {t("wizard.review.openTrialBalance") || "Open Trial Balance"}
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("wizard.review.description") || "Review account balances for the period"}
      </p>

      <div className="rounded-lg border overflow-hidden max-h-[420px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("analysis.account_name") || "Account"}</TableHead>
              <TableHead className="text-right">
                {t("analysis.closing_balance") || "Closing Balance"}
              </TableHead>
              <TableHead className="text-right">
                {t("analysis.opening_balance") || "Opening Balance"}
              </TableHead>
              <TableHead className="text-right">
                {t("analysis.difference") || "Difference"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row, idx) => (
              <TableRow key={row.account_id}>
                <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium">{row.account_code}</span>
                  <span className="text-muted-foreground ml-2">{row.account_name}</span>
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrency(row.closing_balance)}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatCurrency(row.opening_balance)}
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-semibold ${
                    row.difference !== 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(row.difference)}
                </TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted/50 font-semibold sticky bottom-0">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(summary.totalClosingBalance)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(summary.totalOpeningBalance)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(summary.totalDifference)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StepExecute({
  closing,
  isLoading,
  t,
}: {
  closing?: FinancialClosing;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-4 flex flex-col justify-center py-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          {t("wizard.execute.title") || "Ready to Close?"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t("wizard.execute.description") ||
            "Click approve to lock the financial closing period"}
        </p>
      </div>

      <div className="rounded-lg border border-warning bg-warning/5 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">{t("wizard.execute.warning") || "Important"}</p>
          <p className="text-xs text-muted-foreground">
            {t("wizard.execute.warningText") ||
              "Once approved, this period will be locked. No further adjustments can be made."}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            {t("wizard.execute.processing") || "Processing..."}
          </span>
        </div>
      )}
    </div>
  );
}

function StepComplete({
  closing,
  runYearEnd,
  setRunYearEnd,
  yearEndFiscalYear,
  setYearEndFiscalYear,
  t,
}: {
  closing?: FinancialClosing;
  runYearEnd: boolean;
  setRunYearEnd: (v: boolean) => void;
  yearEndFiscalYear: number;
  setYearEndFiscalYear: (v: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-6 flex flex-col justify-center py-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <h3 className="text-lg font-semibold mb-1">
          {t("wizard.complete.title") || "Closing Approved"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("wizard.complete.description") ||
            "The financial closing period has been successfully locked"}
        </p>
      </div>

      <div className="rounded-lg border p-4 bg-success/5">
        <p className="text-xs text-muted-foreground mb-1">
          {t("fields.periodEndDate")}
        </p>
        <p className="text-lg font-semibold">
          {closing?.period_end_date
            ? new Date(closing.period_end_date).toISOString().slice(0, 10)
            : "-"}
        </p>
      </div>

      <div className="space-y-3 border-t pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={runYearEnd}
            onChange={(e) => setRunYearEnd(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">
            {t("wizard.complete.runYearEnd") || "Also run year-end close"}
          </span>
        </label>

        {runYearEnd && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="fiscal-year" className="text-xs">
              {t("fields.fiscalYear") || "Fiscal Year"}
            </Label>
            <Input
              id="fiscal-year"
              type="number"
              value={yearEndFiscalYear}
              onChange={(e) => setYearEndFiscalYear(parseInt(e.target.value, 10))}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              {t("wizard.complete.yearEndInfo") ||
                "This will close the accounts and prepare for the next fiscal year"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
