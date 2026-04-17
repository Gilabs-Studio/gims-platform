"use client";

import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { useAssetRevaluation } from "@/features/finance/fixed-assets/hooks/use-asset-revaluation";
import { AssetRevaluationForm } from "@/features/finance/fixed-assets/components/asset-revaluation-form";
import { AssetRevaluationList } from "@/features/finance/fixed-assets/components/asset-revaluation-list";
import { useState } from "react";

export default function AssetRevaluationPage() {
  const [showForm, setShowForm] = useState(false);
  const { revaluations, isLoading, approve } = useAssetRevaluation();

  return (
    <PermissionGuard requiredPermission="asset.revalue">
      <PageMotion>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asset Revaluation</h1>
            <p className="text-muted-foreground">Manage asset revaluation with approval workflow.</p>
          </div>

          {!showForm ? (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
                >
                  New Revaluation
                </button>
              </div>
              <AssetRevaluationList
                revaluations={revaluations}
                isLoading={isLoading}
                onApprove={async (transactionId) => {
                  await approve.mutateAsync(transactionId);
                }}
              />
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-input text-foreground rounded-md hover:bg-accent cursor-pointer mb-4"
              >
                Back to List
              </button>
              <AssetRevaluationForm onSuccess={() => setShowForm(false)} />
            </div>
          )}
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
