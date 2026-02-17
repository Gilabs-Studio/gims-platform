# backend-feature-development

Complete Backend Feature Development Workflow
1. Cursor Workflow JSON Configuration
Create this file in your project: .cursor/rules/backend-feature-workflow.mdc
---
description: Backend Feature Development - Vertical Slice Architecture
globs: apps/api/internal/**/*.go
alwaysApply: false
---
 Backend Feature Development Workflow
 When to Use
When adding a new entity/feature to the GIMS backend following vertical slice architecture.
 Prerequisites
- Feature requirements from docs/erp-sprint-planning.md
- Database relation understanding from docs/erp-database-relations.mmd
- Understanding of which domain this belongs to (hrd, sales, product, etc.)
 Workflow Steps
 Phase 1: Setup & Planning (5 mins)
1. **Read sprint planning**
   - Check `docs/erp-sprint-planning.md` for business logic
   - Note table relations and success criteria
   - Identify if foreign keys require GetFormData endpoint
2. **Determine domain location**
   - Choose appropriate domain folder: `apps/api/internal/<domain>/`
   - Examples: `hrd`, `sales`, `product`, `finance`, `stock`
   - If new domain, create full folder structure
 Phase 2: Model Layer (10 mins)
3. **Create GORM Model**
   - Location: `apps/api/internal/<domain>/data/models/<entity>.go`
   - Required fields:
     - `ID uuid.UUID` with `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
     - `CreatedAt time.Time` with `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
     - `UpdatedAt time.Time` with `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
     - `DeletedAt gorm.DeletedAt` with `gorm:"column:deleted_at;index"` (soft delete)
     - `CreatedBy uuid.UUID` with `gorm:"column:created_by;type:uuid"`
     - `UpdatedBy *uuid.UUID` with `gorm:"column:updated_by;type:uuid"` (nullable, pointer)
   - Add business fields with proper GORM tags
   - Define `TableName()` method
   - Add relationships with `Preload()` consideration
4. **⚠️ CRITICAL: Register in migrate.go**
   - Open: `apps/api/internal/core/infrastructure/database/migrate.go`
   - Add import: `<domain> "github.com/gilabs/gims/api/internal/<domain>/data/models"`
   - Add to `migrateWithErrorHandling()`: `&<domain>.<ModelName>{},`
   - Place in appropriate section with comment: `// <Domain> <Feature> entities`
 Phase 3: Repository Layer (15 mins)
5. **Create Repository Interface**
   - Location: `apps/api/internal/<domain>/data/repositories/<entity>_repository.go`
   - Define interface with methods:
     - `FindAll(ctx context.Context, query dto.ListQuery) ([]models.<Entity>, int64, error)`
     - `FindByID(ctx context.Context, id uuid.UUID) (*models.<Entity>, error)`
     - `Create(ctx context.Context, entity *models.<Entity>) error`
     - `Update(ctx context.Context, entity *models.<Entity>) error`
     - `Delete(ctx context.Context, id uuid.UUID) error`
   - Use full module path imports
   - Include context for all operations
6. **Create Repository Implementation**
   - Location: `apps/api/internal/<domain>/data/repositories/<entity>_repository_impl.go`
   - Implement interface
   - Use GORM with Preload() for relationships
   - Implement pagination with max 100 per_page
   - Add prefix search for indexed columns (e.g., `name%` not `%name%`)
   - Use FOR UPDATE for concurrent updates
   - Add proper error handling
 Phase 4: Domain Layer (20 mins)
7. **Create DTOs**
   - Location: `apps/api/internal/<domain>/domain/dto/<entity>_dto.go`
   - Create request DTOs:
     - `<Entity>CreateRequest` with `binding:"required"` tags
     - `<Entity>UpdateRequest` with optional fields
   - Create response DTO:
     - `<Entity>Response` with all fields for API response
   - Create list query DTO:
     - `<Entity>ListQuery` with page, per_page, search, filters
   - If foreign keys exist, create FormDataResponse:
     - `<Entity>FormDataResponse` with dropdown options
     - Include related entity options (EmployeeFormOption, etc.)
     - Include enum options if applicable
