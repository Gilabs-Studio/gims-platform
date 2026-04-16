"use client";

import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { useBatchDepreciation } from "@/features/finance/fixed-assets/hooks/use-batch-depreciation";
import { BatchDepreciationPreview } from "@/features/finance/fixed-assets/components/batch-depreciation-preview";
import { BatchDepreciationResults } from "@/features/finance/fixed-assets/components/batch-depreciation-results";
import { useState } from "react";

export default function AssetBatchDepreciationPage() {
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"preview" | "results">("preview");
  const { preview, run, previewData, runData, isLoadingPreview, isRunning } = useBatchDepreciation();

  const handlePreview = async () => {
    if (!month || !year) return;
    await preview.mutateAsync({ month: parseInt(month), year: parseInt(year) });
  };

  const handleRun = async () => {
    if (!month || !year || !previewData) return;
    const result = await run.mutateAsync({ month: parseInt(month), year: parseInt(year) });
    if (result?.success) {
      setActiveTab("results");
    }
  };

  return (
    <PermissionGuard requiredPermission="asset.depreciate">
      <PageMotion>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Batch Depreciation</h1>
            <p className="text-muted-foreground">Run or preview depreciation for all assets in a given period.</p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "results")}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="results" disabled={!runData}>Results</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
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
              />
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {runData && <BatchDepreciationResults data={runData} />}
            </TabsContent>
          </Tabs>
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
