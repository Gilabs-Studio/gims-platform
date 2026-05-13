'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAssetEdit } from '../hooks/use-asset-edit';
import { AssetEditConfirmModal } from './asset-edit-confirm-modal';
import { useUserPermission } from '@/hooks/use-user-permission';
import { useAuthStore } from '@/features/auth/stores/use-auth-store';

/**
 * Field Classification:
 * - GROUP A (Non-accounting): Free to change
 * - GROUP B (Accounting-sensitive): Need confirmation & depreciation recalc
 * - GROUP C (Immutable): Cannot change after active status (unless admin)
 */

const editAssetSchema = z.object({
  // Group A - Non-accounting fields
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['pending_approval', 'active', 'in_use', 'idle', 'under_maintenance', 'disposed', 'sold', 'written_off', 'transferred']),
  assetTag: z.string().optional(),
  locationId: z.string().uuid('Invalid location'),
  departmentId: z.string().uuid('Invalid department').optional().or(z.literal('')),
  assignedToEmployeeId: z.string().uuid('Invalid employee').optional().or(z.literal('')),
  custodianUserId: z.string().uuid('Invalid custodian').optional().or(z.literal('')),
  serialNumber: z.string().optional(),
  barcode: z.string().optional(),

  // Group B - Accounting-sensitive fields
  salvageValue: z.number().min(0, 'Salvage value must be >= 0'),
  usefulLifeMonths: z.union([z.number().min(1, 'Useful life must be >= 1 month'), z.literal('')]).optional(),
  deprecationMethod: z.enum(['SL', 'DB', 'SYD', 'UOP', 'NONE']).optional(),
  categoryId: z.string().uuid('Invalid category'),
  shippingCost: z.number().min(0).default(0),
  installationCost: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  otherCosts: z.number().min(0).default(0),

  // Group C - Immutable fields (disabled in UI)
  code: z.string().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().optional(),
  assetTypeId: z.string().optional(),
  cascadeToChildren: z.boolean().default(false),
});

type EditAssetFormData = z.infer<typeof editAssetSchema>;
type EditAssetFormInput = z.input<typeof editAssetSchema>;
type EditAssetFormOutput = z.output<typeof editAssetSchema>;

/** Typed interface for accessing known asset fields from API responses (snake_case and camelCase variants). */
interface AssetDataSource {
  [key: string]: unknown;
  name?: string; asset_name?: string;
  description?: string;
  status?: EditAssetFormData['status']; display_status?: EditAssetFormData['status'];
  asset_tag?: string; assetTag?: string;
  location_id?: string; locationId?: string;
  department_id?: string; departmentId?: string;
  assigned_to_employee_id?: string; assignedToEmployeeId?: string; employee_id?: string;
  custodian_user_id?: string; custodianUserId?: string; custodian_id?: string;
  serial_number?: string; serialNumber?: string;
  barcode?: string;
  salvage_value?: number;
  useful_life_months?: number | null;
  depreciation_method?: EditAssetFormData['deprecationMethod']; deprecationMethod?: EditAssetFormData['deprecationMethod'];
  category_id?: string; categoryId?: string; asset_category_id?: string;
  shipping_cost?: number;
  installation_cost?: number;
  tax_amount?: number;
  other_costs?: number;
  code?: string;
  acquisition_date?: string; acquisitionDate?: string;
  acquisition_cost?: number;
  asset_type_id?: string; assetTypeId?: string;
  is_parent?: boolean;
}

