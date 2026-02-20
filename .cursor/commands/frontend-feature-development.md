---
description: Frontend Feature Development - Feature-Based Architecture
globs: apps/web/src/features/**/*
alwaysApply: false
---

# Frontend Feature Development Workflow

## Purpose

Add new frontend features following GIMS feature-based architecture pattern.

## When to Use

- Creating new UI features that consume existing backend APIs
- Adding CRUD interfaces for backend entities
- Building feature-specific components and pages

## Prerequisites

- Backend API endpoints are ready
- API documentation available (Postman or swagger)
- UI/UX requirements defined
- Understanding of which domain this belongs to

## Time Estimate

- Simple list + form: 60-90 mins
- Complex with relationships: 90-120 mins
- With advanced features (calendar, charts): 120-180 mins

---

## Phase 1: Setup & Requirements (5 mins)

### 1.1 Review Requirements

- [ ] Read sprint planning document
- [ ] Check API endpoints in Postman/docs
- [ ] Understand data structure from backend
- [ ] Identify required fields and validations
- [ ] Check if foreign keys need dropdown data
- [ ] Determine feature name (kebab-case)

### 1.2 Feature Naming

- **Folder name**: kebab-case (e.g., `purchase-order`, `leave-request`)
- **Hook name**: camelCase (e.g., `usePurchaseOrders`)
- **Component names**: PascalCase (e.g., `PurchaseOrderList`)
- **Service name**: camelCase (e.g., `purchaseOrderService`)

---

## Phase 2: Create Folder Structure (2 mins)

**Location**: `apps/web/src/features/<feature-name>/`

Create folders:

```
apps/web/src/features/<feature-name>/
├── types/
│   └── index.d.ts
├── schemas/
│   └── <feature>.schema.ts
├── services/
│   └── <feature>-service.ts
├── hooks/
│   └── use-<feature>.ts
├── components/
│   ├── <feature>-list.tsx
│   ├── <feature>-form.tsx
│   ├── <feature>-detail-modal.tsx
│   └── index.ts
└── i18n/
    ├── en.ts
    └── id.ts
```

---

## Phase 3: Types Layer (10 mins)

**File**: `apps/web/src/features/<feature-name>/types/index.d.ts`

### 3.1 Main Entity Interface

```typescript
export interface <Entity> {
  id: string;
  // Add all fields from API response
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  amount?: number;
  related_id?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  // Relations
  related?: RelatedEntity;
}
```

### 3.2 Request Interfaces

```typescript
export interface Create<Entity>Request {
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  amount?: number;
  related_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface Update<Entity>Request {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  amount?: number;
  related_id?: string;
  start_date?: string;
  end_date?: string;
}
```

### 3.3 Query Interface

```typescript
export interface <Entity>ListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  // Add other filters
}
```

### 3.4 API Response Types

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface <Entity>FormDataResponse {
  statuses: Array<{ value: string; label: string }>;
  related_list: Array<{ id: string; name: string }>;
  // Add other dropdown options
}
```

### 3.5 Validation Rules

- ✅ **NEVER use `any`** - use `unknown` with type guards
- ✅ Use `?` for optional fields
- ✅ Use specific types (avoid `string` when enum possible)
- ✅ Match backend API types exactly

---

## Phase 4: Zod Schema Layer (10 mins)

**File**: `apps/web/src/features/<feature-name>/schemas/<feature>.schema.ts`

### 4.1 Create Schema

```typescript
import { z } from 'zod';

export const create<Entity>Schema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING'], {
    required_error: 'Status is required',
  }),

  amount: z.number()
    .min(0, 'Amount must be positive')
    .optional(),

  related_id: z.string()
    .uuid('Please select a valid related item')
    .optional(),

  start_date: z.string()
    .datetime('Invalid date format')
    .optional(),

  end_date: z.string()
    .datetime('Invalid date format')
    .optional(),
});

export const update<Entity>Schema = create<Entity>Schema.partial();

// Export types
export type Create<Entity>Input = z.infer<typeof create<Entity>Schema>;
export type Update<Entity>Input = z.infer<typeof update<Entity>Schema>;
```

### 4.2 Schema Guidelines

- ✅ Match validation with backend constraints
- ✅ Add helpful error messages
- ✅ Use `.optional()` for non-required fields
- ✅ Use `.uuid()` for ID fields
- ✅ Use `.datetime()` for date fields
- ✅ Use `.min()`, `.max()` for lengths
- ✅ Use `.number()` with `.min(0)` for amounts

---

## Phase 5: Service Layer (10 mins)

**File**: `apps/web/src/features/<feature-name>/services/<feature>-service.ts`

### 5.1 Service Implementation

```typescript
import { apiClient } from '@/lib/api-client';
import {
  <Entity>,
  Create<Entity>Request,
  Update<Entity>Request,
  <Entity>ListQuery,
  <Entity>FormDataResponse,
  ApiResponse
} from '../types';

