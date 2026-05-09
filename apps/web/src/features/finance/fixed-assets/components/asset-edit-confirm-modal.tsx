'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface DepreciationImpact {
  old_monthly_amount: number;
  new_monthly_amount: number;
  remaining_months: number;
  old_total_remaining: number;
  new_total_remaining: number;
  impact_amount: number;
  new_book_value: number;
  entries_to_regenerate: number;
  first_affected_period: string;
  depreciation_method: string;
}

interface FieldChange {
  field_name: string;
  old_value: any;
  new_value: any;
  group: string;
  depreciation_impact?: DepreciationImpact;
}

interface AssetEditConfirmModalProps {
  isOpen: boolean;
  asset: any;
  changes: Record<string, any>;
  changedFields: string[];
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function AssetEditConfirmModal({
  isOpen,
  asset,
  changes,
  changedFields,
  isLoading,
  onConfirm,
  onCancel,
}: AssetEditConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate depreciation impact
  const hasDepreciationImpact = changedFields.some((f) =>
    ['salvageValue', 'usefulLifeMonths', 'deprecationMethod', 'categoryId'].includes(f)
  );

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Confirm Accounting-Sensitive Changes
          </DialogTitle>
          <DialogDescription>
            Your changes affect asset depreciation calculation. Please review the impact below.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="changes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="impact">Depreciation Impact</TabsTrigger>
          </TabsList>

          {/* Changes Tab */}
          <TabsContent value="changes" className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 ml-2">
                The following changes will affect your depreciation schedule and future journal entries.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {changedFields.map((fieldName) => (
                  <div
                    key={fieldName}
                    className="border-l-4 border-orange-300 bg-orange-50 p-3 rounded"
                  >
                    <div className="font-semibold text-orange-900 mb-2">
                      {formatFieldName(fieldName)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-600">Current: </span>
                        <span className="font-mono text-red-600">
                          {formatValue(asset?.[fieldName] || changes?.[fieldName]?.old)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">New: </span>
                        <span className="font-mono text-green-600">
                          {formatValue(changes?.[fieldName]?.new)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Depreciation Impact Tab */}
          <TabsContent value="impact" className="space-y-4">
            {hasDepreciationImpact ? (
              <DepreciationImpactPreview
                asset={asset}
                changes={changes}
                changedFields={changedFields}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500 text-center py-8">
                    No depreciation impact for these changes
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting || isLoading ? 'Applying Changes...' : 'Confirm & Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Depreciation Impact Preview Component
 */
function DepreciationImpactPreview({
  asset,
  changes,
  changedFields,
}: {
  asset: any;
  changes: Record<string, any>;
  changedFields: string[];
}) {
  // Mock depreciation impact - in real implementation, calculate from changes
  const mockImpact: DepreciationImpact = {
    old_monthly_amount: 100,
    new_monthly_amount: 120,
    remaining_months: 12,
    old_total_remaining: 1200,
    new_total_remaining: 1440,
    impact_amount: 240,
    new_book_value: asset?.book_value - 240,
    entries_to_regenerate: 12,
    first_affected_period: '2026-05',
    depreciation_method: changes.deprecationMethod?.new || asset?.depreciation_method,
  };

  const isDegrading = mockImpact.impact_amount > 0;

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2">
          Future depreciation schedule will be recalculated prospectively from period{' '}
          <span className="font-mono">{mockImpact.first_affected_period}</span>. Previously posted
          entries are unchanged.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Depreciation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Monthly Depreciation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Current Monthly</p>
              <p className="text-2xl font-bold text-red-600">
                ${mockImpact.old_monthly_amount.toFixed(2)}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 mb-1">New Monthly</p>
              <p className="text-2xl font-bold text-green-600">
                ${mockImpact.new_monthly_amount.toFixed(2)}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 mb-1">Change</p>
              <div className="flex items-center gap-2">
                {isDegrading ? (
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                )}
                <p className={`text-lg font-bold ${isDegrading ? 'text-orange-600' : 'text-green-600'}`}>
                  {isDegrading ? '+' : ''}{(mockImpact.new_monthly_amount - mockImpact.old_monthly_amount).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Remaining */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Total Remaining Depreciation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Current Total</p>
              <p className="text-2xl font-bold text-red-600">
                ${mockImpact.old_total_remaining.toFixed(2)}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 mb-1">New Total</p>
              <p className="text-2xl font-bold text-green-600">
                ${mockImpact.new_total_remaining.toFixed(2)}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-600 mb-1">Total Change</p>
              <p className={`text-lg font-bold ${mockImpact.impact_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {mockImpact.impact_amount > 0 ? '+' : ''}{mockImpact.impact_amount.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Regeneration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Depreciation Schedule</CardTitle>
          <CardDescription>How many entries will be recalculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
            <span className="text-sm font-medium">Entries to Regenerate</span>
            <span className="text-2xl font-bold text-blue-600">{mockImpact.entries_to_regenerate}</span>
          </div>
          <p className="text-xs text-gray-600">
            Starting from period <span className="font-mono">{mockImpact.first_affected_period}</span>
          </p>
        </CardContent>
      </Card>

      {/* New Book Value Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Projected Book Value</CardTitle>
          <CardDescription>At end of remaining depreciation period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">
            ${mockImpact.new_book_value.toFixed(2)}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Current Book Value: ${(asset?.book_value || 0).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Audit Trail Note */}
      <Alert className="border-green-200 bg-green-50">
        <AlertDescription className="text-green-800">
          ✓ All changes will be logged in the asset audit trail with before/after snapshots
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Helper Functions
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
