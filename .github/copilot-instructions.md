# GIMS Platform - AI Coding Agent Instructions

## Project Overview
GIMS (GILABS Integrated Management System) is an **enterprise ERP monorepo** using Turborepo with:
- **Backend**: Go 1.25+ / Gin / GORM / PostgreSQL (`apps/api/`)
- **Frontend**: Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn/ui (`apps/web/`)

**Purpose**: Comprehensive business management system covering Master Data, Sales, Purchase, Stock, Finance, HRD, and Reporting.

## Architecture Patterns (CRITICAL)

### Backend: Vertical Slice per Domain
Each domain in `apps/api/internal/<domain>/` follows this structure:
```
<domain>/
├── data/
│   ├── models/          # GORM entities
│   ├── repositories/    # Data access (interface-based)
│   └── seeders/         # Database seeding
├── domain/
│   ├── dto/             # Request/Response DTOs with binding tags
│   ├── mapper/          # Model ↔ DTO conversion
│   └── usecase/         # Business logic (NEVER in handlers)
└── presentation/
    ├── handler/         # HTTP handlers (thin, delegates to usecase)
    ├── router/          # Entity routes (<entity>_routers.go)
    └── routers.go       # Domain router aggregator
```
**Example domains**: `auth`, `user`, `sales`, `product`, `geographic`, `organization`

### Frontend: Feature-Based Structure
Each feature in `apps/web/src/features/<feature>/` follows:
```
<feature>/
├── types/       # .d.ts declarations only
├── schemas/     # Zod schemas (<feature>.schema.ts)
├── stores/      # Zustand (use<Domain>Store.ts) - STATE ONLY, no logic
├── hooks/       # Business logic (use<Action>.ts) - ALL LOGIC HERE
├── services/    # API calls (<feature>Service.ts)
└── components/  # UI components - NO business logic
```

## Critical Conventions

### API Response Format (ALWAYS follow)
```json
{
  "success": true,
  "data": {},
  "meta": { "pagination": {...} },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123"
}
```
- **Pagination**: max `per_page` = 100 (enforced), default 20
- **Error codes**: Use patterns from `docs/api-standart/api-error-codes.md`
  - Validation: `VALIDATION_ERROR`, `REQUIRED`, `INVALID_FORMAT`
  - Auth: `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN`
  - Resource: `{RESOURCE}_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`
  - Business: `INSUFFICIENT_STOCK`, custom per domain
- **Timestamps**: ISO 8601 with WIB timezone (UTC+7)

### Timezone & `apptime` Rules (CRITICAL — NO EXCEPTIONS)

**NEVER use bare `time.Now()` in Go backend business logic.** Always use the `apptime` package.

```go
// ❌ WRONG — timezone depends on OS/container
now := time.Now()

// ✅ CORRECT — uses configured application timezone (global)
now := apptime.Now()

// ✅ CORRECT — per-company timezone
now := apptime.NowForCompany(companyID)
loc := apptime.LocationForCompany(companyID)

// ✅ CORRECT — per-employee timezone (resolves via employee → company)
now := apptime.NowForEmployee(employeeID)
loc := apptime.LocationForEmployee(employeeID)
```

**Import**: `"github.com/gilabs/gims/api/internal/core/apptime"`

**Per-Company Timezone Architecture**:
- Company model has `Timezone` field (IANA string, default `Asia/Jakarta`)
- `CompanyTimezoneProvider` interface in `core/apptime/resolver.go`, implementation in `organization/data/repositories/timezone_provider.go`
- In-memory cache with 5-min TTL for timezone lookups
- Holiday model has `CompanyID` (nullable UUID): NULL = global, non-NULL = company-specific

**When to use which function**:
| Function | Use Case |
|---|---|
| `apptime.Now()` | Non-HRD global logic, logging, generic timestamps |
| `apptime.NowForCompany(id)` | Company-specific business rules |
| `apptime.NowForEmployee(id)` | HRD: attendance, leave, overtime |
| `apptime.LocationForEmployee(id)` | When you need the `*time.Location` for date math |
| `apptime.TodayForEmployee(id)` | Date-only comparisons in HRD |

**Holiday Scoping**: Always use `IsHolidayForCompany()` / `FindByDateRangeForCompany()` with `(company_id IS NULL OR company_id = ?)`

**DB Column Rules**: HRD timestamp columns use `timestamptz` (not `timestamp`), DSN includes `TimeZone=UTC`

**Docs**: `docs/features/core/apptime-timezone-support.md`

### Frontend Component Rules (NON-NEGOTIABLE)
1. **NEVER** put business logic in components - extract to hooks
2. **ALWAYS** use optional chaining (`?.`) and nullish coalescing (`??`)
3. **ALWAYS** handle loading/error/empty states from TanStack Query
4. **ALWAYS** add `cursor-pointer` to clickable elements
5. Use `PageMotion` from `framer-motion` for page transitions

