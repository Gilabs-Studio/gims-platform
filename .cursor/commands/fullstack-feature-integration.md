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

---

## Phase 5: Documentation (20 mins)

### 5.1 Create Comprehensive Feature Documentation

**Location**: `docs/features/<domain>_<feature>.md`

Create documentation following industry standards:

```markdown
# <Feature Name> Feature Documentation

## 1. Executive Summary

**Version**: 1.0  
**Last Updated**: 2024-01-15  
**Domain**: <Domain> (HRD/Sales/Purchase/etc.)  
**Sprint**: <Sprint Number>  
**Status**: ✅ Complete

### Business Value

Brief description of the business value this feature provides to the organization.

### Overview

Comprehensive description of what this feature does and how it fits into the ERP system.

---

## 2. Functional Requirements

### 2.1 Features

- ✅ **Feature 1**: Description
- ✅ **Feature 2**: Description
- ✅ **Feature 3**: Description

### 2.2 User Stories

1. **As a** [role], **I want** [goal], **so that** [benefit]
2. **As a** [role], **I want** [goal], **so that** [benefit]

### 2.3 Business Rules

1. **Rule 1**: Description
   - Validation: <validation logic>
   - Error Message: "<error message>"
2. **Rule 2**: Description
   - Validation: <validation logic>
   - Error Message: "<error message>"

### 2.4 Workflow
```

[Start] → [Step 1] → [Step 2] → [Step 3] → [End]
↓ ↓ ↓
[Alt 1] [Alt 2] [Alt 3]

````

---

## 3. Technical Implementation

### 3.1 Architecture
- **Pattern**: Vertical Slice / Feature-Based
- **Backend**: Clean Architecture (Repository → Usecase → Handler)
- **Frontend**: Feature-Based (Types → Services → Hooks → Components)
- **State Management**: TanStack Query + Zustand

### 3.2 Database Schema

#### Table: `<table_name>`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| name | VARCHAR(100) | NOT NULL, INDEX | Entity name |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | Status |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Update time |
| deleted_at | TIMESTAMP | INDEX | Soft delete |
| created_by | UUID | FK | Created by user |
| updated_by | UUID | FK | Updated by user |

#### Indexes
- `idx_name` on `name` (for search)
- `idx_status` on `status` (for filtering)
- `idx_deleted_at` on `deleted_at` (for soft delete)

#### Relationships
- **Has Many**: RelatedEntity (1:N)
- **Belongs To**: ParentEntity (N:1)

### 3.3 API Specification

#### Base URL
`/api/v1/<entities>`

#### Endpoints

##### 1. List Entities
**GET** `/api/v1/<entities>`

**Query Parameters**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| page | int | No | 1 | Page number |
| per_page | int | No | 20 | Items per page (max 100) |
| search | string | No | - | Search by name |
| status | string | No | - | Filter by status |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123"
}
````

##### 2. Get Entity by ID

**GET** `/api/v1/<entities>/{id}`

**Response** (200 OK):

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_def456"
}
```

**Error Response** (404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity not found"
  }
}
```

##### 3. Create Entity

**POST** `/api/v1/<entities>`

**Request Body**:

```json
{
  "name": "Entity Name",
  "description": "Description",
  "status": "ACTIVE"
}
```

**Validation Rules**:

- `name`: required, min 3, max 100
- `description`: optional, max 500
- `status`: required, enum ['ACTIVE', 'INACTIVE']

##### 4. Update Entity

**PUT** `/api/v1/<entities>/{id}`

##### 5. Delete Entity

**DELETE** `/api/v1/<entities>/{id}`

**Note**: Soft delete, record remains in database with deleted_at timestamp

##### 6. Get Form Data

**GET** `/api/v1/<entities>/form-data`

**Purpose**: Get dropdown data for create/edit forms

**Response**:

```json
{
  "success": true,
  "data": {
    "statuses": [
      { "value": "ACTIVE", "label": "Active" },
      { "value": "INACTIVE", "label": "Inactive" }
    ],
    "related_entities": [{ "id": "uuid", "name": "Name" }]
  }
}
```

#### Error Codes

| Code             | HTTP Status | Description               |
| ---------------- | ----------- | ------------------------- |
| VALIDATION_ERROR | 400         | Request validation failed |
| ENTITY_NOT_FOUND | 404         | Entity does not exist     |
| UNAUTHORIZED     | 401         | Authentication required   |
| FORBIDDEN        | 403         | Insufficient permissions  |

### 3.4 Frontend Implementation

#### Folder Structure