8. **Create Mapper**
   - Location: `apps/api/internal/<domain>/domain/mapper/<entity>_mapper.go`
   - Create functions:
     - `ToModel(req dto.<Entity>CreateRequest) models.<Entity>`
     - `ToResponse(model models.<Entity>) dto.<Entity>Response`
     - `ToResponseList(models []models.<Entity>) []dto.<Entity>Response`
   - Handle pointer fields carefully
   - Map timestamps correctly
   - Handle relationships
9. **Create Usecase Interface**
   - Location: `apps/api/internal/<domain>/domain/usecase/<entity>_usecase.go`
   - Define interface:
     - `GetAll(ctx context.Context, query dto.<Entity>ListQuery) ([]dto.<Entity>Response, int64, error)`
     - `GetByID(ctx context.Context, id uuid.UUID) (*dto.<Entity>Response, error)`
     - `Create(ctx context.Context, req dto.<Entity>CreateRequest, userID uuid.UUID) (*dto.<Entity>Response, error)`
     - `Update(ctx context.Context, id uuid.UUID, req dto.<Entity>UpdateRequest, userID uuid.UUID) (*dto.<Entity>Response, error)`
     - `Delete(ctx context.Context, id uuid.UUID) error`
     - `GetFormData(ctx context.Context) (*dto.<Entity>FormDataResponse, error)` (if foreign keys)
10. **Create Usecase Implementation**
    - Location: `apps/api/internal/<domain>/domain/usecase/<entity>_usecase_impl.go`
    - Implement interface
    - Inject repository via constructor
    - Add business logic validation
    - Handle authorization/ownership checks (IDOR prevention)
    - Set CreatedBy/UpdatedBy fields
    - Use transactions for complex operations
    - Add context timeout (30s): `ctx, cancel := context.WithTimeout(ctx, 30*time.Second)`
 Phase 5: Presentation Layer (15 mins)
11. **Create Handler**
    - Location: `apps/api/internal/<domain>/presentation/handler/<entity>_handler.go`
    - Create struct with usecase dependency
    - Implement handlers:
      - `GetAll(c *gin.Context)` - list with pagination
      - `GetByID(c *gin.Context)` - get single
      - `Create(c *gin.Context)` - create new
      - `Update(c *gin.Context)` - update existing
      - `Delete(c *gin.Context)` - soft delete
      - `GetFormData(c *gin.Context)` - dropdown data (if needed)
    - Use `response.SuccessResponse()` for success
    - Use `response.ErrorResponse()` with proper error codes
    - Handle binding errors
    - Extract userID from JWT claims
    - Validate UUID format
12. **Create Router**
    - Location: `apps/api/internal/<domain>/presentation/router/<entity>_router.go`
    - Define routes:
      - `GET /` → GetAll (with permission middleware)
      - `GET /:id` → GetByID
      - `POST /` → Create
      - `PUT /:id` → Update
      - `DELETE /:id` → Delete
      - `GET /form-data` → GetFormData (BEFORE /:id route!)
    - Apply middleware:
      - `middleware.Authentication()`
      - `middleware.RequirePermission("<entity>.read")` etc.
 Phase 6: Integration (10 mins)
13. **Register in Domain Router**
    - Open: `apps/api/internal/<domain>/presentation/routers.go`
    - Add repository, usecase, handler imports
    - Wire dependencies in `RegisterRoutes()`
    - Register entity router
14. **Verify Go Imports**
    - Run: `cd apps/api && go mod tidy`
    - Verify no relative imports
    - Check: `go build ./...`
    - Fix any import errors
 Phase 7: Testing & Documentation (10 mins)
15. **Create Seeder (if needed)**
    - Location: `apps/api/seeders/<entity>_seeder.go`
    - Use hex-only UUIDs: `0-9`, `a-f` only
    - Use local variables for pointer fields
    - Register in `seeders/seed_all.go`
