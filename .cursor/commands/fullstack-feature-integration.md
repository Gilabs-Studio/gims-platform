---
description: Fullstack Feature Integration - Complete Backend + Frontend Implementation
globs: apps/**/*
alwaysApply: false
---

# Fullstack Feature Integration Workflow

## Purpose

Implement a complete feature end-to-end (backend API + frontend UI) following GIMS architecture patterns.

## When to Use

- Adding new entities that need both backend API and frontend UI
- Features that require CRUD operations with user interface
- Complex features with relationships and business logic

## Prerequisites

- Feature requirements from docs/erp-sprint-planning.md
- Understanding of domain (hrd, sales, product, finance, etc.)
- Database schema design from docs/erp-database-relations.mmd
- API endpoint design

## Time Estimate

- Simple CRUD: 2-3 hours
- Complex with relationships: 4-6 hours
- With approval workflows: 6-8 hours

---

## Phase 1: Planning & Setup (10 mins)

### 1.1 Review Requirements

- [ ] Read sprint planning document
- [ ] Identify affected domains
- [ ] List all fields and data types
- [ ] Identify foreign key relationships
- [ ] Determine if approval workflow needed
- [ ] Check dependencies on other features

### 1.2 Create Task Breakdown

```
Backend:
  ☐ Model layer (15 mins)
  ☐ Repository layer (20 mins)
  ☐ DTO layer (15 mins)
  ☐ Mapper layer (10 mins)
  ☐ Usecase layer (25 mins)
  ☐ Handler + Router (20 mins)
  ☐ Registration + Testing (15 mins)

Frontend:
  ☐ Types + Schemas (15 mins)
  ☐ Service layer (15 mins)
  ☐ Hooks (20 mins)
  ☐ Components (40 mins)
  ☐ i18n (10 mins)
  ☐ Page + Route (15 mins)
  ☐ Integration testing (15 mins)
```

### 1.3 Naming Convention

- **Entity name**: PascalCase (e.g., PurchaseOrder, EmployeeContract)
- **API endpoint**: kebab-case plural (e.g., /purchase-orders, /employee-contracts)
- **Feature folder**: kebab-case (e.g., purchase-order, employee-contract)
- **Domain folder**: lowercase (e.g., purchase, hrd, sales)

---

## Phase 2: Backend Implementation (90 mins)

### 2.1 Model Layer (15 mins)

**File**: `apps/api/internal/<domain>/data/models/<entity>.go`

Required fields:

```go
type Entity struct {
    ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    // Business fields here
    CreatedAt time.Time      `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
    UpdatedAt time.Time      `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
    DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"` // Soft delete
    CreatedBy uuid.UUID      `gorm:"column:created_by;type:uuid"`
    UpdatedBy *uuid.UUID     `gorm:"column:updated_by;type:uuid"` // Nullable pointer
}

func (Entity) TableName() string {
    return "entities"
}
```

**CRITICAL**: Register in migrate.go immediately after creation!

### 2.2 Repository Layer (20 mins)

**Files**:

- `apps/api/internal/<domain>/data/repositories/<entity>_repository.go` (interface)
- `apps/api/internal/<domain>/data/repositories/<entity>_repository_impl.go` (implementation)

Interface methods:

```go
type EntityRepository interface {
    FindAll(ctx context.Context, query dto.ListQuery) ([]models.Entity, int64, error)
    FindByID(ctx context.Context, id uuid.UUID) (*models.Entity, error)
    Create(ctx context.Context, entity *models.Entity) error
    Update(ctx context.Context, entity *models.Entity) error
    Delete(ctx context.Context, id uuid.UUID) error
}
```

Implementation checklist:

- [ ] Use GORM Preload() for relationships
- [ ] Add prefix search: `name LIKE ?`, search+"%" (NOT "%"+search+"%")
- [ ] Pagination: LIMIT per_page OFFSET (page-1)\*per_page
- [ ] Max per_page = 100
- [ ] Context timeout: 30s

### 2.3 DTO Layer (15 mins)

**File**: `apps/api/internal/<domain>/domain/dto/<entity>_dto.go`

Create:

1. `<Entity>CreateRequest` - with `binding:"required"` tags
2. `<Entity>UpdateRequest` - optional fields
3. `<Entity>Response` - for API response
4. `<Entity>ListQuery` - pagination + filters
5. `<Entity>FormDataResponse` - if foreign keys exist

Example:

```go
type EntityCreateRequest struct {
    Name        string    `json:"name" binding:"required,min=3,max=100"`
    Description string    `json:"description" binding:"max=500"`
    Type        string    `json:"type" binding:"required,oneof=TYPE_A TYPE_B"`
    Amount      float64   `json:"amount" binding:"required,min=0"`
    RelatedID   uuid.UUID `json:"related_id" binding:"required"`
    StartDate   time.Time `json:"start_date" binding:"required"`
}