### Backend Security (Non-negotiable)
- **JWT**: Stored in HttpOnly cookies (not response body), issuer validation, split secrets (access/refresh)
- **JWT Rotation**: Support with `kid` (Key ID) + key ring for zero-downtime secret rotation
- **CSRF**: Double-Submit Cookie pattern required (validate `X-CSRF-Token` header)
- **Rate limiting**: Redis-backed on all public endpoints (fallback to in-memory)
- **Row-level locking**: Use `FOR UPDATE` for concurrent updates (prevent race conditions)
- **IDOR Prevention**: Always validate ownership before resource access
- **Request Size Limits**: 1MB for sensitive endpoints (enforced middleware)
- **HTTP Server Hardening**: Timeouts (ReadHeader, Read, Write, Idle), MaxHeaderBytes
- **Graceful Shutdown**: Handle SIGTERM/SIGINT, stop background workers cleanly
- **Reverse-Proxy**: Opt-in `PROXY_HEADERS_ENABLED` with `TRUSTED_PROXIES` for X-Forwarded-*
- **Security Headers**: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, HSTS

### Backend Performance (Critical)
- **Query Optimization**: 
  - GIN indexes with `pg_trgm` for text search
  - Prefix search (`text%`) not wildcard (`%text%`) for index usage
  - Use `Preload()` for relationships, avoid N+1 queries
  - Database-level filtering, sorting, aggregation
- **Connection Pooling**: MaxOpen=100, MaxIdle=25, ConnMaxLifetime=5min
- **Context Timeouts**: 30s for queries, cancellable contexts
- **Pagination**: Enforce max 100 per_page to prevent memory issues

## Go Import Rules (CRITICAL for monorepo)

**Module Path**: `github.com/gilabs/gims/api`

### Import Conventions (ALWAYS follow)

1. **ALWAYS use FULL module path for internal packages:**
   ```go
   // ✅ CORRECT - Full module path
   import "github.com/gilabs/gims/api/internal/hrd/data/models"
   import "github.com/gilabs/gims/api/internal/hrd/data/repositories"
   import "github.com/gilabs/gims/api/internal/core/infrastructure/database"
   
   // ❌ WRONG - Relative imports will fail
   import "internal/hrd/data/models"
   import "./models"
   import "../repositories"
   ```

2. **Standard Library → External → Internal order:**
   ```go
   import (
       // Standard library
       "context"
       "fmt"
       "time"
       
       // External packages
       "github.com/gin-gonic/gin"
       "gorm.io/gorm"
       
       // Internal packages (full path)
       "github.com/gilabs/gims/api/internal/hrd/data/models"
       "github.com/gilabs/gims/api/internal/hrd/domain/dto"
   )
   ```

3. **After generating new Go files:**
   - **ALWAYS run** `go mod tidy` in `apps/api/` directory
   - Verify imports with `go build ./...` before committing
   - VSCode will auto-fix imports on save if Go extension is configured

4. **Common import patterns per layer:**
   ```go
   // In repositories/*.go
   import "github.com/gilabs/gims/api/internal/<domain>/data/models"
   
   // In usecases/*.go
   import "github.com/gilabs/gims/api/internal/<domain>/data/repositories"
   import "github.com/gilabs/gims/api/internal/<domain>/domain/dto"
   
   // In handlers/*.go
   import "github.com/gilabs/gims/api/internal/<domain>/domain/usecase"
   import "github.com/gilabs/gims/api/internal/<domain>/domain/dto"
   
   // In routers.go (domain aggregator)
   import "github.com/gilabs/gims/api/internal/<domain>/data/repositories"
   import "github.com/gilabs/gims/api/internal/<domain>/domain/usecase"
   import "github.com/gilabs/gims/api/internal/<domain>/presentation/handler"
   import "github.com/gilabs/gims/api/internal/<domain>/presentation/router"
   ```

5. **Package naming conventions:**
   - Models package: Use singular domain entity as type name (e.g., `models.LeaveRequest`)
   - Never import with aliases unless there's a conflict
   - If conflict exists, use domain prefix (e.g., `hrdModels "github.com/gilabs/gims/api/internal/hrd/data/models"`)

### Troubleshooting Import Errors

**Error**: `package internal/hrd/data/models is not in GOROOT`
- **Cause**: Using relative import instead of full module path
- **Fix**: Replace with `github.com/gilabs/gims/api/internal/hrd/data/models`

**Error**: `package github.com/gilabs/gims/api/internal/xxx not found`
- **Cause**: Missing `go mod tidy` after creating new files
- **Fix**: Run `cd apps/api && go mod tidy`

**Error**: `ambiguous import: found package in multiple modules`
- **Cause**: Duplicate package names or incorrect go.mod
- **Fix**: Check `go.mod` in `apps/api/` - should have `module github.com/gilabs/gims/api`

## Development Commands
```bash
npx pnpm dev                    # Run all apps
npx pnpm dev --filter=web       # Frontend only (localhost:3000)
npx pnpm dev --filter=api       # Backend via Docker (localhost:8080)
npx pnpm build                  # Build all
npx pnpm lint && npx pnpm type-check
```