interface AssetEditFormProps {
  assetId: string;
  initialData: AssetDataSource;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssetEditForm({
  assetId,
  initialData,
  onSuccess,
  onCancel,
}: AssetEditFormProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<EditAssetFormInput | null>(null);

  // Get user and check if admin (allows editing immutable fields)
  const { user } = useAuthStore();
  const isAdminUser = user?.role?.code === 'admin';

  const form = useForm<EditAssetFormInput, unknown, EditAssetFormOutput>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || initialData?.display_status || 'active',
      assetTag: initialData?.asset_tag || '',
      locationId: initialData?.location_id || '',
      departmentId: initialData?.department_id || '',
      assignedToEmployeeId: initialData?.assigned_to_employee_id || '',
      custodianUserId: initialData?.custodian_user_id || '',
      serialNumber: initialData?.serial_number || '',
      barcode: initialData?.barcode || '',
      salvageValue: initialData?.salvage_value || 0,
      usefulLifeMonths: initialData?.useful_life_months || '',
      deprecationMethod: initialData?.depreciation_method || 'SL',
      categoryId: initialData?.category_id || '',
      shippingCost: initialData?.shipping_cost || 0,
      installationCost: initialData?.installation_cost || 0,
      taxAmount: initialData?.tax_amount || 0,
      otherCosts: initialData?.other_costs || 0,
      code: initialData?.code || '',
      acquisitionDate: initialData?.acquisition_date || '',
      acquisitionCost: initialData?.acquisition_cost || 0,
      assetTypeId: initialData?.asset_type_id || '',
      cascadeToChildren: false,
    } as EditAssetFormInput,
  });
  const typedControl = form.control as unknown as Control<EditAssetFormInput, unknown, EditAssetFormOutput>;


  const { editAsset, isLoading } = useAssetEdit();

  // Ensure form resets when initialData changes (support multiple key name variations)
  useEffect(() => {
    const mappedDefaults = {
      name: initialData?.name || initialData?.asset_name || '',
      description: initialData?.description || '',
      status: initialData?.status || initialData?.display_status || 'active',
      assetTag: initialData?.asset_tag || initialData?.assetTag || '',
      locationId: initialData?.location_id || initialData?.locationId || '',
      departmentId: initialData?.department_id || initialData?.departmentId || '',
      assignedToEmployeeId:
        initialData?.assigned_to_employee_id ||
        initialData?.assignedToEmployeeId ||
        initialData?.employee_id ||
        '',
      custodianUserId:
        initialData?.custodian_user_id ||
        initialData?.custodianUserId ||
        initialData?.custodian_id ||
        initialData?.assigned_to_employee_id ||
        '',
      serialNumber: initialData?.serial_number || initialData?.serialNumber || '',
      barcode: initialData?.barcode || '',
      salvageValue: initialData?.salvage_value ?? 0,
      usefulLifeMonths: initialData?.useful_life_months ?? '',
      deprecationMethod: initialData?.depreciation_method || initialData?.deprecationMethod || 'SL',
      categoryId: initialData?.category_id || initialData?.categoryId || '',
      shippingCost: initialData?.shipping_cost ?? 0,
      installationCost: initialData?.installation_cost ?? 0,
      taxAmount: initialData?.tax_amount ?? 0,
      otherCosts: initialData?.other_costs ?? 0,
      code: initialData?.code || '',
      acquisitionDate: initialData?.acquisition_date || initialData?.acquisitionDate || '',
      acquisitionCost: initialData?.acquisition_cost ?? 0,
      assetTypeId: initialData?.asset_type_id || initialData?.assetTypeId || '',
      cascadeToChildren: false,
    } as EditAssetFormInput;

    form.reset(mappedDefaults);
  }, [initialData, form]);

  // Detect changed fields (as keys array)
  const dirtyKeys = useMemo(() => Object.keys(form.formState.dirtyFields || {}), [form.formState.dirtyFields]);
  const canUpdateAsset = useUserPermission('asset.update');
  const shippingCost = form.watch('shippingCost');
  const installationCost = form.watch('installationCost');
  const taxAmount = form.watch('taxAmount');
  const otherCosts = form.watch('otherCosts');

  const acquisitionBaseCost = useMemo(() => {
    const total = Number(initialData?.acquisition_cost ?? 0);
    const shipping = Number(initialData?.shipping_cost ?? 0);
    const installation = Number(initialData?.installation_cost ?? 0);
    const tax = Number(initialData?.tax_amount ?? 0);
    const other = Number(initialData?.other_costs ?? 0);
    return Math.max(0, total - shipping - installation - tax - other);
  }, [initialData]);

  const acquisitionCostPreview = useMemo(() => {
    return acquisitionBaseCost + Number(shippingCost ?? 0) + Number(installationCost ?? 0) + Number(taxAmount ?? 0) + Number(otherCosts ?? 0);
  }, [acquisitionBaseCost, installationCost, otherCosts, shippingCost, taxAmount]);

  useEffect(() => {
    form.setValue('acquisitionCost', acquisitionCostPreview, { shouldDirty: false, shouldValidate: true });
  }, [acquisitionCostPreview, form]);

  // Classify changed fields into groups
  const fieldGroups = useMemo(() => {
    const groupA = ['name', 'description', 'status', 'assetTag', 'locationId', 'departmentId', 'assignedToEmployeeId', 'custodianUserId', 'serialNumber', 'barcode'];
    const groupB = ['salvageValue', 'usefulLifeMonths', 'deprecationMethod', 'categoryId', 'shippingCost', 'installationCost', 'taxAmount', 'otherCosts'];
    const groupC = ['code', 'acquisitionDate', 'acquisitionCost', 'assetTypeId'];

    return {
      A: dirtyKeys.filter((k) => groupA.includes(k)),
      B: dirtyKeys.filter((k) => groupB.includes(k)),
      C: dirtyKeys.filter((k) => groupC.includes(k)),
    };
  }, [dirtyKeys]);

  const isActive = initialData?.status === 'active' || initialData?.status === 'in_use';
  const isParent = Boolean(initialData?.is_parent);

  const onSubmit = async (data: EditAssetFormInput) => {
    // Check if Group C fields are changed and asset is active
    if (isActive && fieldGroups.C.length > 0) {
      alert(
        `Cannot edit immutable fields for active assets: ${fieldGroups.C.join(', ')}`
      );
      return;
    }

    // If Group B fields changed, show confirmation modal
    if (fieldGroups.B.length > 0) {
      setPendingSubmission(data);
      setShowConfirmModal(true);
      return;
    }

    // Otherwise, submit directly
    await submitEdit(data);
  };

  const submitEdit = async (data: EditAssetFormInput) => {
    try {
      const payload: Record<string, unknown> = {
        code: data.code || initialData?.code || '',
        name: data.name || initialData?.name || '',
        description: data.description ?? initialData?.description ?? '',
        asset_type_id: data.assetTypeId || initialData?.asset_type_id || '',
        asset_category_id: data.categoryId || initialData?.category_id || '',
        location_id: data.locationId || initialData?.location_id || '',
        acquisition_date: data.acquisitionDate || initialData?.acquisition_date || '',
        acquisition_cost: Number(initialData?.acquisition_cost ?? 0),
        salvage_value: Number(data.salvageValue ?? initialData?.salvage_value ?? 0),
        status: data.status || initialData?.status || initialData?.display_status || 'active',
        depreciation_method:
          data.deprecationMethod || initialData?.depreciation_method || 'SL',
        department_id: data.departmentId || initialData?.department_id || undefined,
        assigned_to_employee_id:
          data.assignedToEmployeeId || initialData?.assigned_to_employee_id || undefined,
        custodian_user_id: data.custodianUserId || initialData?.custodian_user_id || undefined,
        serial_number: data.serialNumber || initialData?.serial_number || undefined,
        barcode: data.barcode || initialData?.barcode || undefined,
        asset_tag: data.assetTag || initialData?.asset_tag || undefined,
        shipping_cost: Number(data.shippingCost ?? initialData?.shipping_cost ?? 0),
        installation_cost: Number(data.installationCost ?? initialData?.installation_cost ?? 0),
        tax_amount: Number(data.taxAmount ?? initialData?.tax_amount ?? 0),
        other_costs: Number(data.otherCosts ?? initialData?.other_costs ?? 0),
        cascade_to_children: Boolean(data.cascadeToChildren),
      };

      // Keep existing useful life unless the user changes it.
      payload.useful_life_months =
        data.usefulLifeMonths === '' || data.usefulLifeMonths === undefined
          ? initialData?.useful_life_months
          : Number(data.usefulLifeMonths);

      const resp = await editAsset(assetId, payload);
      // If server returned updated asset, reset form to reflect persisted values
      if (resp && resp.data) {
        const d = resp.data as AssetDataSource;
        const serverDefaults = {
          name: d.name || '',
          description: d.description || '',
          status: d.status || d.display_status || 'active',
          assetTag: d.asset_tag || '',
          locationId: d.location_id || '',
          departmentId: d.department_id || '',
          assignedToEmployeeId: d.assigned_to_employee_id || '',
          custodianUserId: d.custodian_user_id || '',
          serialNumber: d.serial_number || '',
          barcode: d.barcode || '',
          salvageValue: d.salvage_value ?? 0,
          usefulLifeMonths: d.useful_life_months ?? '',
          deprecationMethod: d.depreciation_method || 'SL',
          categoryId: d.asset_category_id || d.category_id || '',
          shippingCost: d.shipping_cost ?? 0,
          installationCost: d.installation_cost ?? 0,
          taxAmount: d.tax_amount ?? 0,
          otherCosts: d.other_costs ?? 0,
          code: d.code || '',
          acquisitionDate: d.acquisition_date || '',
          acquisitionCost: d.acquisition_cost ?? 0,
          assetTypeId: d.asset_type_id || '',
          cascadeToChildren: false,
        } as EditAssetFormInput;
        form.reset(serverDefaults);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to edit asset:', error);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors: Record<string, unknown>) => {
            // surface validation issues in console so users/devs see why submit didn't run
            console.debug('AssetEditForm validation errors:', errors);
          })}
          className="space-y-6"
        >
          {isParent && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-900 ml-2">
                This asset has child assets. Status changes can optionally cascade to children; accounting changes remain local to the parent.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
              <TabsTrigger value="extended">Extended</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* TAB 1: Basic Information (Group A & C) */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Identification</CardTitle>
                  <CardDescription>
                    Basic asset information. Immutable fields are marked with a lock icon.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="in_use">In Use</SelectItem>
                                <SelectItem value="idle">Idle</SelectItem>
                                <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                                <SelectItem value="disposed">Disposed</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="written_off">Written Off</SelectItem>
                                <SelectItem value="transferred">Transferred</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="cascadeToChildren"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Cascade status to children</FormLabel>
                            <FormDescription>
                              Apply the status/lifecycle change to direct child assets.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Group C - Immutable Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-red-500" />
                            Asset Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isAdminUser && isActive}
                              className={!isAdminUser && isActive ? "bg-gray-100" : ""}
                              title={!isAdminUser && isActive ? "Immutable: Asset code cannot be changed after creation" : ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {!isAdminUser && isActive && 'Immutable for active assets (admin can override)'}
                            {isAdminUser && isActive && 'Admin: You can edit immutable fields'}
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="acquisitionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-red-500" />
                            Acquisition Date
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              disabled={!isAdminUser && isActive}
                              className={!isAdminUser && isActive ? "bg-gray-100" : ""}
                              title={!isAdminUser && isActive ? "Immutable: Acquisition date cannot be changed" : ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {!isAdminUser && isActive && 'Immutable for active assets (admin can override)'}
                            {isAdminUser && isActive && 'Admin: You can edit immutable fields'}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Group A - Non-accounting Fields */}
                  <FormField
                    control={typedControl}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Office Desk" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Asset description..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="assetTag"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Tag</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., TAG-001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Serial number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Organization & Custody */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization & Custody</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* TODO: Load from API */}
                                <SelectItem value="loc-1">Warehouse A</SelectItem>
                                <SelectItem value="loc-2">Office B</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* TODO: Load from API */}
                                <SelectItem value="dept-1">IT</SelectItem>
                                <SelectItem value="dept-2">Finance</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="assignedToEmployeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Employee</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="emp-1">John Doe</SelectItem>
                                <SelectItem value="emp-2">Jane Smith</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="custodianUserId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custodian</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select custodian" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* TODO: Load from API */}
                                <SelectItem value="user-1">John Doe</SelectItem>
                                <SelectItem value="user-2">Jane Smith</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Depreciation (Group B) */}
            <TabsContent value="depreciation" className="space-y-6">
              {fieldGroups.B.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 ml-2">
                    Changes to depreciation settings will trigger a recalculation of the
                    depreciation schedule and require confirmation.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Depreciation Configuration</CardTitle>
                  <CardDescription>
                    These settings affect the depreciation schedule calculation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={fieldGroups.B.includes('categoryId') ? 'flex items-center gap-2 text-orange-600' : ''}>
                            {fieldGroups.B.includes('categoryId') && (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            Asset Category *
                          </FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className={fieldGroups.B.includes('categoryId') ? 'border-orange-300 bg-orange-50' : ''}>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* TODO: Load from API */}
                                <SelectItem value="cat-1">Computer Equipment</SelectItem>
                                <SelectItem value="cat-2">Office Furniture</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="acquisitionCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-red-500" />
                            Acquisition Cost
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              disabled={!isAdminUser && isActive}
                              className={!isAdminUser && isActive ? "bg-gray-100" : ""}
                              title={!isAdminUser && isActive ? "Immutable: Use Revaluation feature to change acquisition cost" : ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {!isAdminUser && isActive && 'Use Revaluation feature to modify'}
                            {isAdminUser && isActive && 'Admin: You can edit immutable fields'}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="usefulLifeMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={fieldGroups.B.includes('usefulLifeMonths') ? 'flex items-center gap-2 text-orange-600' : ''}>
                            {fieldGroups.B.includes('usefulLifeMonths') && (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            Useful Life (Months)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              placeholder="e.g., 60"
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(event.target.value === '' ? '' : Number(event.target.value))}
                              className={fieldGroups.B.includes('usefulLifeMonths') ? 'border-orange-300 bg-orange-50' : ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Duration in months for depreciation calculation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="deprecationMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={fieldGroups.B.includes('deprecationMethod') ? 'flex items-center gap-2 text-orange-600' : ''}>
                            {fieldGroups.B.includes('deprecationMethod') && (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            Depreciation Method
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className={fieldGroups.B.includes('deprecationMethod') ? 'border-orange-300 bg-orange-50' : ''}>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SL">Straight-Line (SL)</SelectItem>
                                <SelectItem value="DB">Declining Balance (DB)</SelectItem>
                                <SelectItem value="SYD">Sum-of-Years-Digits (SYD)</SelectItem>
                                <SelectItem value="UOP">Units of Production (UOP)</SelectItem>
                                <SelectItem value="NONE">No Depreciation</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={typedControl}
                    name="salvageValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldGroups.B.includes('salvageValue') ? 'flex items-center gap-2 text-orange-600' : ''}>
                          {fieldGroups.B.includes('salvageValue') && (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                          Salvage Value
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))}
                            className={fieldGroups.B.includes('salvageValue') ? 'border-orange-300 bg-orange-50' : ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Expected value at end of useful life
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Cost</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="installationCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Cost</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="taxAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Amount</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="otherCosts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Costs</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Extended Info */}
            <TabsContent value="extended" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={typedControl}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Barcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Summary */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dirtyKeys.length === 0 ? (
                    <p className="text-gray-500">No changes detected</p>
                  ) : (
                    <div className="space-y-2">
                      {fieldGroups.A.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-600 mb-2">
                            ✓ Group A (Non-accounting) - {fieldGroups.A.length} field(s)
                          </h4>
                          <ul className="list-disc list-inside text-sm text-green-700">
                            {fieldGroups.A.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {fieldGroups.B.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-orange-600 mb-2">
                            ⚠ Group B (Accounting-sensitive) - {fieldGroups.B.length} field(s)
                          </h4>
                          <ul className="list-disc list-inside text-sm text-orange-700">
                            {fieldGroups.B.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-orange-600 mt-2">
                            These changes require depreciation recalculation
                          </p>
                        </div>
                      )}
                      {fieldGroups.C.length > 0 && isActive && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800 ml-2">
                            Cannot edit immutable fields: {fieldGroups.C.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || dirtyKeys.length === 0 || !canUpdateAsset}
            >
              {isLoading ? 'Saving...' : canUpdateAsset ? 'Save Changes' : 'No permission to edit'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Confirmation Modal for Group B Changes */}
      <AssetEditConfirmModal
        isOpen={showConfirmModal}
        asset={initialData}
        changes={(pendingSubmission || {}) as EditAssetFormInput}
        changedFields={fieldGroups.B}
        isLoading={isLoading}
        onConfirm={async () => {
          if (pendingSubmission) {
            await submitEdit(pendingSubmission);
            setShowConfirmModal(false);
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingSubmission(null);
        }}
      />
    </>
  );
}