```
features/<feature>/
├── types/
│   └── index.d.ts          # TypeScript interfaces
├── schemas/
│   └── <feature>.schema.ts # Zod validation schemas
├── services/
│   └── <feature>-service.ts # API service layer
├── hooks/
│   └── use-<feature>.ts    # React Query hooks
├── components/
│   ├── <feature>-list.tsx  # List view
│   ├── <feature>-form.tsx  # Create/Edit form
│   ├── <feature>-detail-modal.tsx # Detail view
│   └── index.ts            # Exports
└── i18n/
    ├── en.ts               # English translations
    └── id.ts               # Indonesian translations
```

#### State Management

- **Server State**: TanStack Query
  - Query keys: `['entities']`, `['entity', id]`
  - Stale time: 5 minutes
  - Cache invalidation on mutations
- **Client State**: Zustand (if needed)
  - UI state (modals, filters)

#### Routes

| Route                 | Component       | Permission       |
| --------------------- | --------------- | ---------------- |
| `/<feature>`          | `<Feature>List` | <feature>.read   |
| `/<feature>/new`      | `<Feature>Form` | <feature>.create |
| `/<feature>/:id/edit` | `<Feature>Form` | <feature>.update |

#### Component API

**<Feature>List**

- Props: None
- Features: Pagination, Search, Filter, Sort
- State: TanStack Query

**<Feature>Form**

- Props:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `entityId?: string`
- Validation: Zod schema
- Submit: React Hook Form

### 3.5 Security Considerations

- ✅ Input validation on all endpoints
- ✅ Authorization checks (permission-based)
- ✅ IDOR prevention (ownership validation)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ CSRF protection (double-submit cookie)

### 3.6 Performance Optimizations

- Database indexes on frequently queried columns
- GIN indexes for text search (using pg_trgm)
- Pagination (max 100 per page)
- Preload() for relationships (avoid N+1)
- Query caching with TanStack Query
- Optimistic updates

---

## 4. Testing

### 4.1 Test Strategy

- **Unit Tests**: Business logic, validation, mapping
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user workflows
- **Coverage Target**: 80%+ for usecase, 60%+ for handlers

### 4.2 Backend Tests

#### Unit Tests

```bash
# Run usecase tests
go test ./internal/<domain>/domain/usecase/... -v

# Run repository tests
go test ./internal/<domain>/data/repositories/... -v

# Run with coverage
go test -cover ./internal/<domain>/...
```

#### Test Cases

1. **Create Entity**
   - ✅ Valid data creates entity
   - ✅ Empty name returns validation error
   - ✅ Duplicate name returns conflict error

2. **Update Entity**
   - ✅ Valid update succeeds
   - ✅ Non-existent ID returns 404
   - ✅ Unauthorized user returns 403

3. **Delete Entity**
   - ✅ Soft deletes entity
   - ✅ Non-existent ID returns 404
   - ✅ Cascading effects (if applicable)

### 4.3 Frontend Tests

#### Unit Tests

```bash
# Run hook tests
npx pnpm test use-<feature>.test.ts

# Run component tests
npx pnpm test <feature>-list.test.tsx

# Run with coverage
npx pnpm test --coverage
```

#### Test Cases

1. **List Component**
   - ✅ Displays loading state
   - ✅ Displays empty state
   - ✅ Displays error state
   - ✅ Pagination works
   - ✅ Search filters results

2. **Form Component**
   - ✅ Validates required fields
   - ✅ Shows validation errors
   - ✅ Submits successfully
   - ✅ Handles API errors

### 4.4 E2E Tests

```bash
# Run E2E tests
npx playwright test <feature>.spec.ts
```

#### Test Scenarios

1. Complete CRUD workflow
2. Form validation
3. Error handling
4. Permission-based access

### 4.5 Manual Testing Checklist

- [ ] Create entity with valid data
- [ ] Create entity with invalid data (verify validation)
- [ ] Edit entity and verify changes
- [ ] Delete entity and verify soft delete
- [ ] Test pagination
- [ ] Test search functionality
- [ ] Test filter functionality
- [ ] Verify responsive design
- [ ] Check accessibility (keyboard navigation)
- [ ] Test in both languages (en/id)

---

## 5. Deployment

### 5.1 Database Migration

```sql
-- Migration script
CREATE TABLE IF NOT EXISTS <table_name> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    ...
);

CREATE INDEX idx_name ON <table_name>(name);
```

### 5.2 Environment Variables

| Variable       | Required | Default | Description                  |
| -------------- | -------- | ------- | ---------------------------- |
| `API_BASE_URL` | Yes      | -       | Backend API URL              |
| `DATABASE_URL` | Yes      | -       | PostgreSQL connection string |

### 5.3 Rollback Plan

1. Database: Keep backup before migration
2. API: Deploy behind feature flag
3. Frontend: Version rollback capability

---

## 6. Dependencies