type EntityFormDataResponse struct {
    Types       []EnumOption       `json:"types"`
    RelatedList []RelatedOption    `json:"related_list"`
}
```

### 2.4 Mapper Layer (10 mins)

**File**: `apps/api/internal/<domain>/domain/mapper/<entity>_mapper.go`

Functions:

```go
func ToModel(req dto.EntityCreateRequest) models.Entity
func ToResponse(model models.Entity) dto.EntityResponse
func ToResponseList(models []models.Entity) []dto.EntityResponse
```

### 2.5 Usecase Layer (25 mins)

**Files**:

- `apps/api/internal/<domain>/domain/usecase/<entity>_usecase.go` (interface)
- `apps/api/internal/<domain>/domain/usecase/<entity>_usecase_impl.go` (implementation)

Interface:

```go
type EntityUsecase interface {
    GetAll(ctx context.Context, query dto.EntityListQuery) ([]dto.EntityResponse, int64, error)
    GetByID(ctx context.Context, id uuid.UUID) (*dto.EntityResponse, error)
    Create(ctx context.Context, req dto.EntityCreateRequest, userID uuid.UUID) (*dto.EntityResponse, error)
    Update(ctx context.Context, id uuid.UUID, req dto.EntityUpdateRequest, userID uuid.UUID) (*dto.EntityResponse, error)
    Delete(ctx context.Context, id uuid.UUID) error
    GetFormData(ctx context.Context) (*dto.EntityFormDataResponse, error) // If foreign keys
}
```

Implementation requirements:

- [ ] Validate ownership (IDOR prevention)
- [ ] Set CreatedBy/UpdatedBy
- [ ] Business logic validation
- [ ] Use transactions if multiple DB operations
- [ ] Context timeout: 30s

### 2.6 Handler + Router (20 mins)

**Files**:

- `apps/api/internal/<domain>/presentation/handler/<entity>_handler.go`
- `apps/api/internal/<domain>/presentation/router/<entity>_router.go`

Handler methods:

```go
func (h *EntityHandler) GetAll(c *gin.Context)
func (h *EntityHandler) GetByID(c *gin.Context)
func (h *EntityHandler) Create(c *gin.Context)
func (h *EntityHandler) Update(c *gin.Context)
func (h *EntityHandler) Delete(c *gin.Context)
func (h *EntityHandler) GetFormData(c *gin.Context) // If needed
```

Router (CRITICAL - order matters!):

```go
entities := router.Group("/entities")
{
    entities.GET("/form-data", middleware.RequirePermission("entity.read"), handler.GetFormData) // FIRST!
    entities.GET("/", middleware.RequirePermission("entity.read"), handler.GetAll)
    entities.GET("/:id", middleware.RequirePermission("entity.read"), handler.GetByID)
    entities.POST("/", middleware.RequirePermission("entity.create"), handler.Create)
    entities.PUT("/:id", middleware.RequirePermission("entity.update"), handler.Update)
    entities.DELETE("/:id", middleware.RequirePermission("entity.delete"), handler.Delete)
}
```

### 2.7 Registration + Testing (15 mins)

1. **Register model** in migrate.go:

   ```go
   import <domain> "github.com/gilabs/gims/api/internal/<domain>/data/models"
   &<domain>.Entity{},
   ```

2. **Register router** in domain routers.go

3. **Run verification**:

   ```bash
   cd apps/api
   go mod tidy
   go build ./...
   ```

4. **Test endpoints**:

   ```bash
   # Start API
   npx pnpm dev --filter=api

   # Test with curl
   curl http://localhost:8080/api/v1/entities
   curl http://localhost:8080/api/v1/entities/form-data
   ```

---

## Phase 3: Frontend Implementation (90 mins)

### 3.1 Types + Schemas (15 mins)

**Files**:

- `apps/web/src/features/<feature>/types/index.d.ts`
- `apps/web/src/features/<feature>/schemas/<feature>.schema.ts`

Types:

```typescript
export interface Entity {
  id: string;
  name: string;
  description?: string;
  type: "TYPE_A" | "TYPE_B";
  amount: number;
  related_id: string;
  start_date: string;
  created_at: string;
  updated_at: string;
  related?: RelatedEntity;
}

export interface CreateEntityRequest {
  name: string;
  description?: string;
  type: "TYPE_A" | "TYPE_B";
  amount: number;
  related_id: string;
  start_date: string;
}
```

Zod Schema:

```typescript
import { z } from "zod";