### Database (Docker Compose uses port 5434)
```bash
cd apps/api && docker-compose up -d postgres
# Migrations run automatically on server start
# Default user: admin@example.com / admin123
```

## Adding New Features

### Backend Workflow
1. Create domain folder: `apps/api/internal/<domain>/`
2. Create layers: models → repositories → dto → mapper → usecase → handler → router
3. Register in `presentation/routers.go` aggregator
4. **CRITICAL**: For features with foreign key fields (employee_id, customer_id, product_id, etc.), ALWAYS create a GetFormData endpoint (see pattern below)
5. Update Postman collection: `docs/postman/postman.json`

### GetFormData Endpoint Pattern (MANDATORY for Foreign Key Features)

**When to Create:**
- Feature has **foreign key fields** requiring dropdown selection (employee_id, customer_id, product_id, etc.)
- Form needs **enum options** (status, type, category fields)

**Purpose:** Single API call to fetch all dropdown/select options for forms, reducing frontend complexity and round-trips.

**Implementation Steps:**

1. **Add FormData DTO** (in `domain/dto/<feature>_dto.go`):
   ```go
   // <Feature>FormDataResponse for form options
   type <Feature>FormDataResponse struct {
       Employees    []EmployeeFormOption  `json:"employees"`    // For employee_id
       // Add other entities as needed (Customers, Products, etc.)
       <EnumName>s  []<EnumName>Option    `json:"<enum>s"`      // For enum fields
   }
   
   // Reuse EmployeeFormOption (or create if first time)
   type EmployeeFormOption struct {
       ID           uuid.UUID `json:"id"`
       EmployeeCode string    `json:"employee_code"`
       Name         string    `json:"name"`
   }
   
   // Create enum options
   type <EnumName>Option struct {
       Value string `json:"value"`
       Label string `json:"label"`
   }
   ```

2. **Add GetFormData to Usecase Interface** (in `domain/usecase/<feature>_usecase.go`):
   ```go
   type <Feature>Usecase interface {
       // ... other methods
       GetFormData(ctx context.Context) (*dto.<Feature>FormDataResponse, error)
   }
   ```

3. **Implement GetFormData in Usecase**:
   ```go
   func (u *<feature>Usecase) GetFormData(ctx context.Context) (*dto.<Feature>FormDataResponse, error) {
       // Fetch employees (or other related entities)
       employees, err := u.employeeRepo.FindAll(ctx)
       if err != nil {
           return nil, err
       }
   
       // Map to form options
       employeeOptions := make([]dto.EmployeeFormOption, 0, len(employees))
       for _, emp := range employees {
           employeeID, err := uuid.Parse(emp.ID)
           if err != nil {
               continue // Skip invalid UUID
           }
           employeeOptions = append(employeeOptions, dto.EmployeeFormOption{
               ID:           employeeID,
               EmployeeCode: emp.EmployeeCode,
               Name:         emp.Name,
           })
       }
   
       // Create enum options (example for degree levels)
       degreeLevels := []dto.DegreeLevelOption{
           {Value: "ELEMENTARY", Label: "Elementary School"},
           {Value: "BACHELOR", Label: "Bachelor's Degree (S1)"},
           // ... more options
       }
   
       return &dto.<Feature>FormDataResponse{
           Employees:    employeeOptions,
           DegreeLevels: degreeLevels,
       }, nil
   }
   ```

4. **Add GetFormData Handler** (in `presentation/handler/<feature>_handler.go`):
   ```go
   func (h *<Feature>Handler) GetFormData(c *gin.Context) {
       formData, err := h.usecase.GetFormData(c.Request.Context())
       if err != nil {
           handle<Feature>Error(c, err)
           return
       }
       response.SuccessResponse(c, formData, nil)
   }
   ```

5. **Register Route** (in `presentation/router/<feature>_router.go`):
   ```go
   // CRITICAL: Place BEFORE parameterized routes (/:id) for route specificity
   <plural>.GET("/form-data", middleware.RequirePermission("<feature>.read"), handler.GetFormData)
   ```

6. **Update Postman Collection** (`docs/postman/postman.json`):
   - Add "Get Form Data" endpoint
   - Include request example with auth token
   - Document response structure with employees + enum options
   - Add error codes (FORBIDDEN, INTERNAL_ERROR)

**Example Features Using This Pattern:**
- EmployeeContract: Returns employees, contract types, statuses
- EmployeeEducationHistory: Returns employees, degree levels
- SalesQuotation: Returns customers, products, payment terms
- PurchaseOrder: Returns suppliers, products, warehouses

**Benefits:**
- ✅ Single API call for all form options
- ✅ Consistent data structure across features
- ✅ Reduced frontend complexity
- ✅ Improved performance (fewer round-trips)

### Frontend Workflow
1. Create feature folder: `apps/web/src/features/<feature>/`
2. Create: types → schemas → services → hooks → components
3. Add i18n folder with translations (see i18n section below)
4. Add route: `apps/web/app/[locale]/<feature>/page.tsx`
5. Add `loading.tsx` for every new route

