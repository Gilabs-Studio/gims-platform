'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserPermission } from '@/hooks/use-user-permission';

// Stepper Step definition
interface StepperStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface AssetCreateStepperProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: AssetFormData) => Promise<void>;
}

export interface AssetFormData {
  // Step 1: Basic Information
  code?: string;
  name: string;
  description?: string;
  serialNumber?: string;
  assetTag?: string;
  barcodeOrQR?: string;
  notes?: string;

  // Step 2: Classification
  assetType: 'TANGIBLE' | 'INTANGIBLE' | 'NON_DEPRECIABLE' | 'CONSTRUCTION';
  categoryId: string;
  locationId: string;
  departmentId?: string;
  custodianId?: string;

  // Step 3: Financial Details
  acquisitionDate: Date;
  acquisitionCost: number;
  salvageValue?: number;
  currencyCode: string;
  depreciationMethod?: 'SL' | 'DB' | 'SYD' | 'UOP' | 'NONE';
  usefulLifeMonths?: number;

  // Step 4: Procurement
  supplierName?: string;
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceAttachmentFile?: File;

  // Additional
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
}

// Zod schema for validation
const assetFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Asset name is required').max(200),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  barcodeOrQR: z.string().optional(),
  notes: z.string().optional(),

  assetType: z.enum(['TANGIBLE', 'INTANGIBLE', 'NON_DEPRECIABLE', 'CONSTRUCTION']),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  departmentId: z.string().optional(),
  custodianId: z.string().optional(),

  acquisitionDate: z.date(),
  acquisitionCost: z.number().positive('Acquisition cost must be positive'),
  salvageValue: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3),
  depreciationMethod: z.enum(['SL', 'DB', 'SYD', 'UOP', 'NONE']).optional(),
  usefulLifeMonths: z.number().positive().optional(),

  supplierName: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.date().optional(),
  invoiceAttachmentFile: z.instanceof(File).optional(),

  warrantyStartDate: z.date().optional(),
  warrantyEndDate: z.date().optional(),
});

type FormData = z.infer<typeof assetFormSchema>;

const STEPS: StepperStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Asset identification and general details',
  },
  {
    id: 'classification',
    title: 'Classification',
    description: 'Asset type, category, location, and assignment',
  },
  {
    id: 'financial',
    title: 'Financial Details',
    description: 'Cost, depreciation method, and useful life',
  },
  {
    id: 'procurement',
    title: 'Procurement',
    description: 'Supplier information and invoice details',
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Verify information and create asset',
  },
];

export function AssetCreateStepper({
  open,
  onClose,
  onComplete,
}: AssetCreateStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreateAsset = useUserPermission('asset.create');

  const form = useForm<FormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      currencyCode: 'IDR',
      assetType: 'TANGIBLE',
      depreciationMethod: 'SL',
    },
    mode: 'onChange',
  });

  const handleNext = async () => {
    // Validate current step fields
    const isValid = await form.trigger();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      setError(null);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError(null);
  };

  const handleSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onComplete(data as AssetFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Fixed Asset</DialogTitle>
          <DialogDescription>
            Complete all steps to create a new asset
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 overflow-x-auto pb-4">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                if (index < currentStep) {
                  setCurrentStep(index);
                }
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                index === currentStep
                  ? 'bg-blue-600 text-white'
                  : index < currentStep
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {index < currentStep ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : index === currentStep ? (
                  <Clock className="w-4 h-4" />
                ) : null}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {STEPS[currentStep].title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {STEPS[currentStep].description}
            </p>

            {/* Render current step */}
            <AssetStepRenderer
              step={currentStep}
              form={form}
              assetType={form.watch('assetType')}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}

            {!isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !canCreateAsset}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting
                  ? 'Creating Asset...'
                  : canCreateAsset
                  ? 'Create Asset'
                  : 'No permission to create'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Step Renderer Component
interface AssetStepRendererProps {
  step: number;
  form: any;
  assetType: string;
}

function AssetStepRenderer({
  step,
  form,
  assetType,
}: AssetStepRendererProps) {
  switch (step) {
    case 0:
      return <AssetBasicInfoStep form={form} />;
    case 1:
      return <AssetClassificationStep form={form} />;
    case 2:
      return <AssetFinancialStep form={form} assetType={assetType} />;
    case 3:
      return <AssetProcurementStep form={form} />;
    case 4:
      return <AssetReviewStep form={form} />;
    default:
      return null;
  }
}

// ===== STEP COMPONENTS =====
// (Import these from separate component files)

function AssetBasicInfoStep({ form }: any) {
  return (
    <div className="space-y-4">
      {/* Asset name input */}
      <div>
        <label className="text-sm font-medium">Asset Name *</label>
        <input
          {...form.register('name')}
          placeholder="e.g., Laptop Dell XPS 15"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      {/* Additional fields... */}
    </div>
  );
}

function AssetClassificationStep({ form }: any) {
  return (
    <div className="space-y-4">
      {/* Asset type selection */}
      <div>
        <label className="text-sm font-medium">Asset Type *</label>
        <select {...form.register('assetType')} className="w-full px-3 py-2 border rounded-lg">
          <option value="TANGIBLE">Tangible Fixed Asset</option>
          <option value="INTANGIBLE">Intangible Asset</option>
          <option value="NON_DEPRECIABLE">Non-Depreciable Asset</option>
          <option value="CONSTRUCTION">Construction In Progress</option>
        </select>
      </div>
      {/* Additional fields... */}
    </div>
  );
}

function AssetFinancialStep({ form, assetType }: any) {
  const isDepreciable = assetType === 'TANGIBLE';

  return (
    <div className="space-y-4">
      {/* Acquisition cost */}
      <div>
        <label className="text-sm font-medium">Acquisition Cost *</label>
        <input
          {...form.register('acquisitionCost', { valueAsNumber: true })}
          type="number"
          placeholder="0.00"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {isDepreciable && (
        <>
          {/* Depreciation method for tangible assets */}
          <div>
            <label className="text-sm font-medium">Depreciation Method</label>
            <select {...form.register('depreciationMethod')} className="w-full px-3 py-2 border rounded-lg">
              <option value="SL">Straight Line (SL)</option>
              <option value="DB">Declining Balance (DB)</option>
              <option value="SYD">Sum of Years Digits (SYD)</option>
              <option value="UOP">Units of Production (UOP)</option>
              <option value="NONE">No Depreciation</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function AssetProcurementStep({ form }: any) {
  return (
    <div className="space-y-4">
      {/* Supplier information */}
      <div>
        <label className="text-sm font-medium">Supplier Name</label>
        <input
          {...form.register('supplierName')}
          placeholder="e.g., PT ABC Electronics"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      {/* Invoice details */}
    </div>
  );
}

function AssetReviewStep({ form }: any) {
  const formData = form.getValues();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asset Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium">Asset Name:</dt>
              <dd>{formData.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Asset Type:</dt>
              <dd>{formData.assetType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Acquisition Cost:</dt>
              <dd>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: formData.currencyCode,
                }).format(formData.acquisitionCost)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Depreciation preview if applicable */}
      {formData.assetType === 'TANGIBLE' && formData.depreciationMethod !== 'NONE' && (
        <DepreciationPreviewCard formData={formData} />
      )}
    </div>
  );
}

function DepreciationPreviewCard({ formData }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Depreciation Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Monthly Depreciation:</span>
            <span className="font-semibold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: formData.currencyCode,
              }).format(
                (formData.acquisitionCost - (formData.salvageValue || 0)) /
                  (formData.usefulLifeMonths || 1)
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Useful Life:</span>
            <span>{formData.usefulLifeMonths} months</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