export const createEntitySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["TYPE_A", "TYPE_B"]),
  amount: z.number().min(0),
  related_id: z.string().uuid(),
  start_date: z.string().datetime(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
```

### 3.2 Service Layer (15 mins)

**File**: `apps/web/src/features/<feature>/services/<feature>-service.ts`

```typescript
import { apiClient } from "@/lib/api-client";
import { Entity, CreateEntityRequest } from "../types";

export const EntityService = {
  getAll: (query: EntityListQuery) =>
    apiClient.get("/api/v1/entities", { params: query }),

  getById: (id: string) => apiClient.get(`/api/v1/entities/${id}`),

  create: (data: CreateEntityRequest) =>
    apiClient.post("/api/v1/entities", data),

  update: (id: string, data: UpdateEntityRequest) =>
    apiClient.put(`/api/v1/entities/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/v1/entities/${id}`),

  getFormData: () => apiClient.get("/api/v1/entities/form-data"),
};
```

### 3.3 Hooks (20 mins)

**File**: `apps/web/src/features/<feature>/hooks/use-<feature>.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EntityService } from "../services/entity-service";

export function useEntities(query: EntityListQuery) {
  return useQuery({
    queryKey: ["entities", query],
    queryFn: () => EntityService.getAll(query),
  });
}

export function useEntity(id: string) {
  return useQuery({
    queryKey: ["entity", id],
    queryFn: () => EntityService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: EntityService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityRequest }) =>
      EntityService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", variables.id] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: EntityService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useEntityFormData() {
  return useQuery({
    queryKey: ["entity-form-data"],
    queryFn: () => EntityService.getFormData(),
  });
}
```

### 3.4 Components (40 mins)

#### 3.4.1 List Component

**File**: `apps/web/src/features/<feature>/components/<feature>-list.tsx`

Requirements:

- [ ] Use shadcn/ui Table
- [ ] Use useEntities hook
- [ ] Handle loading with Skeleton
- [ ] Handle error with retry button
- [ ] Handle empty state with illustration
- [ ] Add search input
- [ ] Add pagination controls
- [ ] Add "Create" button
- [ ] Add Edit/Delete actions per row
- [ ] Use cursor-pointer on clickable elements
- [ ] NO business logic - only UI rendering

#### 3.4.2 Form Component

**File**: `apps/web/src/features/<feature>/components/<feature>-form.tsx`

Requirements:

- [ ] Use shadcn/ui Dialog
- [ ] Use react-hook-form with zodResolver
- [ ] Pre-populate for edit mode
- [ ] Load form data (dropdowns) with useEntityFormData
- [ ] Add validation with inline errors
- [ ] Use shadcn/ui Form, Input, Select, DatePicker
- [ ] Handle submit with useCreateEntity or useUpdateEntity
- [ ] Show loading state on submit button
- [ ] Close modal on success
- [ ] Reset form on cancel
- [ ] Use i18n for all labels

#### 3.4.3 Detail Modal

**File**: `apps/web/src/features/<feature>/components/<feature>-detail-modal.tsx`

Requirements:

- [ ] Display all fields read-only
- [ ] Format dates properly
- [ ] Format currencies properly
- [ ] Show related data
- [ ] Add Edit and Delete actions

#### 3.4.4 Index Export

**File**: `apps/web/src/features/<feature>/components/index.ts`

```typescript
export { EntityList } from "./entity-list";
export { EntityForm } from "./entity-form";
export { EntityDetailModal } from "./entity-detail-modal";
```

### 3.5 i18n (10 mins)

**Files**:

- `apps/web/src/features/<feature>/i18n/en.ts`
- `apps/web/src/features/<feature>/i18n/id.ts`

Content:

```typescript
export const entityI18n = {
  title: "Entity Management",
  list: {
    title: "Entities",
    empty: "No entities found",
    search: "Search entities...",
    create: "Create Entity",
  },
  form: {
    create: "Create Entity",
    edit: "Edit Entity",
    save: "Save",
    cancel: "Cancel",
    success: {
      create: "Entity created successfully",
      update: "Entity updated successfully",
      delete: "Entity deleted successfully",
    },
    error: {
      load: "Failed to load entities",
      create: "Failed to create entity",
      update: "Failed to update entity",
      delete: "Failed to delete entity",
    },
  },
  fields: {
    name: "Name",
    description: "Description",
    type: "Type",
    amount: "Amount",
    startDate: "Start Date",
  },
  validation: {
    required: "This field is required",
    min: "Minimum {min} characters",
    max: "Maximum {max} characters",
  },
};
```

Register in `apps/web/src/i18n/request.ts`:

```typescript
import { entityI18n as entityEn } from '@/features/<feature>/i18n/en';
import { entityI18n as entityId } from '@/features/<feature>/i18n/id';