## Internationalization (i18n) with next-intl

### Setup Structure
- **Locales**: `id` (Indonesian), `en` (English) - defined in `src/i18n/routing.ts`
- **Global messages**: `src/i18n/messages/{en,id}.json` - common keys like `common.*`, `auth.*`
- **Feature messages**: Each feature has its own `i18n/` folder

### Adding Translations for New Feature
1. Create `src/features/<feature>/i18n/` folder with:
   ```
   i18n/
   ├── en.ts       # Export: export const featureEn = { feature: { ... } }
   ├── id.ts       # Export: export const featureId = { feature: { ... } }
   └── messages/   # (optional) JSON files if preferred
   ```

2. Register in `src/i18n/request.ts`:
   ```typescript
   // Import
   import { featureEn } from "@/features/<feature>/i18n/en";
   import { featureId } from "@/features/<feature>/i18n/id";
   
   // Add to messages object
   const messages = {
     en: { ...featureEn, ... },
     id: { ...featureId, ... },
   };
   ```

3. Use in components:
   ```typescript
   import { useTranslations } from "next-intl";
   const t = useTranslations("feature"); // matches key in i18n export
   <p>{t("title")}</p>
   ```

### Navigation (Use next-intl exports)
```typescript
import { Link, useRouter, usePathname, redirect } from "@/i18n/routing";
// NOT from "next/link" or "next/navigation"
```

## File Upload (Backend)

### Endpoint
`POST /api/v1/upload/image` - handled by `internal/core/infrastructure/handler/upload_handler.go`

### Configuration (Environment Variables)
```env
STORAGE_UPLOAD_DIR=./uploads      # Local storage directory
STORAGE_BASE_URL=/uploads         # URL prefix for serving files
STORAGE_MAX_UPLOAD_SIZE=10485760  # 10MB default
```

### Upload Response Format
```json
{
  "success": true,
  "data": {
    "filename": "uuid-generated.webp",
    "original_name": "photo.jpg",
    "url": "/uploads/uuid-generated.webp",
    "size": 12345,
    "mime_type": "image/webp"
  }
}
```

### Validation (Auto-handled)
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Auto-converts to WebP for optimization
- UUID-based filename generation (prevents path traversal)
- Magic bytes validation (not just extension)

## Key Documentation
- **Sprint Planning**: `docs/erp-sprint-planning.md` - Feature roadmap, business logic, success criteria
- **API Standards**: `docs/api-standart/README.md` - Response format, error codes, performance, security
- **Security Plan**: `docs/TEMPLATE_SECURITY_PERFORMANCE_PLAN.md` - Hardening checklist (JWT, CSRF, timeouts)
- **Migration Guidelines**: `docs/MIGRATION_GUIDELINES.md` - Database model registration (CRITICAL for new models)
- **Project Structure**: `TEMPLATE_STRUCTURE.md` - File organization
- **Database Relations**: `docs/erp-database-relations.mmd` - ERD for all modules
- **Timezone Support**: `docs/features/core/apptime-timezone-support.md` - Per-company timezone architecture & apptime usage

## Development Workflow (Step-by-Step)

### Task Planning & Breakdown (CRITICAL)

**Before implementing any feature, ALWAYS:**

1. **Analyze the Sprint Planning**: Read `docs/erp-sprint-planning.md` to understand:
   - Business logic requirements
   - Table relations (mermaid diagrams)
   - Success criteria
   - Integration requirements
   - Dependencies on other features

2. **Break Down the Task**: Create a clear todo list with small, manageable subtasks:
   - **Backend tasks**: Models → Repositories → DTOs → Mappers → Usecases → Handlers → Routers → Tests
   - **Frontend tasks**: Types → Schemas → Services → Hooks → Components → i18n → Routes
   - **Integration tasks**: API documentation, route registration, permission checks

3. **Create a Todo List**: Use the `manage_todo_list` tool to track progress:
   ```
   Example breakdown for "Employee Leave Request Feature":
   1. Read sprint planning for Leave Request requirements
   2. Backend: Create LeaveRequest model with GORM tags
   3. Backend: Create LeaveRequest repository interface + implementation
   4. Backend: Create LeaveRequest DTOs (CreateDTO, UpdateDTO, ResponseDTO)
   5. Backend: Create LeaveRequest mapper
   6. Backend: Create LeaveRequest usecase with business logic
   7. Backend: Create LeaveRequest handler
   8. Backend: Create LeaveRequest router + register in domain aggregator
   9. Frontend: Create types for LeaveRequest
   10. Frontend: Create Zod schemas for validation
   11. Frontend: Create service for API calls
   12. Frontend: Create hooks for queries/mutations
   13. Frontend: Create list component
   14. Frontend: Create form component
   15. Frontend: Create i18n translations (en/id)
   16. Frontend: Register i18n in request.ts
   17. Frontend: Create page + loading in app router
   18. Frontend: Register route in route-validator.ts
   19. Test: Verify CRUD operations
   20. Test: Verify approval workflow
   ```

