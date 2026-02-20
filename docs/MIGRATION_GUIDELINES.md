# GIMS Platform - Database Migration Guidelines

## Overview

The GIMS platform uses **GORM AutoMigrate** for database schema management, NOT SQL migration files. This document explains how to properly add new database models to prevent migration issues.

---

## ⚠️ Common Problem: Model Not Registered

### Symptom
- API fails to start or experiences build errors
- Table not created in database
- Schema mismatch errors
- "Migration loop" or hanging during startup

### Root Cause
Model was created but NOT registered in `internal/core/infrastructure/database/migrate.go`

---

## ✅ Correct Workflow: Adding a New Database Model

### Step 1: Create GORM Model

**Location**: `apps/api/internal/{domain}/data/models/{model_name}.go`

```go
package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type EmployeeContract struct {
    ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    EmployeeID     uuid.UUID      `gorm:"column:employee_id;type:uuid;not null"`
    ContractNumber string         `gorm:"column:contract_number;type:varchar(50);not null;uniqueIndex"`
    ContractType   string         `gorm:"column:contract_type;type:varchar(20);not null"`
    StartDate      time.Time      `gorm:"column:start_date;type:date;not null"`
    EndDate        *time.Time     `gorm:"column:end_date;type:date"`
    Salary         float64        `gorm:"column:salary;type:decimal(15,2);not null"`
    Status         string         `gorm:"column:status;type:varchar(20);not null;default:'ACTIVE'"`
    CreatedBy      uuid.UUID      `gorm:"column:created_by;type:uuid"`
    UpdatedBy      *uuid.UUID     `gorm:"column:updated_by;type:uuid"`
    CreatedAt      time.Time      `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
    UpdatedAt      time.Time      `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
    DeletedAt      gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (EmployeeContract) TableName() string {
    return "employee_contracts"
}
```

**Key Points**:
- Use proper GORM tags for all fields
- Include soft delete: `gorm.DeletedAt`
- Define `TableName()` method for explicit table name
- Use appropriate data types: `uuid.UUID`, `*time.Time` for nullable dates
- Add business methods if needed

---

### Step 2: Register Model in AutoMigrate (CRITICAL)

**File**: `apps/api/internal/core/infrastructure/database/migrate.go`

1. **Add import** at the top:
```go
import (
    // ... existing imports ...
    hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
)
```

2. **Register model** in `AutoMigrate()` function:
```go
func AutoMigrate() error {
    // ... existing code ...
    
    err := migrateWithErrorHandling(
        // ... existing models ...
        
        // HRD Leave Management entities (Sprint 14)
        &hrd.LeaveRequest{},
        // HRD Employee Contracts entities (Sprint 14)
        &hrd.EmployeeContract{},  // <-- ADD THIS LINE
        
        // Inventory entities (Sprint 9)
        &inventory.InventoryBatch{},
        // ... rest of models ...
    )
}
```

**Position Guidelines**:
- Place models **logically by domain and sprint**
- Follow existing comment structure: `// {Domain} {Feature} entities (Sprint X)`
- Add new models at the end of their domain section
- Maintain alphabetical order within each section (optional but cleaner)

---

### Step 3: Verification

Run these commands to verify everything works:

```bash
# 1. Verify Go imports are correct
cd apps/api
go mod tidy

# 2. Check for linter errors
# (VSCode should show no errors in migrate.go)

# 3. Build the project
go build ./...

# 4. Start the API
cd ../..
npx pnpm dev:api

# 5. Check logs for successful migration
# Expected output: "Database migrations completed"

# 6. Verify table exists in database
docker exec -it gims-platform-db psql -U postgres -d gims -c "\d employee_contracts"
```

---

## ❌ Common Mistakes to Avoid

### 1. Creating SQL Migration Files (WRONG)

```bash
# ❌ DON'T DO THIS
touch apps/api/migrations/20260206_create_employee_contracts.sql
```

**Why**: The `migrations/` folder is legacy/unused. SQL files placed there are **NOT executed**.

**Correct**: Register the GORM model in `migrate.go` (see Step 2 above)

---

### 2. Forgetting to Register Model

```go
// ❌ Model created but not registered in migrate.go
// Result: Table not created, API fails

// ✅ Always register AFTER creating model
&hrd.EmployeeContract{},
```

---

### 3. Wrong Import Path

```go
// ❌ WRONG - Relative import
import "./hrd/data/models"

// ✅ CORRECT - Full module path
import hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
```

---

### 4. Placing Model in Wrong Section

```go
// ❌ BAD - Random placement breaks logical grouping
&user.User{},
&hrd.EmployeeContract{},  // <-- HRD model mixed with auth models
&role.Role{},

// ✅ GOOD - Grouped by domain
&user.User{},
&role.Role{},
// ... other auth models ...

// HRD entities
&hrd.AttendanceRecord{},
&hrd.EmployeeContract{},
```

---

## 🏗️ Migration System Architecture

### How GORM AutoMigrate Works