16. **Update Postman Collection**
    - Add endpoints to `docs/postman/postman.json`
    - Include:
      - Request examples with headers
      - Request body structure
      - Expected responses
      - Error scenarios
    - Organize by feature/module
17. **Test the Implementation**
    - Start API: `npx pnpm dev --filter=api`
    - Test CRUD operations
    - Test GetFormData endpoint
    - Verify database tables created
    - Check logs for errors
 Validation Checklist
Before marking complete:
- [ ] Model registered in migrate.go
- [ ] All imports use full module path (github.com/gilabs/gims/api/...)
- [ ] Import order: Standard → External → Internal
- [ ] Business logic in usecase, NOT handler
- [ ] Soft delete field (DeletedAt) included
- [ ] Pagination max 100 per_page enforced
- [ ] GetFormData endpoint created if foreign keys exist (BEFORE /:id route)
- [ ] Error codes match api-error-codes.md
- [ ] Repository uses interface-based design
- [ ] FOR UPDATE used for concurrent updates
- [ ] IDOR prevention (ownership validation)
- [ ] CreatedBy/UpdatedBy fields set
- [ ] go mod tidy executed successfully
- [ ] go build ./... passes
- [ ] Seeder uses hex-only UUIDs
- [ ] Postman collection updated
 Common Mistakes to Avoid
❌ **NEVER use relative imports**: `import "internal/..."`
✅ **ALWAYS use full path**: `import "github.com/gilabs/gims/api/internal/..."`
❌ **NEVER put business logic in handler**
✅ **ALWAYS delegate to usecase**
❌ **NEVER forget to register model in migrate.go**
✅ **Register IMMEDIATELY after creating model**
❌ **NEVER use non-hex UUIDs in seeders**: `"rr000001-..."`
✅ **ALWAYS hex-only**: `"ae000001-..."`
❌ **NEVER take address of constant**: `&AdminEmployeeID`
✅ **Use local variable**: `adminID := AdminEmployeeID; &adminID`
❌ **NEVER place GetFormData AFTER /:id route**
✅ **ALWAYS place BEFORE parameterized routes**
 Example: EmployeeContract Feature
 File Structure Created:
apps/api/internal/hrd/
├── data/
│   ├── models/
│   │   └── employee_contract.go
│   └── repositories/
│       ├── employee_contract_repository.go
│       └── employee_contract_repository_impl.go
├── domain/
│   ├── dto/
│   │   └── employee_contract_dto.go
│   ├── mapper/
│   │   └── employee_contract_mapper.go
│   └── usecase/
│       ├── employee_contract_usecase.go
│       └── employee_contract_usecase_impl.go
└── presentation/
    ├── handler/
    │   └── employee_contract_handler.go
    └── router/
        └── employee_contract_router.go
### Migration Registration:
```go
// In apps/api/internal/core/infrastructure/database/migrate.go
import hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
func AutoMigrate() error {
    err := migrateWithErrorHandling(
        // ... other models ...
        
        // HRD Employee Contracts entities (Sprint 14)
        &hrd.EmployeeContract{},
    )
}
Router Registration:
// In apps/api/internal/hrd/presentation/routers.go
contracts := router.Group("/employee-contracts")
{
    contracts.GET("/form-data", middleware.RequirePermission("employee-contract.read"), handler.GetFormData)
    contracts.GET("/", middleware.RequirePermission("employee-contract.read"), handler.GetAll)
    contracts.GET("/:id", middleware.RequirePermission("employee-contract.read"), handler.GetByID)
    contracts.POST("/", middleware.RequirePermission("employee-contract.create"), handler.Create)
    contracts.PUT("/:id", middleware.RequirePermission("employee-contract.update"), handler.Update)
    contracts.DELETE("/:id", middleware.RequirePermission("employee-contract.delete"), handler.Delete)
}