4. **Execute Incrementally**: Work through the todo list one item at a time, marking each as complete before moving to the next.

5. **Validate at Checkpoints**: After completing related subtasks (e.g., all backend layers), verify the implementation works before moving to the next phase.

**Benefits of this approach**:
- ✅ Reduces cognitive load by focusing on one small task at a time
- ✅ Prevents missing critical steps (e.g., forgetting route registration)
- ✅ Enables clear progress tracking for the user
- ✅ Makes debugging easier by isolating issues to specific subtasks
- ✅ Allows for easy context switching if interrupted

### Adding New Backend Feature
1. **Read Sprint Planning**: Check `docs/erp-sprint-planning.md` for business logic, table relations, success criteria
2. **Create Domain Folder**: `apps/api/internal/<domain>/`
3. **Implement Layers** (in order):
   - `data/models/`: GORM entities with proper tags
   - **🔴 CRITICAL**: After creating model, IMMEDIATELY register it in `internal/core/infrastructure/database/migrate.go`
     - Add import: `{domain} "github.com/gilabs/gims/api/internal/{domain}/data/models"`
     - Add to `migrateWithErrorHandling()`: `&{domain}.{ModelName}{},`
     - See `docs/MIGRATION_GUIDELINES.md` for details
   - `data/repositories/`: Interface + implementation (use prefix search `text%` for indexed columns)
   - `domain/dto/`: Request/Response DTOs with `binding` tags
   - `domain/mapper/`: Model ↔ DTO conversion
   - `domain/usecase/`: Business logic (validate, calculate, orchestrate)
   - `presentation/handler/`: HTTP handlers (thin, delegate to usecase)
   - `presentation/router/`: Entity routes (`<entity>_routers.go`)
4. **Register Routes**: Add to `presentation/routers.go` domain aggregator
5. **Security Checklist**:
   - Validate ownership before access (IDOR prevention)
   - Use row-level locking (`FOR UPDATE`) for concurrent updates
   - Apply rate limiting for sensitive endpoints
   - Sanitize inputs via DTOs
6. **Performance Checklist**:
   - Add GIN indexes for text search: `CREATE INDEX idx_<table>_<col>_gin ON <table> USING gin (<col> gin_trgm_ops)`
   - Use context timeout (30s): `ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)`
   - Paginate results (max 100 per_page)
   - Use `Preload()` for relationships, avoid N+1 queries
7. **Update Postman Collection**: 
   - Add all new endpoints to `docs/postman/postman.json`
   - Include request examples with proper headers, body structure, and query params
   - Document expected responses (success and error cases)
   - Organize endpoints by feature/module folders
   - Update collection version and description if needed

### Seeder Guidelines (CRITICAL for Database Seeding)

Seeders live in `apps/api/seeders/` and run automatically on server start via `SeedAll()` in `seed_all.go`.

#### UUID Rules (MUST follow — PostgreSQL enforces)
- **ONLY hex characters** allowed in UUIDs: `0-9` and `a-f`
- **NEVER** use non-hex letters like `r`, `g`, `h`, `i`, `j`, etc.
- PostgreSQL `uuid` column type will **silently reject** invalid UUIDs

```go
// ❌ WRONG — "rr" is not valid hex, PostgreSQL will reject
RecruitmentID = "rr000001-0000-0000-0000-000000000001"

// ❌ WRONG — "gh" is not valid hex
GroupID = "gh000001-0000-0000-0000-000000000001"

// ✅ CORRECT — all hex characters (0-9, a-f)
RecruitmentID = "ae000001-0000-0000-0000-000000000001"
EvalGroupID   = "e0000001-0000-0000-0000-000000000001"
LeaveRequest  = "10000001-0001-0001-0001-000000000001"
```

#### UUID Prefix Convention (by feature)
Use a **hex-only prefix** to identify the feature. Suggested mappings:
- `e0` = Evaluation Group
- `ec` = Evaluation Criteria  
- `ee` = Employee Evaluation  
- `ae` = Recruitment Request
- `10..80` = Leave Requests (sequential)
- Use remaining hex prefixes (`a0-af`, `b0-bf`, `c0-cf`, `d0-df`, `f0-ff`) for new features

#### Pointer Fields for Constants (Go constraint)
Go cannot take the address of a constant (`&MyConst`). Create local variables:
```go
// ❌ WRONG — compile error: cannot take address of constant
CreatedBy: &AdminEmployeeID,

// ✅ CORRECT — use local variable
adminID := AdminEmployeeID
CreatedBy: &adminID,
```

