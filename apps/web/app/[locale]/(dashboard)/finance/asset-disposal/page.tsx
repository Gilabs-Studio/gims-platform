"use client";

import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { useAssetDisposal } from "@/features/finance/fixed-assets/hooks/use-asset-disposal";
import { AssetDisposalForm } from "@/features/finance/fixed-assets/components/asset-disposal-form";
import { AssetDisposalList } from "@/features/finance/fixed-assets/components/asset-disposal-list";
import { useState } from "react";

export default function AssetDisposalPage() {
  const [showForm, setShowForm] = useState(false);
  const { disposals, isLoading } = useAssetDisposal();

  return (
    <PermissionGuard requiredPermission="asset.update">
      <PageMotion>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asset Disposal</h1>
            <p className="text-muted-foreground">Manage asset disposal, write-off, and retirement workflows.</p>
          </div>

          {!showForm ? (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
                >
                  New Disposal
                </button>
              </div>
              <AssetDisposalList disposals={disposals} isLoading={isLoading} />
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-input text-foreground rounded-md hover:bg-accent cursor-pointer mb-4"
              >
                Back to List
              </button>
              <AssetDisposalForm onSuccess={() => setShowForm(false)} />
            </div>
          )}
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
