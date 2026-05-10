/**
 * Example Page Component: Batch Depreciation Workflow
 * 
 * This demonstrates how to integrate the depreciation preview and run functionality
 * into a complete user workflow with proper error handling and state management.
 * 
 * Location: apps/web/src/features/finance/fixed-assets/pages/batch-depreciation.page.tsx
 * (or equivalent route in your framework)
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useBatchDepreciation } from "../hooks/use-batch-depreciation";
import { BatchDepreciationPreview } from "../components/batch-depreciation-preview";
import { BatchDepreciationResults } from "../components/batch-depreciation-results";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BatchDepreciationPage() {
  const t = useTranslations("financeFixedAssets");
  const {
    preview,
    run,
    previewData,
    runData,
    periodValidationError,
    isLoadingPreview,
    isRunning,
    clearErrors,
    clearPreview,
    clearResults,
  } = useBatchDepreciation();

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [activeTab, setActiveTab] = useState("preview");

  const handlePreview = async () => {
    if (!month || !year) return;
    clearErrors();
    clearResults();
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    await preview.mutateAsync({ month: monthNum, year: yearNum });
  };

  const handleRun = async () => {
    if (!month || !year || !previewData) return;
    clearErrors();
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    await run.mutateAsync({ month: monthNum, year: yearNum });
    setActiveTab("results");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t("batchDepreciation.title")}</CardTitle>
          <CardDescription>{t("batchDepreciation.description")}</CardDescription>
        </CardHeader>
      </Card>

      {/* Main Workflow */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="preview">{t("batchDepreciation.preview")}</TabsTrigger>
          <TabsTrigger value="results" disabled={!runData}>
            {t("batchDepreciation.run")}
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <BatchDepreciationPreview
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
            onPreview={handlePreview}
            onRun={handleRun}
            previewData={previewData}
            isLoadingPreview={isLoadingPreview}
            isRunning={isRunning}
            periodValidationError={periodValidationError}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {runData && (
            <BatchDepreciationResults data={runData} />
          )}
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">{t("batchDepreciation.period")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • {t("batchDepreciation.selectPeriod")}
          </p>
          <p>
            • {t("batchDepreciation.previewResults")} with eligible assets and estimated amounts
          </p>
          <p>
            • {t("batchDepreciation.run")} will post journal entries and update ledgers
          </p>
          <p>
            • If accounting period is closed, depreciation cannot be posted
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default BatchDepreciationPage;