#### Seeder Structure Pattern
```go
package seeders

import (
    "log"
    "github.com/gilabs/gims/api/internal/core/infrastructure/database"
    "github.com/gilabs/gims/api/internal/<domain>/data/models"
    "gorm.io/gorm/clause"
)

const (
    // Fixed UUIDs — hex-only characters [0-9a-f]
    MyEntityID1 = "ab000001-0000-0000-0000-000000000001"
    MyEntityID2 = "ab000001-0000-0000-0000-000000000002"
)

func SeedMyEntities() error {
    log.Println("Seeding my entities...")
    
    // Local vars for pointer fields
    adminID := AdminEmployeeID
    
    entities := []models.MyEntity{
        {
            ID:        MyEntityID1,
            CreatedBy: &adminID,
            // ...
        },
    }
    
    for _, entity := range entities {
        if err := database.DB.Clauses(clause.OnConflict{
            Columns:   []clause.Column{{Name: "id"}},
            DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
        }).Create(&entity).Error; err != nil {
            log.Printf("Warning: Failed to seed entity %s: %v", entity.ID, err)
        }
    }
    
    log.Println("My entities seeded successfully")
    return nil
}
```

#### Registration in seed_all.go (MANDATORY)
After creating a seeder, register it in `apps/api/seeders/seed_all.go`:
```go
// In SeedAll() function, add after existing seeders:
if err := SeedMyEntities(); err != nil {
    return err
}
```

#### Available Constants (from `seeders/constants.go`)
- **Employees**: `AdminEmployeeID`, `ManagerEmployeeID`, `StaffEmployeeID`
- **Divisions**: `SalesDivisionID`, `OpsDivisionID`, `FinanceDivisionID`, `HRDivisionID`, `ITDivisionID`
- **Positions**: `DirectorPositionID`, `ManagerPositionID`, `SupervisorPositionID`, `StaffPositionID`, `AdminPositionID`, `SalesRepPositionID`
- **Roles**: `AdminRoleID`, `ManagerRoleID`, `StaffRoleID`, `ViewerRoleID`
- **Users**: `AdminUserID`, `ManagerUserID`, `StaffUserID`, `ViewerUserID`

#### Common Seeder Mistakes to Avoid
1. **Non-hex UUID characters** — The #1 cause of seeder failures. Always verify your UUID prefixes are `[0-9a-f]` only.
2. **Taking address of constants** — Use local variables for pointer fields.
3. **Forgetting to register in seed_all.go** — Seeder function won't be called.
4. **Not using `clause.OnConflict`** — Seeder must be idempotent (re-runnable).
5. **Incorrect FK references** — Always use constants from `constants.go` for related entity IDs.

### Adding New Frontend Feature
1. **Read Sprint Planning**: Check UI requirements, success criteria, integration needs
2. **Create Feature Folder**: `apps/web/src/features/<feature>/`
3. **Implement Structure** (in order):
   - `types/index.d.ts`: All TypeScript interfaces (API response types, form data)
   - `schemas/<feature>.schema.ts`: Zod schemas with translation support `getSchema(t)`
   - `services/<feature>-service.ts`: API client calls with typed responses
   - `hooks/use-<feature>.ts`: TanStack Query hooks (queries, mutations, optimistic updates)
   - `components/`: UI components (list, form, detail, modals) - NO business logic
   - `i18n/{en,id}.ts`: Translations for the feature
4. **Create Route**:
   - Add page: `apps/web/app/[locale]/(dashboard)/<feature>/page.tsx`
   - Add loading: `apps/web/app/[locale]/(dashboard)/<feature>/loading.tsx`
   - Register route: Add to `apps/web/src/lib/route-validator.ts`
5. **Register i18n**:
   - Import translations in `src/i18n/request.ts`
   - Add to messages object: `en: { ...featureEn, ... }`
6. **Component Guidelines**:
   - Use optional chaining (`?.`) and nullish coalescing (`??`) everywhere
   - Handle loading/error/empty states from TanStack Query
   - Add `cursor-pointer` to clickable elements
   - Use `PageMotion` for page transitions
   - Form caching in localStorage for draft persistence (see quotation-form.tsx)
7. **Testing**: Test all CRUD operations, loading states, error handling

## Key Documentation
- API Standards: `docs/api-standart/README.md`
- Sprint Planning: `docs/erp-sprint-planning.md`
- Migration Guidelines: `docs/MIGRATION_GUIDELINES.md`
- Template Structure: `TEMPLATE_STRUCTURE.md`
- Security Rules: `.cursor/rules/security.mdc`
- Project Standards: `.cursor/rules/standart.mdc`
- Timezone/apptime: `docs/features/core/apptime-timezone-support.md`

## TypeScript/Styling Rules
- **NEVER** use `any` type - use `unknown` with type guards
- **NEVER** use arbitrary Tailwind values (`bg-[#e53e3e]`, `mt-[13px]`)
- Use semantic tokens from `tailwind.config.js` only
- Kebab-case directories, PascalCase components, camelCase functions
## Dokumentasi Fitur dan Kode

### Prinsip Dokumentasi
Tim menggunakan **dokumentasi ringan dan praktis** untuk menjaga kecepatan development tanpa mengorbankan clarity. Dokumentasi harus **hidup di dekat kode** dan **mudah di-maintain**.

