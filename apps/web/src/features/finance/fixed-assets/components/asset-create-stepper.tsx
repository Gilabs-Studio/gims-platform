'use client';
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserPermission } from '@/hooks/use-user-permission';
import { useFinanceAssetCategories } from '@/features/finance/asset-categories/hooks/use-finance-asset-categories';
import { useFinanceAssetLocations } from '@/features/finance/asset-locations/hooks/use-finance-asset-locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  usefulLifeMonths: number;

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
  usefulLifeMonths: z.number().int().positive('Useful life must be at least 1 month'),

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
    id: 'depreciation',
    title: 'Depreciation Schedule',
    description: 'Preview the monthly schedule before creating the asset',
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

const STEP_FIELDS: Array<Array<keyof FormData>> = [
  ["name", "description", "serialNumber", "assetTag", "barcodeOrQR", "notes"],
  ["assetType", "categoryId", "locationId", "departmentId", "custodianId"],
  ["acquisitionDate", "acquisitionCost", "salvageValue", "currencyCode", "depreciationMethod", "usefulLifeMonths"],
  [],
  ["supplierName", "purchaseOrderNumber", "invoiceNumber", "invoiceDate", "invoiceAttachmentFile"],
  [],
];

type DepreciationProjectionRow = {
  period: string;
  depreciation: number;
  accumulated: number;
  bookValue: number;
};

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode || 'IDR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function calculateDepreciationProjection(data: Partial<AssetFormData>): DepreciationProjectionRow[] {
  const method = data.depreciationMethod || 'SL';
  const usefulLifeMonths = data.usefulLifeMonths || 0;
  const acquisitionCost = data.acquisitionCost || 0;
  const salvageValue = data.salvageValue || 0;
  const acquisitionDate = data.acquisitionDate;

  if (method === 'NONE' || usefulLifeMonths <= 0 || acquisitionCost <= 0 || !acquisitionDate) {
    return [];
  }

  const projection: DepreciationProjectionRow[] = [];
  const depreciableBase = acquisitionCost - salvageValue;
  let accumulated = 0;
  let currentBookValue = acquisitionCost;

  for (let month = 1; month <= usefulLifeMonths; month += 1) {
    let monthlyDepreciation = 0;

    switch (method) {
      case 'SL':
        monthlyDepreciation = depreciableBase / usefulLifeMonths;
        break;
      case 'DB': {
        const rate = 2 / usefulLifeMonths;
        monthlyDepreciation = currentBookValue * (rate / 12);
        break;
      }
      case 'SYD': {
        const sumOfMonths = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;
        const remainingMonths = usefulLifeMonths - month + 1;
        monthlyDepreciation = (depreciableBase * remainingMonths) / sumOfMonths;
        break;
      }
      case 'UOP':
        monthlyDepreciation = depreciableBase / usefulLifeMonths;
        break;
      default:
        monthlyDepreciation = 0;
    }

    const remainingToDepreciate = currentBookValue - salvageValue;
    monthlyDepreciation = Math.min(monthlyDepreciation, remainingToDepreciate);

    if (monthlyDepreciation <= 0) {
      break;
    }

    accumulated += monthlyDepreciation;
    currentBookValue -= monthlyDepreciation;

    const periodDate = new Date(acquisitionDate);
    periodDate.setMonth(periodDate.getMonth() + month - 1);

    projection.push({
      period: periodDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      depreciation: monthlyDepreciation,
      accumulated,
      bookValue: Math.max(currentBookValue, salvageValue),
    });

    if (currentBookValue <= salvageValue) {
      break;
    }
  }

  return projection;
}