1. **Startup**: `cmd/api/main.go` calls `database.AutoMigrate()` on server start
2. **Registration**: `migrate.go` calls `migrateWithErrorHandling()` with all model structs
3. **Schema Inspection**: GORM reads struct tags to determine table schema
4. **Schema Sync**: GORM creates/updates tables, columns, indexes, constraints
5. **Safety**: Non-destructive (won't drop columns), but test in staging first

### Flow Diagram

```
Server Start
    ↓
main.go (line 90-92)
    ↓
database.AutoMigrate()
    ↓
migrateWithErrorHandling()
    ↓
GORM inspects: &hrd.EmployeeContract{}
    ↓
Creates/Updates: employee_contracts table
    ↓
Adds: Indexes, Constraints, Foreign Keys
    ↓
Returns: Success or Error
```

---

## 🔧 Advanced Scenarios

### Adding Indexes

Use GORM tags in the model:

```go
type Employee struct {
    Name  string `gorm:"column:name;type:varchar(100);not null;index:idx_employee_name"`
    Email string `gorm:"column:email;type:varchar(100);not null;uniqueIndex"`
}
```

For complex indexes (e.g., GIN for full-text search), add in `createSearchIndexes()`:

```go
func createSearchIndexes() error {
    indexes := []string{
        "CREATE INDEX IF NOT EXISTS idx_employee_contracts_expiring ON employee_contracts(status, end_date) WHERE status = 'ACTIVE' AND end_date IS NOT NULL",
    }
    // ... rest of function
}
```

---

### Foreign Keys

GORM automatically creates foreign keys based on struct relationships:

```go
type EmployeeContract struct {
    EmployeeID uuid.UUID `gorm:"column:employee_id;type:uuid;not null"`
    // GORM auto-creates FK if Employee model exists in migration
}
```

For explicit FK with options:

```go
type EmployeeContract struct {
    EmployeeID uuid.UUID `gorm:"column:employee_id;type:uuid;not null;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}
```

---

### Data Migrations

For one-time data transformations, create a seeder:

```go
// apps/api/seeders/employee_contract_seeder.go
func SeedEmployeeContracts(db *gorm.DB) error {
    // Insert sample data
    // Or perform data transformations
}
```

Register in `seeders/seed_all.go`:

```go
func SeedAll(db *gorm.DB) error {
    // ... existing seeders ...
    if err := SeedEmployeeContracts(db); err != nil {
        return err
    }
}
```

---

## 🚀 Production Considerations

### Environment Variables

- **`RUN_MIGRATIONS`**: Controls auto-migration on startup
  - Default: `true` in development, `false` in production
  - Override: Set explicitly in `.env` or Docker environment

- **`DROP_ALL_TABLES`**: Development-only table reset
  - Default: `false`
  - **NEVER** set to `true` in production (protected by config)

### Safety Checks

The migration system includes production safety checks:

```go
// From migrate.go
func shouldDropTables() bool {
    // CRITICAL: Never drop tables in production
    if env == "production" || env == "prod" {
        log.Println("🔒 Production mode detected: Table drop is disabled")
        return false
    }
    // Only allow in development
}
```

### Deployment Best Practices

1. **Staging First**: Always test migrations in staging environment
2. **Backup Database**: Before running migrations in production
3. **Blue-Green Deployment**: For zero-downtime deployments
4. **Rollback Plan**: Keep previous version ready if migration fails
5. **Monitor Logs**: Watch for migration errors during deployment

---

## 📋 Checklist: Adding a New Model

Before marking your PR as ready for review:

- [ ] Model created in `internal/{domain}/data/models/`
- [ ] All GORM tags properly defined
- [ ] Soft delete field included (`gorm.DeletedAt`)
- [ ] `TableName()` method defined
- [ ] **Model registered in `migrate.go` (CRITICAL)**
- [ ] Import added for domain package
- [ ] Proper section comment added
- [ ] `go mod tidy` executed successfully
- [ ] No linter errors in `migrate.go`
- [ ] API starts without errors
- [ ] Table verified in database (`\d table_name`)
- [ ] Seeder created (if needed)
- [ ] Feature documentation updated

---

## 🐛 Troubleshooting

### "undefined: hrd.EmployeeContract"

**Cause**: Import missing or incorrect

**Fix**:
```go
// Add at top of migrate.go
import hrd "github.com/gilabs/gims/api/internal/hrd/data/models"
```

---

### "failed to run migrations: ERROR: relation already exists"

**Cause**: Manual SQL was run, conflicting with GORM

**Fix**:
1. Drop the table manually: `DROP TABLE IF EXISTS {table_name} CASCADE;`
2. Let GORM recreate it via AutoMigrate
3. Or: Set `DROP_ALL_TABLES=true` in development

---

### "API hangs during startup" (Migration Loop)

**Cause**: Database connection issue or deadlock

**Fix**:
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Check logs: `docker logs gims-platform-api`
3. Verify database credentials in `.env`
4. Check for circular foreign key dependencies

---

### Table created but columns missing

**Cause**: GORM tags incorrect or model not updated in code

**Fix**:
1. Verify GORM tags in model struct
2. Run `go mod tidy`
3. Restart API to trigger re-migration
4. GORM only ADDS columns, never removes (safe)

---

## 📚 Related Documentation

- **Sprint Planning**: `docs/erp-sprint-planning.md` - Feature requirements and table relations
- **API Standards**: `docs/api-standart/README.md` - Response format, error codes
- **Copilot Instructions**: `.github/copilot-instructions.md` - Development workflow
- **Feature Docs**: `docs/features/` - Per-feature documentation

---

## 🔗 References

- [GORM AutoMigrate Documentation](https://gorm.io/docs/migration.html)
- [GORM Tags Reference](https://gorm.io/docs/models.html#Tags)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)

---

## 📝 Changelog

- **2026-02-06**: Initial version created after resolving EmployeeContract migration issue
- Added comprehensive checklist and troubleshooting guide
- Documented production safety features

---

_This document is the single source of truth for database migrations in the GIMS platform. All contributors must follow these guidelines when adding new database models._