### Struktur Dokumentasi per Fitur

**Lokasi**: `docs/features/{feature-name}.md`

Setiap fitur atau modul utama **WAJIB** memiliki file dokumentasi dengan struktur berikut:

#### 1. Ringkasan Singkat Fitur
Brief description tentang apa yang dilakukan fitur ini dan mengapa fitur ini ada (business value).

**Contoh**:
```markdown
# Leave Request Management

Fitur untuk mengelola pengajuan cuti karyawan dengan approval workflow. 
Memungkinkan karyawan mengajukan cuti dan HRD/manager melakukan approval/rejection.
```

#### 2. Fitur Utama
Daftar capabilities utama dalam bentuk bullet points.

**Contoh**:
```markdown
## Fitur Utama
- Pengajuan cuti dengan pilihan jenis cuti (annual, sick, maternity)
- Approval workflow (pending → approved/rejected)
- Kalkulasi sisa kuota cuti otomatis
- Notifikasi email untuk approver
- History pengajuan cuti per karyawan
```

#### 3. Business Rules Penting
Logika bisnis yang krusial dan tidak boleh dilanggar.

**Contoh**:
```markdown
## Business Rules
- Leave balance = TotalLeaveQuota - UsedLeave
- Cuti annual tidak bisa diajukan jika sisa kuota < jumlah hari yang diminta
- Cuti sick tidak memotong kuota annual (IsCutAnnualLeave = false)
- Pengajuan cuti harus diajukan minimal H-3 (kecuali emergency)
- Manager tidak bisa approve cuti dirinya sendiri
```

#### 4. Keputusan Teknis & Trade-offs
Dokumentasikan **WHY** di balik keputusan arsitektur/implementasi penting.

**Contoh**:
```markdown
## Keputusan Teknis
- **Mengapa menggunakan soft delete untuk leave requests**: 
  Untuk audit trail dan compliance. Trade-off: slightly more complex queries.
  
- **Mengapa approval workflow tidak pakai state machine library**:
  Flow sederhana (3 states), state machine library overkill. Trade-off: manual validation di usecase.
  
- **Mengapa leave balance di-cache di Redis**:
  Sering di-query untuk UI dashboard. Trade-off: cache invalidation saat ada approval.
```

#### 5. Struktur Folder (jika kompleks)
Tampilkan struktur folder jika fitur memiliki banyak sub-modul.

**Contoh**:
```markdown
## Struktur Folder
```
features/hrd/leave/
├── types/           # TypeScript interfaces
├── schemas/         # Zod validation schemas
├── services/        # API calls
├── hooks/           # TanStack Query hooks
│   ├── use-leave-requests.ts
│   └── use-leave-balance.ts
├── components/      # UI components
│   ├── leave-request-list.tsx
│   ├── leave-request-form.tsx
│   └── leave-balance-card.tsx
└── i18n/            # Translations
```
```

#### 6. API Endpoints Utama
Daftar endpoint dalam bentuk **tabel** untuk referensi cepat.

**Contoh**:
```markdown
## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/hrd/leave-requests` | leave.read | List all leave requests |
| GET | `/hrd/leave-requests/:id` | leave.read | Get detail by ID |
| POST | `/hrd/leave-requests` | Auth | Submit leave request |
| GET | `/hrd/leave-requests/form-data` | auth | Fetch form data for leave requests |
| POST | `/hrd/leave-requests/:id/approve` | leave.approve | Approve request |
| POST | `/hrd/leave-requests/:id/reject` | leave.approve | Reject request |
| GET | `/hrd/leave-requests/my-balance` | Auth | Get own leave balance |
| DELETE | `/hrd/leave-requests/:id` | leave.delete | Delete request (soft) |
```

#### 7. Cara Test Manual Singkat
Step-by-step untuk QA/developer test fitur secara manual.

**Contoh**:
```markdown
## Manual Testing
1. Login sebagai employee
2. Navigate ke `/hrd/leave-requests`
3. Click "Add Leave Request"
4. Pilih leave type = Annual, date range = 3 hari
5. Submit → should show success toast
6. Logout, login sebagai manager
7. Navigate ke pending approvals
8. Approve request → balance should decrease by 3 days
```

#### 8. Informasi Testing Otomatis
Info tentang coverage dan cara run tests.

**Contoh**:
```markdown
## Automated Testing
- **Unit Tests**: `apps/api/internal/hrd/domain/usecase/leave_usecase_test.go`
- **Integration Tests**: `apps/api/test/hrd/leave_integration_test.go`
- **E2E Tests**: `apps/web/tests/e2e/hrd/leave-request.spec.ts`