### 6.1 Internal Dependencies

- **Required Modules**:
  - User Module (for created_by/updated_by)
  - Department Module (if applicable)
- **Dependent Modules**:
  - Report Module (uses this data)

### 6.2 External Dependencies

- PostgreSQL 15+
- Go 1.21+
- Node.js 20+

---

## 7. Monitoring & Logging

### 7.1 Key Metrics

- API response time (p95 < 200ms)
- Database query time (p95 < 50ms)
- Error rate (< 0.1%)
- Cache hit rate (> 80%)

### 7.2 Logging

```go
// Key log points
- Entity created: {id, user, timestamp}
- Entity updated: {id, changes, user, timestamp}
- Entity deleted: {id, user, timestamp}
- Validation errors: {field, value, error}
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Issue**: Entity not appearing in list  
**Cause**: Soft deleted or wrong status filter  
**Solution**: Check deleted_at column, verify status filter

**Issue**: Form validation fails  
**Cause**: Frontend and backend validation mismatch  
**Solution**: Ensure Zod schema matches DTO validation

### 8.2 Debug Commands

```bash
# Check database
docker exec -it postgres psql -U postgres -d gims_db -c "SELECT * FROM <table> WHERE id = '...'"

# Check API logs
docker logs gims-api | grep ERROR

# Test endpoint
curl -X GET http://localhost:8080/api/v1/<entities>
```

---

## 9. Related Documentation

### Internal Docs

- [API Standards](../api-standart/api-error-codes.md)
- [Database Relations](../erp-database-relations.mmd)
- [Sprint Planning](../erp-sprint-planning.md)
- [Security Guidelines](../TEMPLATE_SECURITY_PERFORMANCE_PLAN.md)
- [Testing Guide](../testing-guide.md)

### External References

- [Gin Framework](https://gin-gonic.com/)
- [GORM Documentation](https://gorm.io/)
- [Next.js Documentation](https://nextjs.org/)
- [TanStack Query](https://tanstack.com/query/latest)

---

## 10. Change Log

| Date       | Version | Author  | Changes                    |
| ---------- | ------- | ------- | -------------------------- |
| 2024-01-15 | 1.0     | @author | Initial implementation     |
| 2024-01-16 | 1.1     | @author | Added search functionality |

---

## 11. Approval

| Role          | Name | Signature | Date |
| ------------- | ---- | --------- | ---- |
| Tech Lead     |      |           |      |
| Product Owner |      |           |      |
| QA Lead       |      |           |      |

````

### 5.2 Update Supporting Documentation

#### A. Update Sprint Planning
**File**: `docs/erp-sprint-planning.md`
- Mark feature as complete
- Update progress percentage
- Add any notes or issues encountered
- Update remaining tasks estimate

#### B. Update API Documentation
**File**: `docs/postman/postman.json`
- Add all endpoints
- Include request examples
- Include response examples
- Add error examples
- Organize by feature

#### C. Update Database Relations
**File**: `docs/erp-database-relations.mmd`
- Add new entity to ERD
- Show relationships
- Update cardinality

#### D. Create Architecture Decision Record (ADR)
**File**: `docs/decisions/ADR-XXX-<feature>.md` (if significant decisions)
```markdown
# ADR-XXX: <Decision Title>

## Status
- Proposed / Accepted / Deprecated / Superseded

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing or have agreed to implement?

## Consequences
What becomes easier or more difficult to do?

## Alternatives Considered
- Alternative 1: Why not chosen
- Alternative 2: Why not chosen
````

### 5.3 Code Documentation

#### Backend Comments

```go
// EntityUsecase defines the business logic for entity management.
// It handles validation, authorization, and orchestrates data persistence.
type EntityUsecase interface {
    // Create validates and creates a new entity.
    // Returns validation error if name is empty or duplicate.
    Create(ctx context.Context, req CreateRequest, userID uuid.UUID) (*EntityResponse, error)
}
```

#### Frontend Comments

```typescript
/**
 * Hook for managing entity list data
 * Uses TanStack Query for caching and synchronization
 * @param query - Pagination and filter parameters
 * @returns Query result with entities, loading state, and error
 */
export function useEntities(query: EntityListQuery) {
  return useQuery({...});
}
```

---

## Phase 6: Final Verification (10 mins)

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

### Documentation Checklist

- [ ] Comprehensive feature documentation created
- [ ] API endpoints fully documented
- [ ] Database schema documented
- [ ] Business rules documented
- [ ] Testing scenarios documented
- [ ] Sprint planning updated
- [ ] Postman collection updated
- [ ] Database relations diagram updated
- [ ] Change log maintained
- [ ] Code comments added (JSDoc/GoDoc)

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