export function AssetCreateStepper({
  open,
  onClose,
  onComplete,
}: AssetCreateStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("financeAssets");

  const steps: StepperStep[] = [
    {
      id: 'basic',
      title: t('stepper.steps.basic.title'),
      description: t('stepper.steps.basic.description'),
    },
    {
      id: 'classification',
      title: t('stepper.steps.classification.title'),
      description: t('stepper.steps.classification.description'),
    },
    {
      id: 'financial',
      title: t('stepper.steps.financial.title'),
      description: t('stepper.steps.financial.description'),
    },
    {
      id: 'depreciation',
      title: t('stepper.steps.depreciation.title'),
      description: t('stepper.steps.depreciation.description'),
    },
    {
      id: 'procurement',
      title: t('stepper.steps.procurement.title'),
      description: t('stepper.steps.procurement.description'),
    },
    {
      id: 'review',
      title: t('stepper.steps.review.title'),
      description: t('stepper.steps.review.description'),
    },
  ];

  const canCreateAsset = useUserPermission(FINANCE_PERMISSIONS.ASSET.CREATE);

  const { data: categoriesData } = useFinanceAssetCategories({ per_page: 100 });
  const { data: locationsData } = useFinanceAssetLocations({ per_page: 100 });

  const categoryOptions = useMemo(
    () => (categoriesData?.data ?? []).map((cat) => ({ id: cat.id, name: cat.name })),
    [categoriesData?.data]
  );

  const locationOptions = useMemo(
    () => (locationsData?.data ?? []).map((loc) => ({ id: loc.id, name: loc.name })),
    [locationsData?.data]
  );

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetType: 'TANGIBLE',
      currencyCode: 'IDR',
      usefulLifeMonths: 60,
      depreciationMethod: 'SL',
      acquisitionDate: new Date(),
    },
  });

  const watchedFormData = form.watch();

  const handleNext = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    const isStepValid = await form.trigger(fieldsToValidate as never);

    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (data: AssetFormData) => {
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
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('stepper.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('stepper.createDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {t('stepper.stepProgress', { current: currentStep + 1, total: steps.length })}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (index < currentStep) {
                  setCurrentStep(index);
                }
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStep
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground'
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
          <Alert className="border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {steps[currentStep].description}
            </p>

            {/* Render current step */}
            <AssetStepRenderer
              step={currentStep}
              form={form}
              errors={form.formState.errors}
              assetType={form.watch('assetType')}
              formData={watchedFormData}
              categoryOptions={categoryOptions}
              locationOptions={locationOptions}
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
                className="cursor-pointer"
              >
                {t('stepper.previous')}
              </Button>
            )}

            {!isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {t('stepper.next')}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !canCreateAsset}
                className="cursor-pointer bg-success hover:bg-success/90 text-success-foreground"
              >
                {isSubmitting
                  ? t('stepper.creating')
                  : canCreateAsset
                  ? t('stepper.createAction')
                  : t('stepper.noPermission')}
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
  form: ReturnType<typeof useForm<AssetFormData>>;
  errors: FieldErrors<AssetFormData>;
  assetType: string;
  formData: FormData;
  categoryOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
}