**Run Tests**:
```bash
# Backend unit tests
cd apps/api && go test ./internal/hrd/...

# Frontend unit tests
cd apps/web && npx pnpm test leave

# E2E tests
cd apps/web && npx pnpm test:e2e hrd
```
```

#### 9. Dependensi Utama
Library atau modul eksternal yang dipakai fitur ini.

**Contoh**:
```markdown
## Dependencies
- **Backend**: GORM (models), Redis (balance cache), SMTP (email notifications)
- **Frontend**: TanStack Query (data fetching), Zod (validation), date-fns (date calculations)
- **Integration**: Employee module (untuk employee data), Holiday module (untuk validasi working days)
```

#### 10. Related Issues/PRs
Link ke GitHub issues/PRs yang relevan (opsional).

**Contoh**:
```markdown
## Related Links
- Issue: #123 - Implement Leave Request Feature
- PR: #456 - Add leave balance calculation
- Discussion: #789 - Leave type configuration
```

#### 11. Catatan Tambahan / Improvement Plan
Known issues, limitasi, atau rencana improvement future.

**Contoh**:
```markdown
## Notes & Improvements
- **Known Limitation**: Saat ini belum support fractional days (half-day leave)
- **Future Improvement**: 
  - Add delegation feature (assign substitute during leave)
  - Add bulk approval untuk manager
  - Add calendar view untuk leave schedule
- **Performance**: Leave balance cache di Redis expire setiap 1 jam, consider moving to event-driven invalidation
```

### Aturan Kode yang Self-Documenting

1. **Naming yang Jelas dan Deskriptif**
   ```go
   // ❌ BAD
   func calc(e Employee, days int) int {
       return e.quota - days
   }
   
   // ✅ GOOD
   func CalculateRemainingLeaveBalance(employee Employee, requestedDays int) int {
       return employee.TotalLeaveQuota - requestedDays
   }
   ```

2. **Comment Hanya untuk "WHY", Bukan "WHAT"**
   ```go
   // ❌ BAD - Comment explains WHAT (obvious from code)
   // Loop through all employees
   for _, employee := range employees {
       // Calculate balance
       balance := employee.TotalQuota - employee.UsedLeave
   }
   
   // ✅ GOOD - Comment explains WHY (business context)
   // We exclude inactive employees from balance calculation to prevent
   // approval of leave requests for employees who already resigned
   activeEmployees := filterActiveEmployees(employees)
   for _, employee := range activeEmployees {
       balance := employee.TotalQuota - employee.UsedLeave
   }
   ```

3. **Hindari Magic Numbers, Gunakan Konstanta**
   ```typescript
   // ❌ BAD
   if (daysRequested > 14) {
       requiresDirectorApproval = true;
   }
   
   // ✅ GOOD
   const MAX_DAYS_BEFORE_DIRECTOR_APPROVAL = 14;
   if (daysRequested > MAX_DAYS_BEFORE_DIRECTOR_APPROVAL) {
       requiresDirectorApproval = true;
   }
   ```

### Aturan Testing sebagai Living Documentation

Test harus memiliki **nama deskriptif gaya BDD** yang menjelaskan behavior/requirement.

**Contoh**:
```go
// ❌ BAD - Tidak jelas apa yang di-test
func TestLeave1(t *testing.T) { ... }

// ✅ GOOD - Jelas requirement dan expected behavior
func TestLeaveRequest_ShouldRejectWhen_InsufficientBalance(t *testing.T) { ... }
func TestLeaveRequest_ShouldRequireDirectorApproval_WhenRequestExceeds14Days(t *testing.T) { ... }
func TestLeaveBalance_ShouldDecrease_AfterApprovalIsConfirmed(t *testing.T) { ... }
```

**Pattern**: `Test{Feature}_{Should/ShouldNot}{ExpectedBehavior}_When{Condition}`

### Kapan TIDAK Perlu Dokumentasi Terpisah

**JANGAN buat dokumentasi di Notion/Wiki untuk**:
- Fitur internal sederhana yang sudah self-explanatory dari kode
- Utility functions yang sudah well-named
- Standard CRUD operations tanpa business logic kompleks

**Cukup pastikan**:
- Kode clean dan self-documenting
- Test coverage mencukupi
- Comment "WHY" untuk logic non-obvious

**WAJIB buat dokumentasi `docs/features/{feature}.md` untuk**:
- Fitur dengan business rules kompleks
- Integration dengan sistem eksternal
- Workflow multi-step (approval, state machine)
- Fitur yang sering di-query stakeholder
- Fitur dengan keputusan teknis penting yang perlu didokumentasikan

### Checklist Dokumentasi per Fitur

Sebelum consider fitur "done", pastikan:
- [ ] File `docs/features/{feature-name}.md` sudah dibuat
- [ ] Semua 11 bagian sudah terisi (skip yang tidak relevan, tapi jelaskan why skip)
- [ ] API endpoints terdokumentasi dalam tabel
- [ ] Business rules krusial sudah tertulis
- [ ] Keputusan teknis penting sudah dijelaskan (dengan "WHY")
- [ ] Manual testing steps sudah jelas
- [ ] Test files sudah memiliki nama deskriptif (BDD style)
- [ ] Kode sudah clean dan self-documenting (minimal comment "WHAT")
- [ ] Comment "WHY" ada di tempat yang tepat (complex logic, business context)