export const <feature>Service = {
  // List with pagination
  getAll: async (query: <Entity>ListQuery): Promise<ApiResponse<<Entity>[]>> => {
    const response = await apiClient.get('/api/v1/<entities>', {
      params: query
    });
    return response.data;
  },

  // Get single
  getById: async (id: string): Promise<ApiResponse<<Entity>>> => {
    const response = await apiClient.get(`/api/v1/<entities>/${id}`);
    return response.data;
  },

  // Create
  create: async (data: Create<Entity>Request): Promise<ApiResponse<<Entity>>> => {
    const response = await apiClient.post('/api/v1/<entities>', data);
    return response.data;
  },

  // Update
  update: async (id: string, data: Update<Entity>Request): Promise<ApiResponse<<Entity>>> => {
    const response = await apiClient.put(`/api/v1/<entities>/${id}`, data);
    return response.data;
  },

  // Delete
  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/api/v1/<entities>/${id}`);
    return response.data;
  },

  // Get form data (dropdowns)
  getFormData: async (): Promise<ApiResponse<<Entity>FormDataResponse>> => {
    const response = await apiClient.get('/api/v1/<entities>/form-data');
    return response.data;
  },
};
```

### 5.2 Service Guidelines

- ✅ Always use apiClient from '@/lib/api-client'
- ✅ Type all parameters and return types
- ✅ Extract data from response (response.data)
- ✅ Use async/await
- ✅ Match API endpoint paths exactly

---

## Phase 6: Hooks Layer (20 mins)

**File**: `apps/web/src/features/<feature-name>/hooks/use-<feature>.ts`

### 6.1 Import Dependencies

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { <feature>Service } from '../services/<feature>-service';
import { <Entity>ListQuery, Create<Entity>Request, Update<Entity>Request } from '../types';
```

### 6.2 List Query Hook

```typescript
export function use<Entities>(query: <Entity>ListQuery = {}) {
  return useQuery({
    queryKey: ['<entities>', query],
    queryFn: async () => {
      const response = await <feature>Service.getAll(query);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 6.3 Single Item Hook

```typescript
export function use<Entity>(id: string | null) {
  return useQuery({
    queryKey: ["<entity>", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await (<feature>Service.getById(id));
      return response.data;
    },
    enabled: !!id,
  });
}
```

### 6.4 Create Mutation Hook

```typescript
export function useCreate<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Create<Entity>Request) => {
      const response = await <feature>Service.create(data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch list
      queryClient.invalidateQueries({ queryKey: ['<entities>'] });
    },
  });
}
```

### 6.5 Update Mutation Hook

```typescript
export function useUpdate<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Update<Entity>Request }) => {
      const response = await <feature>Service.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both list and single item
      queryClient.invalidateQueries({ queryKey: ['<entities>'] });
      queryClient.invalidateQueries({ queryKey: ['<entity>', variables.id] });
    },
  });
}
```

### 6.6 Delete Mutation Hook

```typescript
export function useDelete<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await (<feature>Service.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["<entities>"] });
    },
  });
}
```

### 6.7 Form Data Hook (for dropdowns)

```typescript
export function use<Entity>FormData() {
  return useQuery({
    queryKey: ['<entity>-form-data'],
    queryFn: async () => {
      const response = await <feature>Service.getFormData();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (dropdowns don't change often)
  });
}
```

### 6.8 Hook Guidelines

- ✅ Business logic goes HERE, not in components
- ✅ Use proper query keys for caching
- ✅ Invalidate queries after mutations
- ✅ Use `enabled` option to conditionally fetch
- ✅ Set appropriate `staleTime`
- ✅ Handle loading states in components
- ✅ Handle error states in components

---

## Phase 7: Components Layer (30 mins)

### 7.1 List Component

**File**: `apps/web/src/features/<feature-name>/components/<feature>-list.tsx`

```typescript
'use client';

import { useState } from 'react';
import { use<Entities> } from '../hooks/use-<feature>';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';

export function <Entity>List() {
  const t = useTranslations('<feature>');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = use<Entities>({
    page,
    per_page: 20,
    search: search || undefined,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">{error.message}</p>
        <Button onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const entities = data?.data ?? [];
  const meta = data?.meta?.pagination;

  // Empty state
  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <EmptyStateIcon className="h-24 w-24 text-gray-300 mb-4" />
        <p className="text-gray-500">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <Input
          placeholder={t('list.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setIsCreateOpen(true)}>
          {t('list.create')}
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fields.name')}</TableHead>
            <TableHead>{t('fields.status')}</TableHead>
            <TableHead>{t('fields.createdAt')}</TableHead>
            <TableHead className="text-right">{t('actions.title')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={entity.id}>
              <TableCell className="font-medium">{entity.name}</TableCell>
              <TableCell><StatusBadge status={entity.status} /></TableCell>
              <TableCell>{formatDate(entity.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewId(entity.id)}
                    className="cursor-pointer"
                  >
                    {t('actions.view')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditId(entity.id)}
                    className="cursor-pointer"
                  >
                    {t('actions.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entity.id)}
                    className="cursor-pointer text-red-600"
                  >
                    {t('actions.delete')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="cursor-pointer"
          >
            {t('pagination.previous')}
          </Button>
          <span className="py-2">
            {t('pagination.page', { page, total: meta.total_pages })}
          </span>
          <Button
            variant="outline"
            disabled={page >= meta.total_pages}
            onClick={() => setPage(p => p + 1)}
            className="cursor-pointer"
          >
            {t('pagination.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
```

**List Component Rules**:

- ✅ Use hook (use<Entities>) - NO direct API calls
- ✅ Handle 3 states: loading, error, empty
- ✅ Use Skeleton for loading
- ✅ Show error message with retry button
- ✅ Show empty state illustration
- ✅ Add cursor-pointer to all clickable elements
- ✅ Use i18n for all text
- ✅ Pagination controls

### 7.2 Form Component

**File**: `apps/web/src/features/<feature-name>/components/<feature>-form.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
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
import { create<Entity>Schema, Create<Entity>Input } from '../schemas/<feature>.schema';
import { useCreate<Entity>, useUpdate<Entity>, use<Entity>, use<Entity>FormData } from '../hooks/use-<feature>';

interface <Entity>FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId?: string | null; // If provided, edit mode
}

export function <Entity>Form({ open, onOpenChange, entityId }: <Entity>FormProps) {
  const t = useTranslations('<feature>');
  const isEditMode = !!entityId;

  const { data: existingEntity } = use<Entity>(entityId ?? null);
  const { data: formData } = use<Entity>FormData();
  const createMutation = useCreate<Entity>();
  const updateMutation = useUpdate<Entity>();

  const form = useForm<Create<Entity>Input>({
    resolver: zodResolver(create<Entity>Schema),
    defaultValues: {
      name: '',
      description: '',
      status: 'ACTIVE',
      amount: 0,
    },
  });

  // Pre-populate form in edit mode
  useEffect(() => {
    if (isEditMode && existingEntity) {
      form.reset({
        name: existingEntity.name,
        description: existingEntity.description ?? '',
        status: existingEntity.status,
        amount: existingEntity.amount ?? 0,
        related_id: existingEntity.related_id,
        start_date: existingEntity.start_date,
        end_date: existingEntity.end_date,
      });
    } else if (!isEditMode) {
      form.reset({
        name: '',
        description: '',
        status: 'ACTIVE',
        amount: 0,
      });
    }
  }, [existingEntity, isEditMode, form]);

  const onSubmit = async (data: Create<Entity>Input) => {
    try {
      if (isEditMode && entityId) {
        await updateMutation.mutateAsync({ id: entityId, data });
      } else {
        await createMutation.mutateAsync(data);
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('form.edit') : t('form.create')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('fields.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t('fields.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formData?.statuses?.map((status) => (
                        <SelectItem
                          key={status.value}
                          value={status.value}
                          className="cursor-pointer"
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="related_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.related')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t('fields.selectRelated')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formData?.related_list?.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          className="cursor-pointer"
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                className="cursor-pointer"
              >
                {t('form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                {form.formState.isSubmitting ? (
                  <>{t('form.saving')}...</>
                ) : (
                  t('form.save')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Form Component Rules**:

- ✅ Use react-hook-form with zodResolver
- ✅ Import schema from ../schemas/
- ✅ Pre-populate for edit mode
- ✅ Load form data (dropdowns) from API
- ✅ Validation with inline error messages
- ✅ shadcn/ui Form components
- ✅ Loading state on submit button
- ✅ Close modal on success
- ✅ Reset form on cancel

### 7.3 Detail Modal Component

**File**: `apps/web/src/features/<feature-name>/components/<feature>-detail-modal.tsx`

```typescript
'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { use<Entity> } from '../hooks/use-<feature>';

interface <Entity>DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function <Entity>DetailModal({
  open,
  onOpenChange,
  entityId,
  onEdit,
  onDelete,
}: <Entity>DetailModalProps) {
  const t = useTranslations('<feature>');
  const { data: entity, isLoading } = use<Entity>(entityId);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{entity.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('fields.status')}</p>
              <StatusBadge status={entity.status} />
            </div>

            <div>
              <p className="text-sm text-gray-500">{t('fields.amount')}</p>
              <p className="font-medium">{formatCurrency(entity.amount)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">{t('fields.createdAt')}</p>
              <p className="font-medium">{formatDate(entity.created_at)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">{t('fields.updatedAt')}</p>
              <p className="font-medium">{formatDate(entity.updated_at)}</p>
            </div>
          </div>

          {entity.description && (
            <div>
              <p className="text-sm text-gray-500">{t('fields.description')}</p>
              <p className="font-medium">{entity.description}</p>
            </div>
          )}

          {entity.related && (
            <div>
              <p className="text-sm text-gray-500">{t('fields.related')}</p>
              <p className="font-medium">{entity.related.name}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t('actions.close')}
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            className="cursor-pointer"
          >
            {t('actions.edit')}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="cursor-pointer"
          >
            {t('actions.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 7.4 Index Export

**File**: `apps/web/src/features/<feature-name>/components/index.ts`

```typescript
export { <Entity>List } from './<feature>-list';
export { <Entity>Form } from './<feature>-form';
export { <Entity>DetailModal } from './<feature>-detail-modal';
```

---

## Phase 8: i18n Layer (10 mins)

### 8.1 English Translations

**File**: `apps/web/src/features/<feature-name>/i18n/en.ts`

```typescript
export const <feature>I18n = {
  title: '<Entity> Management',

  list: {
    title: '<Entities>',
    empty: 'No <entities> found',
    search: 'Search <entities>...',
    create: 'Create <Entity>',
  },

  form: {
    create: 'Create <Entity>',
    edit: 'Edit <Entity>',
    save: 'Save',
    saving: 'Saving',
    cancel: 'Cancel',
    success: {
      create: '<Entity> created successfully',
      update: '<Entity> updated successfully',
      delete: '<Entity> deleted successfully',
    },
    error: {
      load: 'Failed to load <entities>',
      create: 'Failed to create <entity>',
      update: 'Failed to update <entity>',
      delete: 'Failed to delete <entity>',
    },
  },

  fields: {
    name: 'Name',
    namePlaceholder: 'Enter name...',
    description: 'Description',
    status: 'Status',
    selectStatus: 'Select status...',
    amount: 'Amount',
    related: 'Related Item',
    selectRelated: 'Select related item...',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
  },

  actions: {
    title: 'Actions',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
  },

  pagination: {
    previous: 'Previous',
    next: 'Next',
    page: 'Page {page} of {total}',
  },

  retry: 'Retry',
};
```

### 8.2 Indonesian Translations

**File**: `apps/web/src/features/<feature-name>/i18n/id.ts`

```typescript
export const <feature>I18n = {
  title: 'Manajemen <Entity>',

  list: {
    title: 'Daftar <Entity>',
    empty: 'Tidak ada data <entity>',
    search: 'Cari <entity>...',
    create: 'Tambah <Entity>',
  },

  form: {
    create: 'Tambah <Entity>',
    edit: 'Edit <Entity>',
    save: 'Simpan',
    saving: 'Menyimpan',
    cancel: 'Batal',
    success: {
      create: '<Entity> berhasil dibuat',
      update: '<Entity> berhasil diupdate',
      delete: '<Entity> berhasil dihapus',
    },
    error: {
      load: 'Gagal memuat data',
      create: 'Gagal membuat <entity>',
      update: 'Gagal mengupdate <entity>',
      delete: 'Gagal menghapus <entity>',
    },
  },

  fields: {
    name: 'Nama',
    namePlaceholder: 'Masukkan nama...',
    description: 'Deskripsi',
    status: 'Status',
    selectStatus: 'Pilih status...',
    amount: 'Jumlah',
    related: 'Item Terkait',
    selectRelated: 'Pilih item terkait...',
    createdAt: 'Dibuat Pada',
    updatedAt: 'Diupdate Pada',
  },

  actions: {
    title: 'Aksi',
    view: 'Lihat',
    edit: 'Edit',
    delete: 'Hapus',
    close: 'Tutup',
  },

  pagination: {
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    page: 'Halaman {page} dari {total}',
  },

  retry: 'Coba Lagi',
};
```

### 8.3 Register i18n

**File**: `apps/web/src/i18n/request.ts`

Add imports:

```typescript
import { <feature>I18n as <feature>En } from '@/features/<feature-name>/i18n/en';
import { <feature>I18n as <feature>Id } from '@/features/<feature-name>/i18n/id';
```

Add to messages object:

```typescript
const messages = {
  en: {
    ...(<feature>En),
    // ... other features
  },
  id: {
    ...(<feature>Id),
    // ... other features
  },
};
```

---

## Phase 9: Page & Route (15 mins)

### 9.1 Create Page

**File**: `apps/web/src/app/[locale]/(dashboard)/<feature-name>/page.tsx`

```typescript
import { PageMotion } from '@/components/page-motion';
import { PageHeader } from '@/components/page-header';
import { <Entity>List } from '@/features/<feature-name>/components';
import { useTranslations } from 'next-intl';

export default function <Entity>Page() {
  const t = useTranslations('<feature>');

  return (
    <PageMotion>
      <PageHeader
        title={t('title')}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: t('list.title'), href: '/<feature-name>' },
        ]}
      />

      <div className="rounded-lg border bg-white p-6">
        <<Entity>List />
      </div>
    </PageMotion>
  );
}
```

### 9.2 Create Loading State

**File**: `apps/web/src/app/[locale]/(dashboard)/<feature-name>/loading.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-10 w-64 mx-auto" />
      </div>
    </div>
  );
}
```

### 9.3 Register Route

**File**: `apps/web/src/lib/route-validator.ts`

Add to validRoutes array:

```typescript
const validRoutes = [
  // ... existing routes
  "/<feature-name>",
];
```

---

## Phase 10: Documentation (10 mins)

### 10.1 Create Frontend Feature Documentation

**Location**: `docs/features/<domain>_<feature>_frontend.md`

Create documentation following this structure:

````markdown
# <Feature Name> Frontend Documentation

## Overview

Brief description of the frontend feature.

## User Interface

### Pages & Routes

| Route               | Component     | Description    |
| ------------------- | ------------- | -------------- |
| /<feature>          | <Feature>Page | Main list page |
| /<feature>/new      | <Feature>Form | Create form    |
| /<feature>/:id/edit | <Feature>Form | Edit form      |

### Components

#### <Feature>List

**Purpose**: Display paginated list with search/filter
**Props**: None (uses hooks)
**Features**:

- Pagination (20 items per page)
- Search by name
- Filter by status
- Sortable columns

#### <Feature>Form

**Purpose**: Create/edit form with validation
**Props**:

- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `entityId?`: string
  **Validation**: Zod schema
  **Features**:
- Real-time validation
- Form data loading (dropdowns)
- Error messages

### State Management

- **Server State**: TanStack Query
  - Query keys: ['entities'], ['entity', id]
  - Stale time: 5 minutes
- **Client State**: (if applicable)
  - Modal state
  - Filter state

### API Integration

| Hook              | API Endpoint                | Purpose     |
| ----------------- | --------------------------- | ----------- |
| use<Entities>     | GET /api/v1/entities        | List data   |
| use<Entity>       | GET /api/v1/entities/:id    | Single item |
| useCreate<Entity> | POST /api/v1/entities       | Create      |
| useUpdate<Entity> | PUT /api/v1/entities/:id    | Update      |
| useDelete<Entity> | DELETE /api/v1/entities/:id | Delete      |

### Form Validation

**Schema**: `<feature>.schema.ts`
**Rules**:

- name: required, min 3, max 100
- description: optional, max 500
- status: required, enum

### Internationalization (i18n)

**Keys**:

- `<feature>.title`: Page title
- `<feature>.list.title`: List title
- `<feature>.form.create`: Create button
- ...

### Testing

**Component Tests**:

```bash
npx pnpm test <feature>-list.test.tsx
npx pnpm test <feature>-form.test.tsx
```
````

**Test Coverage**:

- Loading states
- Error states
- Empty states
- User interactions
- Form validation

### Performance Considerations

- Pagination prevents large data loads
- Query caching reduces API calls
- Memoization for expensive calculations
- Lazy loading for modal components

### Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly

## Change Log

| Date       | Version | Changes                | Author  |
| ---------- | ------- | ---------------------- | ------- |
| 2024-01-15 | 1.0     | Initial implementation | @author |

```

### 10.2 Update Documentation References
- [ ] Add link to main feature doc if exists
- [ ] Update component library docs if new components added
- [ ] Document any custom hooks in shared hooks documentation
- [ ] Update i18n documentation if new patterns used

### 10.3 Add Code Comments
- [ ] JSDoc comments on exported functions
- [ ] Inline comments for complex logic
- [ ] WHY comments (not WHAT)
- [ ] TODO/FIXME comments if applicable

## Phase 11: Validation & Testing (10 mins)

### 11.1 Validation Checklist
Before finishing, verify:

**Types & Schema**:
- [ ] Types defined in types/index.d.ts
- [ ] No `any` types used
- [ ] Zod schema created with proper validation
- [ ] Schema types exported

**Service & Hooks**:
- [ ] Service layer created with apiClient
- [ ] Hooks created with TanStack Query
- [ ] Proper query keys used
- [ ] Mutations invalidate queries correctly

**Components**:
- [ ] Components have NO business logic (only UI)
- [ ] Loading states handled with Skeleton
- [ ] Error states handled with proper messages
- [ ] Empty states handled with illustration
- [ ] cursor-pointer added to all clickable elements
- [ ] PageMotion wrapper used

**i18n**:
- [ ] English translations created
- [ ] Indonesian translations created
- [ ] i18n registered in request.ts
- [ ] All user-facing strings translated

**Routing**:
- [ ] Page created with proper layout
- [ ] loading.tsx created
- [ ] Route registered in route-validator.ts

**Documentation**:
- [ ] Frontend feature documentation created
- [ ] Component documentation complete
- [ ] API integration documented
- [ ] Testing steps documented

### 11.2 Testing Checklist
- [ ] List loads correctly
- [ ] Pagination works
- [ ] Search/filter works
- [ ] Create form opens and validates
- [ ] Create saves successfully
- [ ] List updates after create
- [ ] Edit form pre-populates correctly
- [ ] Edit saves successfully
- [ ] Delete with confirmation works
- [ ] Delete removes from list
- [ ] Detail modal shows correct data
- [ ] Loading states visible
- [ ] Error states handled properly
- [ ] Empty state shown when no data
- [ ] Documentation reviewed and accurate

---

## Critical Rules

### ✅ MUST DO:

- Business logic in hooks, NOT components
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Handle loading/error/empty states
- Add cursor-pointer to clickable elements
- Use PageMotion for page transitions
- NEVER use `any` type
- NEVER use arbitrary Tailwind values
- Use kebab-case for directories
- Use PascalCase for components
- Use camelCase for functions

### ❌ NEVER DO:

- Business logic in components
- Direct API calls in components
- Using 'any' type
- Missing loading states
- No cursor-pointer on buttons
- Arbitrary Tailwind values like `w-[100px]`
- Direct state mutation
- Hardcoded strings (use i18n)

---

## Example Features for Reference

See existing implementations:

- **EmployeeContract**: `features/hrd/employee-contract/`
- **AttendanceRecords**: `features/hrd/attendance-records/`
- **Recruitment**: `features/hrd/recruitment/`
- **WorkSchedules**: `features/hrd/work-schedules/`

---

## Time Breakdown

| Phase            | Time         |
| ---------------- | ------------ |
| Setup            | 5 mins       |
| Folder Structure | 2 mins       |
| Types            | 10 mins      |
| Schema           | 10 mins      |
| Service          | 10 mins      |
| Hooks            | 20 mins      |
| Components       | 30 mins      |
| i18n             | 10 mins      |
| Page + Route     | 15 mins      |
| Validation       | 10 mins      |
| **Total**        | **~2 hours** |

---

## Next Steps

1. Create the feature folder structure
2. Follow phases 1-10 systematically
3. Check off each validation item
4. Test all CRUD operations
5. Verify i18n works in both languages
6. Create documentation

Ready? Start with Phase 1!
```