function AssetStepRenderer({
  step,
  form,
  errors,
  assetType,
  formData,
  categoryOptions,
  locationOptions,
}: AssetStepRendererProps) {
  switch (step) {
    case 0:
      return <AssetBasicInfoStep form={form} errors={errors} />;
    case 1:
      return <AssetClassificationStep form={form} errors={errors} categoryOptions={categoryOptions} locationOptions={locationOptions} />;
    case 2:
      return <AssetFinancialStep form={form} errors={errors} assetType={assetType} />;
    case 3:
      return <AssetDepreciationScheduleStep formData={formData} />;
    case 4:
      return <AssetProcurementStep form={form} errors={errors} />;
    case 5:
      return <AssetReviewStep form={form} />;
    default:
      return null;
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

// ===== STEP COMPONENTS =====
// (Import these from separate component files)

interface StepComponentProps {
  form: ReturnType<typeof useForm<AssetFormData>>;
  errors?: FieldErrors<AssetFormData>;
  assetType?: string;
  categoryOptions?: Array<{ id: string; name: string }>;
  locationOptions?: Array<{ id: string; name: string }>;
}

function AssetBasicInfoStep({ form, errors }: StepComponentProps) {
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
        <FieldError message={errors?.name?.message} />
      </div>
      {/* Additional fields... */}
    </div>
  );
}

function AssetClassificationStep({ form, errors, categoryOptions = [], locationOptions = [] }: StepComponentProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Asset Type *</label>
          <select {...form.register('assetType')} className="w-full px-3 py-2 border rounded-lg">
            <option value="TANGIBLE">Tangible Fixed Asset</option>
            <option value="INTANGIBLE">Intangible Asset</option>
            <option value="NON_DEPRECIABLE">Non-Depreciable Asset</option>
            <option value="CONSTRUCTION">Construction In Progress</option>
          </select>
          <FieldError message={errors?.assetType?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Asset Category *</label>
          <Select value={form.watch('categoryId') || ''} onValueChange={(value) => form.setValue('categoryId', value, { shouldValidate: true, shouldDirty: true })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors?.categoryId?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Location *</label>
          <Select value={form.watch('locationId') || ''} onValueChange={(value) => form.setValue('locationId', value, { shouldValidate: true, shouldDirty: true })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors?.locationId?.message} />
        </div>
      </div>
    </div>
  );
}

function AssetFinancialStep({ form, errors, assetType = '' }: StepComponentProps) {
  const isDepreciable = assetType === 'TANGIBLE';

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Acquisition Date *</label>
        <input
          {...form.register('acquisitionDate', { valueAsDate: true })}
          type="date"
          className="w-full px-3 py-2 border rounded-lg"
        />
        <FieldError message={errors?.acquisitionDate?.message} />
      </div>

      {/* Acquisition cost */}
      <div>
        <label className="text-sm font-medium">Acquisition Cost *</label>
        <input
          {...form.register('acquisitionCost', { valueAsNumber: true })}
          type="number"
          placeholder="0.00"
          className="w-full px-3 py-2 border rounded-lg"
        />
        <FieldError message={errors?.acquisitionCost?.message} />
      </div>

      <div>
        <label className="text-sm font-medium">Useful Life (Months) *</label>
        <input
          {...form.register('usefulLifeMonths', { valueAsNumber: true })}
          type="number"
          min="1"
          placeholder="e.g., 60"
          className="w-full px-3 py-2 border rounded-lg"
        />
        <FieldError message={errors?.usefulLifeMonths?.message} />
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
            <FieldError message={errors?.depreciationMethod?.message} />
          </div>
        </>
      )}
    </div>
  );
}

function AssetDepreciationScheduleStep({ formData }: { formData: FormData }) {
  const projection = useMemo(() => calculateDepreciationProjection(formData), [formData]);
  const method = formData.depreciationMethod || 'SL';
  const isDepreciable = formData.assetType === 'TANGIBLE' && method !== 'NONE';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Schedule Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isDepreciable ? (
            <p className="text-sm text-muted-foreground">
              This asset type will not generate a depreciation schedule.
            </p>
          ) : projection.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Fill acquisition date, acquisition cost, salvage value, and useful life to preview the schedule.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="text-sm font-medium">{method}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Useful Life</p>
                  <p className="text-sm font-medium">{formData.usefulLifeMonths} months</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Depreciable Base</p>
                  <p className="text-sm font-medium">
                    {formatMoney((formData.acquisitionCost || 0) - (formData.salvageValue || 0), formData.currencyCode)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Preview Rows</p>
                  <p className="text-sm font-medium">{projection.length}</p>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Depreciation</TableHead>
                      <TableHead className="text-right">Accumulated</TableHead>
                      <TableHead className="text-right">Book Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projection.slice(0, 12).map((row) => (
                      <TableRow key={row.period}>
                        <TableCell>{row.period}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatMoney(row.depreciation, formData.currencyCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatMoney(row.accumulated, formData.currencyCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium">
                          {formatMoney(row.bookValue, formData.currencyCode)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {projection.length > 12 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Showing the first 12 periods. The backend will generate the full schedule on submit.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssetProcurementStep({ form, errors }: StepComponentProps) {
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
        <FieldError message={errors?.supplierName?.message} />
      </div>
      {/* Invoice details */}
    </div>
  );
}

function AssetReviewStep({ form }: StepComponentProps) {
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

function DepreciationPreviewCard({ formData }: { formData: Partial<AssetFormData> }) {
  const projection = calculateDepreciationProjection(formData as AssetFormData);
  const firstRow = projection[0];

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
              {firstRow
                ? formatMoney(firstRow.depreciation, formData.currencyCode || 'IDR')
                : '-'}
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
