'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, User, DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/utilities/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormSubmitShortcut,
  FormShortcutHint,
} from '@/components/ui/forms/form';
import { Input } from '@/components/ui/forms/input';
import { DatePicker } from '@/components/ui/forms/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays/dialog';
import { Dropdown, DropdownItem } from '@/components/ui/overlays/dropdown';

import { CreateBaseSalaryRequest, UpdateBaseSalaryRequest } from '../types';
import { useBaseSalaryStore } from '../stores';

// Form validation schema
const baseSalarySchema = z.object({
  employee_id: z.number().min(1, 'Employee is required'),
  basic_salary: z.number().min(1, 'Basic salary is required'),
  effective_date: z
    .string()
    .min(1, 'Effective date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

type BaseSalaryFormValues = z.infer<typeof baseSalarySchema>;

interface BaseSalaryFormProps {
  mode: 'create' | 'edit';
  open: boolean;
  onClose?: () => void; // Keep for backward compatibility but not used
}

export const BaseSalaryForm = React.memo<BaseSalaryFormProps>(
  ({ mode, open }) => {
    const {
      currentBaseSalary,
      addData,
      loading,
      searchLoading,
      error,
      createBaseSalary,
      updateBaseSalary,
      selectedBaseSalaryId,
      clearError,
      closeModalsOnly,
      getCurrentActiveSalary,
      fetchAddData,
    } = useBaseSalaryStore();

    const form = useForm<BaseSalaryFormValues>({
      resolver: zodResolver(baseSalarySchema),
      defaultValues: {
        employee_id: 0,
        basic_salary: 0,
        effective_date: format(new Date(), 'yyyy-MM-dd'), // Auto-apply today's date
        notes: '',
      },
    });

    // Update form when currentBaseSalary changes (for edit mode) or when selectedBaseSalaryId is set (for create mode with pre-filled employee)
    React.useEffect(() => {
      if (mode === 'edit' && currentBaseSalary) {
        form.reset({
          employee_id: currentBaseSalary.employee.id,
          basic_salary: currentBaseSalary.basic_salary,
          effective_date: currentBaseSalary.effective_date.split('T')[0], // Convert to YYYY-MM-DD
          notes: currentBaseSalary.notes || '',
        });
      } else if (mode === 'create') {
        // Check if we have a pre-filled employee_id from table action
        const preFilledEmployeeId = selectedBaseSalaryId || 0;
        form.reset({
          employee_id: preFilledEmployeeId,
          basic_salary: 0,
          effective_date: format(new Date(), 'yyyy-MM-dd'), // Auto-apply today's date
          notes: '',
        });
      }
    }, [currentBaseSalary, mode, form, selectedBaseSalaryId]);

    // Ensure employee_id is set correctly after addData loads in edit mode
    // This fixes the issue where the form value gets cleared after addData loads
    React.useEffect(() => {
      if (mode === 'edit' && currentBaseSalary && (addData?.employees?.length ?? 0) > 0) {
        const expectedEmployeeId = currentBaseSalary.employee.id;
        const currentEmployeeId = form.getValues('employee_id');
        
        // Always ensure the employee_id is set to the expected value
        // This prevents the value from being cleared when addData loads
        if (currentEmployeeId !== expectedEmployeeId) {
          form.setValue('employee_id', expectedEmployeeId, { 
            shouldValidate: false,
            shouldDirty: false 
          });
        }
      }
    }, [mode, currentBaseSalary, addData?.employees, form]);

    // Clear error when form opens and fetch fresh employee data
    // Only fetch addData for create mode, not needed for edit mode
    React.useEffect(() => {
      if (open) {
        clearError();
        // Only fetch employee data for create mode
        // For edit mode, employee is already in currentBaseSalary
        if (mode === 'create') {
          fetchAddData();
        }
      }
    }, [open, clearError, fetchAddData, mode]);

    // Show loading only when addData is being fetched for the first time (create mode)
    // For edit mode, we don't need addData, so only show loading if currentBaseSalary is not loaded
    const isFormLoading = mode === 'edit' 
      ? (loading && !currentBaseSalary)
      : (loading && !addData);

    // Show employee loading when refreshing employee data (only for create mode)
    const isEmployeeLoading = mode === 'create' && searchLoading && !addData?.employees;

    // Watch form values for dropdown items
    const employeeId = form.watch('employee_id');

    // Helper function to get current active salary for display
    const getCurrentActiveSalaryForEmployee = React.useCallback(
      (employeeId: number) => {
        return getCurrentActiveSalary(employeeId);
      },
      [getCurrentActiveSalary]
    );

    // Prepare employee dropdown items with current active salary info
    // For edit mode, always include the current employee even if not in addData
    const employeeItems: DropdownItem[] = React.useMemo(() => {
      const items: DropdownItem[] = [];
      const employeeMap = new Map<number, { id: number; name: string; username: string }>();

      // Add employees from addData
      if (addData?.employees) {
        addData.employees.forEach((employee: { id: number; name: string; username: string }) => {
          employeeMap.set(employee.id, employee);
        });
      }

      // For edit mode, ensure current employee is included even if not in addData
      if (mode === 'edit' && currentBaseSalary?.employee) {
        const currentEmployee = currentBaseSalary.employee;
        if (!employeeMap.has(currentEmployee.id)) {
          employeeMap.set(currentEmployee.id, {
            id: currentEmployee.id,
            name: currentEmployee.name,
            username: currentEmployee.username,
          });
        }
      }

      // Convert map to array and create dropdown items
      try {
        employeeMap.forEach((employee) => {
          const currentActiveSalary = getCurrentActiveSalaryForEmployee(employee.id);
          const currentSalaryText = currentActiveSalary
            ? ` - Current: ${new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(currentActiveSalary.basic_salary)}`
            : '';

          items.push({
            id: employee.id.toString(),
            label: `${employee.name} (@${employee.username})${currentSalaryText}`,
            checked: employeeId === employee.id,
          });
        });
      } catch (error) {
        console.error('Error preparing employee items:', error);
        return [];
      }

      return items;
    }, [addData?.employees, employeeId, getCurrentActiveSalaryForEmployee, mode, currentBaseSalary]);

    const onSubmit = async (values: BaseSalaryFormValues) => {
      try {
        let success = false;

        if (mode === 'create') {
          const createData: CreateBaseSalaryRequest = {
            employee_id: values.employee_id,
            basic_salary: values.basic_salary,
            effective_date: values.effective_date,
            notes: values.notes?.trim(),
          };
          success = await createBaseSalary(createData);
        } else if (mode === 'edit' && selectedBaseSalaryId) {
          const updateData: UpdateBaseSalaryRequest = {
            employee_id: values.employee_id,
            basic_salary: values.basic_salary,
            effective_date: values.effective_date,
            notes: values.notes?.trim(),
          };
          success = await updateBaseSalary(selectedBaseSalaryId, updateData);
        }

        if (success) {
          form.reset();
          closeModalsOnly();
        }
      } catch (error) {
        // Error is handled by the store
        console.error('Form submission error:', error);
      }
    };

    // Tambahkan keyboard shortcut untuk submit (Ctrl+Enter atau Cmd+Enter)
    useFormSubmitShortcut(form, onSubmit, open);

    const handleClose = () => {
      form.reset();
      clearError();
      closeModalsOnly();
      // Reset selectedBaseSalaryId when closing create modal to clear pre-filled employee
      if (mode === 'create') {
        useBaseSalaryStore.getState().closeAllModals();
      }
    };

    // Handle employee selection from Dropdown
    const handleEmployeeSelect = (employeeId: string, checked: boolean) => {
      if (checked) {
        form.setValue('employee_id', parseInt(employeeId));
      }
    };

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className='sm:max-w-[650px] max-h-[90vh] overflow-y-auto'
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add New Base Salary' : 'Edit Base Salary'}
            </DialogTitle>
            <DialogDescription className='opacity-50'>
              {mode === 'create'
                ? 'Add a new base salary for an employee.'
                : 'Update the base salary information.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Show loading state only when addData is not available */}
              {isFormLoading && (
                <div className='flex items-center justify-center py-8'>
                  <div className='flex items-center space-x-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span className='text-sm text-muted-foreground'>
                      Loading form data...
                    </span>
                  </div>
                </div>
              )}

              {/* Form fields - only show when data is loaded */}
              {!isFormLoading && (
                <>
                  {/* Basic Information Section */}
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-2 pb-2 border-b border-border/50'>
                      <User className='h-4 w-4 text-primary' />
                      <h3 className='text-sm font-medium text-foreground'>
                        Employee Information
                      </h3>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {/* Employee Selection */}
                      <FormField
                        control={form.control}
                        name='employee_id'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee *</FormLabel>
                            <Dropdown
                              key={`employee-${mode}-${addData?.employees?.length || 0}`}
                              items={employeeItems}
                              onItemChange={handleEmployeeSelect}
                              placeholder={(() => {
                                if (isEmployeeLoading && mode === 'create')
                                  return 'Loading employees...';
                                if (!employeeItems.length && mode === 'create')
                                  return 'No employees available';
                                
                                // For edit mode, show current employee info
                                if (mode === 'edit' && currentBaseSalary?.employee) {
                                  return `${currentBaseSalary.employee.name} (@${currentBaseSalary.employee.username})`;
                                }
                                
                                // For create mode, find employee from addData or employeeItems
                                const value = field.value ?? 0;
                                if (value > 0) {
                                  // Try to find from employeeItems first
                                  const employeeItem = employeeItems.find(item => item.id === value.toString());
                                  if (employeeItem) {
                                    return employeeItem.label.split(' - Current:')[0]; // Remove salary info from placeholder
                                  }
                                  
                                  // Fallback to addData
                                  if (addData?.employees) {
                                    const employee = addData.employees.find(
                                      (e: {
                                        id: number;
                                        name: string;
                                        username: string;
                                      }) => e.id === value
                                    ) as
                                      | {
                                          id: number;
                                          name: string;
                                          username: string;
                                        }
                                      | undefined;
                                    if (employee) {
                                      return `${employee.name} (@${employee.username})`;
                                    }
                                  }
                                }
                                return 'Select employee';
                              })()}
                              maxHeight={300}
                              variant='outline'
                              showBadge={false}
                              className='w-full'
                              disabled={isFormLoading || isEmployeeLoading || mode === 'edit'}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Salary Information Section */}
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-2 pb-2 border-b border-border/50'>
                      <DollarSign className='h-4 w-4 text-primary' />
                      <h3 className='text-sm font-medium text-foreground'>
                        Salary Information
                      </h3>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {/* Basic Salary */}
                      <FormField
                        control={form.control}
                        name='basic_salary'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Basic Salary *</FormLabel>
                            <FormControl>
                              <Input
                                type='number'
                                placeholder='5000000'
                                {...field}
                                onChange={e =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                disabled={isFormLoading}
                                className='placeholder:opacity-50'
                              />
                            </FormControl>
                            <FormDescription className='opacity-50'>
                              Enter the basic salary amount
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Effective Date */}
                      <FormField
                        control={form.control}
                        name='effective_date'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Effective Date *</FormLabel>
                            <FormControl>
                              <DatePicker
                                date={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={date =>
                                  field.onChange(
                                    date ? format(date, 'yyyy-MM-dd') : ''
                                  )
                                }
                                placeholder='Select effective date'
                                disabled={isFormLoading}
                                className='w-full'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-2 pb-2 border-b border-border/50'>
                      <FileText className='h-4 w-4 text-primary' />
                      <h3 className='text-sm font-medium text-foreground'>
                        Additional Information
                      </h3>
                    </div>

                    {/* Notes - Full Width */}
                    <FormField
                      control={form.control}
                      name='notes'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Enter any additional notes...'
                              {...field}
                              disabled={isFormLoading}
                              className='placeholder:opacity-50'
                            />
                          </FormControl>
                          <FormDescription className='opacity-50'>
                            Optional notes about this base salary (max 500
                            characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Display API errors */}
                  {error && (
                    <div className='rounded-md bg-destructive/15 p-3 border border-destructive/20'>
                      <p className='text-sm text-destructive'>{error}</p>
                    </div>
                  )}

                  <DialogFooter>
                    <div className='flex items-center justify-between w-full'>
                      <FormShortcutHint variant='compact' className='hidden sm:flex' />
                      <div className='flex justify-end space-x-2'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={handleClose}
                          disabled={isFormLoading || isEmployeeLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type='submit'
                          disabled={
                            isFormLoading ||
                            isEmployeeLoading ||
                            !addData?.employees?.length
                      }
                    >
                      {(isFormLoading || isEmployeeLoading) && (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      )}
                      {(() => {
                        if (isEmployeeLoading) return 'Loading employees...';
                        if (isFormLoading) return 'Processing...';
                        return mode === 'create'
                          ? 'Add Base Salary'
                          : 'Update Base Salary';
                      })()}
                    </Button>
                      </div>
                    </div>
                  </DialogFooter>
                </>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }
);

BaseSalaryForm.displayName = 'BaseSalaryForm';

// Create Base Salary Modal
export const CreateBaseSalaryModal = React.memo(() => {
  const { isCreateModalOpen, closeAllModals } = useBaseSalaryStore();

  return (
    <BaseSalaryForm
      mode='create'
      open={isCreateModalOpen}
      onClose={closeAllModals}
    />
  );
});

CreateBaseSalaryModal.displayName = 'CreateBaseSalaryModal';

// Edit Base Salary Modal
export const EditBaseSalaryModal = React.memo(() => {
  const { isEditModalOpen, closeModalsOnly } = useBaseSalaryStore();

  return (
    <BaseSalaryForm
      mode='edit'
      open={isEditModalOpen}
      onClose={closeModalsOnly}
    />
  );
});

EditBaseSalaryModal.displayName = 'EditBaseSalaryModal';