messages: {
  ...entityEn,
  // ... other features
}
```

### 3.6 Page + Route (15 mins)

#### Page

**File**: `apps/web/src/app/[locale]/(dashboard)/<feature>/page.tsx`

```typescript
import { PageMotion } from '@/components/page-motion';
import { PageHeader } from '@/components/page-header';
import { EntityList } from '@/features/<feature>/components';

export default function EntityPage() {
  return (
    <PageMotion>
      <PageHeader
        title="Entity Management"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Entities', href: '/entities' },
        ]}
      />
      <EntityList />
    </PageMotion>
  );
}
```

#### Loading State

**File**: `apps/web/src/app/[locale]/(dashboard)/<feature>/loading.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

#### Route Registration

**File**: `apps/web/src/lib/route-validator.ts`

Add to validRoutes array:

```typescript
const validRoutes = [
  // ... existing routes
  "/entities",
];
```

---

## Phase 4: Integration Testing (20 mins)

### 4.1 Backend Testing

1. Start API: `npx pnpm dev --filter=api`
2. Test all endpoints with curl or Postman:

   ```bash
   # List
   curl http://localhost:8080/api/v1/entities?page=1&per_page=20

   # Create
   curl -X POST http://localhost:8080/api/v1/entities \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","type":"TYPE_A","amount":100}'

   # Get by ID
   curl http://localhost:8080/api/v1/entities/{id}

   # Update
   curl -X PUT http://localhost:8080/api/v1/entities/{id} \
     -H "Content-Type: application/json" \
     -d '{"name":"Updated"}'

   # Delete
   curl -X DELETE http://localhost:8080/api/v1/entities/{id}

   # Form data (if exists)
   curl http://localhost:8080/api/v1/entities/form-data
   ```

### 4.2 Frontend Testing

1. Start frontend: `npx pnpm dev --filter=web`
2. Navigate to the feature page
3. Test CRUD operations:
   - [ ] List loads correctly
   - [ ] Pagination works
   - [ ] Search works
   - [ ] Create form opens
   - [ ] Form validation works
   - [ ] Create saves successfully
   - [ ] List updates after create
   - [ ] Edit form pre-populates
   - [ ] Edit saves successfully
   - [ ] Delete with confirmation
   - [ ] Delete removes from list
   - [ ] Detail modal shows data
   - [ ] Loading states visible
   - [ ] Error states handled

### 4.3 Integration Testing

1. Create entity via frontend
2. Verify in database
3. Update via frontend
4. Verify changes in database
5. Delete via frontend
6. Verify soft delete in database

---

## Phase 5: Final Verification (10 mins)

### Backend Checklist

- [ ] Model registered in migrate.go
- [ ] All imports use full module path
- [ ] go mod tidy executed
- [ ] go build ./... passes
- [ ] All endpoints respond correctly
- [ ] GetFormData created if foreign keys (BEFORE /:id route)
- [ ] Pagination max 100 enforced
- [ ] Error codes match api-error-codes.md

### Frontend Checklist

- [ ] Types defined (no any)
- [ ] Zod schema created
- [ ] Service layer created
- [ ] Hooks created with TanStack Query
- [ ] Components have NO business logic
- [ ] Loading/error/empty states handled
- [ ] cursor-pointer on clickable elements
- [ ] i18n for both en and id
- [ ] i18n registered in request.ts
- [ ] Page created with PageMotion
- [ ] loading.tsx created
- [ ] Route registered in route-validator.ts
- [ ] All user-facing strings translated

### Documentation

- [ ] Update docs/features/{feature}.md
- [ ] Update docs/erp-sprint-planning.md progress
- [ ] Update Postman collection

---

## Common Mistakes to Avoid

### Backend

❌ Missing model in migrate.go
❌ Relative imports: `import "internal/..."`
❌ Business logic in handler
❌ GetFormData route AFTER /:id
❌ Non-hex UUIDs in seeders
❌ Taking address of constant

### Frontend

❌ Business logic in components
❌ Using 'any' type
❌ Missing loading states
❌ No cursor-pointer
❌ Arbitrary Tailwind values
❌ Missing i18n registration

---

## Example Implementation

See completed features for reference:

- **EmployeeContract**: apps/api/internal/hrd/ + apps/web/src/features/hrd/employee-contract/
- **AttendanceRecord**: apps/api/internal/hrd/ + apps/web/src/features/hrd/attendance-records/
- **EvaluationGroup**: apps/api/internal/hrd/ + apps/web/src/features/hrd/evaluation/

---

## Next Steps

1. Choose feature to implement
2. Follow this workflow systematically
3. Check off each item as completed
4. Test thoroughly before committing
5. Create documentation
6. Request code review

Ready to implement? Provide:

1. Feature name
2. Domain (hrd, sales, product, etc.)
3. List of fields with types
4. Foreign key relationships
5. Any special requirements
