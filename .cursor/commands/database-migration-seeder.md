---
description: Database Migration & Seeder Workflow - Models and Seed Data Management
globs: apps/api/**/*
alwaysApply: false
---

# Database Migration & Seeder Workflow

## Purpose

Add new database models and seed data following GIMS conventions and avoiding common pitfalls.

## When to Use

- Adding new entities (tables)
- Modifying existing schema
- Creating seed data for development/testing
- Setting up initial data

## Time Estimate

- Simple model: 10-15 mins
- Model with relationships: 20-30 mins
- Complex model with seeders: 30-45 mins

---

## Phase 1: Model Creation (10-15 mins)

### 1.1 Create Model File

**File**: `apps/api/internal/<domain>/data/models/<entity>.go`

```go
package models

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

// <Entity> represents the <entity> table in the database
type <Entity> struct {
    ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`

    // Business fields - add your specific fields here
    Name        string         `gorm:"column:name;type:varchar(100);not null;index"`
    Description *string        `gorm:"column:description;type:text"` // Nullable field uses pointer
    Code        string         `gorm:"column:code;type:varchar(50);uniqueIndex"`
    Status      string         `gorm:"column:status;type:varchar(20);not null;default:'ACTIVE'"`
    Amount      float64        `gorm:"column:amount;type:decimal(15,2);default:0"`

    // Foreign keys - use pointers for nullable relations
    CategoryID  *uuid.UUID     `gorm:"column:category_id;type:uuid;index"`
    Category    *Category      `gorm:"foreignKey:CategoryID"`

    // Audit fields (REQUIRED)
    CreatedAt   time.Time      `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
    UpdatedAt   time.Time      `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
    DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"` // Soft delete
    CreatedBy   uuid.UUID      `gorm:"column:created_by;type:uuid"`
    UpdatedBy   *uuid.UUID     `gorm:"column:updated_by;type:uuid"` // Nullable, use pointer
}

// TableName specifies the table name for <Entity>��
func (<Entity>) TableName() string {
    return "<entities>" // Plural, snake_case
}

// BeforeCreate hook to set timestamps��
func (e *<Entity>) BeforeCreate(tx *gorm.DB) error {
    if e.ID == uuid.Nil {
        e.ID = uuid.New()
    }
    return nil
}
```

### 1.2 Model Requirements Checklist

#### Required Fields

- [ ] `ID` - uuid.UUID with gen_random_uuid() default
- [ ] `CreatedAt` - time.Time
- [ ] `UpdatedAt` - time.Time
- [ ] `DeletedAt` - gorm.DeletedAt (soft delete)
- [ ] `CreatedBy` - uuid.UUID
- [ ] `UpdatedBy` - \*uuid.UUID (pointer for nullable)

#### GORM Tags

- [ ] `type:uuid` for UUID fields
- [ ] `primaryKey` for ID
- [ ] `column:name` for all fields (snake_case)
- [ ] `not null` for required fields
- [ ] `index` for searchable/filterable fields
- [ ] `uniqueIndex` for unique fields
- [ ] `default:value` for default values

#### Relationships

- [ ] Foreign keys use pointers (\*uuid.UUID) for nullable
- [ ] `foreignKey` tag for relations
- [ ] Preload consideration for performance

### 1.3 CRITICAL: Register in Migrate.go

**File**: `apps/api/internal/core/infrastructure/database/migrate.go`

```go
package database

import (
    // ... other imports

    // Import domain models with full module path
    "github.com/gilabs/gims/api/internal/hrd/data/models" as hrdModels
    "github.com/gilabs/gims/api/internal/sales/data/models" as salesModels
    "github.com/gilabs/gims/api/internal/product/data/models" as productModels
)

func AutoMigrate() error {
    return migrateWithErrorHandling(
        // Geographic domain
        &models.Province{},
        &models.City{},
        &models.District{},
        &models.SubDistrict{},

        // Organization domain
        &models.Company{},
        &models.Branch{},
        &models.Department{},

        // HRD domain
        &hrdModels.Employee{},
        &hrdModels.EmployeeContract{}, // <-- ADD HERE
        &hrdModels.AttendanceRecord{},
        &hrdModels.LeaveRequest{},

        // Sales domain
        &salesModels.Customer{},
        &salesModels.SalesQuotation{},

        // Product domain
        &productModels.Product{},
        &productModels.ProductCategory{},

        // Add your new model here with comment indicating feature
    )
}
```

**⚠️ CRITICAL RULES:**

1. Must add to `migrateWithErrorHandling()` function
2. Use full import path: `github.com/gilabs/gims/api/internal/domain/data/models`
3. Group with related models by domain
4. Add comment indicating feature/sprint

---

## Phase 2: Verification (5 mins)

### 2.1 Build Check

```bash
cd apps/api

# Run go mod tidy
go mod tidy

# Build to verify no errors
go build ./...

# Check for import errors
go vet ./...
```

### 2.2 Database Migration

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start API (will auto-migrate)
npx pnpm dev --filter=api

# Check logs for migration errors
```

### 2.3 Verify Table Creation

```bash
# Connect to database
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db

# List tables
\dt

# Describe table structure
\d entities

# Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'entities';
```

---

## Phase 3: Seeder Creation (15-20 mins)

### 3.1 Create Seeder File

**File**: `apps/api/seeders/<entity>_seeder.go`

```go
package seeders

import (
    "log"

    "github.com/google/uuid"
    "gorm.io/gorm"
    "github.com/gilabs/gims/api/internal/<domain>/data/models"
)

// <Entity>Seeder seeds <entity> data
type <Entity>Seeder struct {
    db *gorm.DB
}

// New<Entity>Seeder creates a new seeder instance
func New<Entity>Seeder(db *gorm.DB) *EntitySeeder {
    return &EntitySeeder{db: db}
}

// Seed implements the seeder interface
func (s *<Entity>Seeder) Seed() error {
    log.Println("Seeding <Entities>...")

    // Check if already seeded
    var count int64
    s.db.Model(&models.<Entity>{}).Count(&count)
    if count > 0 {
        log.Println("Entities already seeded, skipping...")
        return nil
    }

    entities := s.getEntities()

    for _, entity := range entities {
        if err := s.db.Create(&entity).Error; err != nil {
            log.Printf("Error seeding entity %s: %v", entity.Name, err)
            return err
        }
    }

    log.Printf("Successfully seeded %d entities", len(entities))
    return nil
}

// getEntities returns the seed data
func (s *<Entity>Seeder) getEntities() []models.<Entity> {
    // Get reference IDs from constants
    adminID := AdminEmployeeID // From constants.go

    return []models.<Entity>{
        {
            ID:          uuid.MustParse("ae000001-0000-0000-0000-000000000001"),
            Name:        "Primary Entity",
            Description: strPtr("This is the primary entity"),
            Code:        "ENT001",
            Status:      "ACTIVE",
            Amount:      1000.00,
            CreatedBy:   adminID,
            UpdatedBy:   &adminID, // Must use pointer variable
        },
        {
            ID:          uuid.MustParse("ae000002-0000-0000-0000-000000000002"),
            Name:        "Secondary Entity",
            Description: nil, // Nullable field
            Code:        "ENT002",
            Status:      "INACTIVE",
            Amount:      500.00,
            CreatedBy:   adminID,
            UpdatedBy:   nil, // Nullable
        },
    }
}

// strPtr helper function for string pointers
func strPtr(s string) *string {
    return &s
}
```

### 3.2 CRITICAL: UUID Rules

#### ✅ CORRECT - Hex-only UUIDs

```go
// Only use characters: 0-9, a-f
uuid.MustParse("ae000001-0000-0000-0000-000000000001")
uuid.MustParse("ae000002-0000-0000-0000-000000000002")
uuid.MustParse("bf000003-0000-0000-0000-000000000003")
```

#### ❌ WRONG - Non-hex characters

```go
// DON'T USE letters beyond a-f
uuid.MustParse("rr000001-0000-0000-0000-000000000001") // ❌ r is not hex
uuid.MustParse("gg000001-0000-0000-0000-000000000001") // ❌ g is not hex
```

### 3.3 CRITICAL: Pointer Field Rules

#### ✅ CORRECT - Use Local Variables

```go
adminID := AdminEmployeeID // Create local variable

entity := models.Entity{
    CreatedBy: adminID,        // Value type - OK
    UpdatedBy: &adminID,       // Pointer - must use local variable
}
```

#### ❌ WRONG - Taking Address of Constant

```go
entity := models.Entity{
    CreatedBy: AdminEmployeeID, // OK - value
    UpdatedBy: &AdminEmployeeID, // ❌ CANNOT take address of constant!
}
```

### 3.4 Reference Constants

**File**: `apps/api/seeders/constants.go`

```go
package seeders

import "github.com/google/uuid"

// Admin user ID - Hex-only UUID
var AdminEmployeeID = uuid.MustParse("ae000001-0000-0000-0000-000000000001")

// Other reference IDs
var (
    CompanyID     = uuid.MustParse("ae000010-0000-0000-0000-000000000001")
    DepartmentID  = uuid.MustParse("ae000020-0000-0000-0000-000000000001")
    CategoryID    = uuid.MustParse("ae000030-0000-0000-0000-000000000001")
)
```

---

## Phase 4: Register Seeder (5 mins)

### 4.1 Update SeedAll

**File**: `apps/api/seeders/seed_all.go`

```go
package seeders

import (
    "log"

    "gorm.io/gorm"
)

// SeedAll runs all seeders in the correct order
func SeedAll(db *gorm.DB) error {
    log.Println("Starting database seeding...")

    seeders := []Seeder{
        // Order matters! Seed master data first
        NewCompanySeeder(db),
        NewDepartmentSeeder(db),
        NewEmployeeSeeder(db),

        // Then transactional data
        NewEntitySeeder(db), // <-- ADD HERE
        NewEmployeeContractSeeder(db),
        NewAttendanceSeeder(db),
    }

    for _, seeder := range seeders {
        if err := seeder.Seed(); err != nil {
            log.Printf("Seeding failed: %v", err)
            return err
        }
    }

    log.Println("Database seeding completed successfully!")
    return nil
}
```

### 4.2 Seeder Interface

Ensure your seeder implements the interface:

```go
// Seeder interface for all seeders
type Seeder interface {
    Seed() error
}
```

---

## Phase 5: Run Seeder (5 mins)

### 5.1 Reset and Seed

```bash
# Option 1: Reset database and seed
cd apps/api
go run cmd/seed/main.go

# Option 2: Via API endpoint (if implemented)
curl -X POST http://localhost:8080/api/v1/admin/seed \
  -H "Authorization: Bearer <token>"

# Option 3: Manual SQL insert
# Use seeders for consistency
```

### 5.2 Verify Seeded Data

```bash
# Connect to database
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db

# Check data
SELECT id, name, code, status FROM entities;

# Count records
SELECT COUNT(*) FROM entities;

# Check specific record
SELECT * FROM entities WHERE id = 'ae000001-0000-0000-0000-000000000001'::uuid;
```

---

## Phase 6: Common Pitfalls and Solutions

### 6.1 Migration Not Running

**Problem**: Table not created after adding model

**Solution**:

```bash
# 1. Check if model registered in migrate.go
grep -r "YourModel" apps/api/internal/core/infrastructure/database/

# 2. Verify no build errors
cd apps/api && go build ./...

# 3. Check API logs for migration errors
# Look for: "AutoMigrate failed"

# 4. Manual migration check
SELECT * FROM information_schema.tables WHERE table_name = 'your_table';
```

### 6.2 Seeder Fails

**Problem**: Seeder fails with constraint error

**Common Causes**:

1. **Foreign key violation**: Reference data doesn't exist

   ```go
   // Seed order matters - parent tables first
   // Company → Department → Employee → EmployeeContract
   ```

2. **Duplicate key**: UUID already exists

   ```go
   // Check for duplicates in seed data
   // Ensure check logic: s.db.Model(&models.Entity{}).Count(&count)
   ```

3. **Invalid UUID format**: Non-hex characters

   ```bash
   # Validate all UUIDs are hex-only
   grep -E "uuid\.MustParse.*[g-zG-Z]" apps/api/seeders/*.go
   ```

4. **Pointer address error**: Taking address of constant

   ```go
   // ❌ WRONG
   UpdatedBy: &AdminEmployeeID

   // ✅ CORRECT
   adminID := AdminEmployeeID
   UpdatedBy: &adminID
   ```

### 6.3 GORM Tag Issues

**Problem**: Column not created correctly

**Checklist**:

```go
// ❌ Wrong
Description string `gorm:"nullable"` // Wrong tag

// ✅ Correct
Description *string `gorm:"column:description"` // Nullable uses pointer

// ❌ Wrong
DeletedAt time.Time // Won't support soft delete

// ✅ Correct
DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
```

### 6.4 Foreign Key Issues

**Problem**: Relations not working

```go
// Parent model
type Category struct {
    ID   uuid.UUID
    Name string
}

// Child model
type Product struct {
    ID         uuid.UUID
    Name       string
    CategoryID uuid.UUID `gorm:"index"` // FK column
    Category   Category  // Relation
}

// Or nullable FK
type Product struct {
    ID         uuid.UUID
    Name       string
    CategoryID *uuid.UUID `gorm:"index"` // Nullable FK uses pointer
    Category   *Category  // Pointer for optional relation
}
```

---

## Phase 7: Testing (10 mins)

### 7.1 Model Validation

```bash
# 1. Build check
cd apps/api
go build ./...

# 2. Run tests
go test ./internal/<domain>/data/models/...

# 3. Manual database check
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db -c "\d <table_name>"
```

### 7.2 Seeder Validation

```bash
# 1. Reset database
docker-compose down -v
docker-compose up -d postgres

# 2. Run migrations and seeders
cd apps/api
go run cmd/seed/main.go

# 3. Verify data
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db -c "SELECT COUNT(*) FROM <table>;"
```

---

## Phase 8: Documentation (15 mins)

### 8.1 Create Database Schema Documentation

**Location**: `docs/database/schemas/<domain>_<entity>.md`

````markdown
# <Entity> Database Schema

## Overview

- **Table**: `<table_name>`
- **Domain**: <Domain> (HRD/Sales/Purchase/etc.)
- **Created**: YYYY-MM-DD
- **Version**: 1.0

## Business Context

Why this table exists and what it represents.

## Schema

### Columns

| Column      | Type          | Nullable | Default           | Constraints         | Description           |
| ----------- | ------------- | -------- | ----------------- | ------------------- | --------------------- |
| id          | UUID          | NO       | gen_random_uuid() | PRIMARY KEY         | Unique identifier     |
| name        | VARCHAR(100)  | NO       | -                 | NOT NULL            | Entity name           |
| status      | VARCHAR(20)   | NO       | 'ACTIVE'          | -                   | Current status        |
| amount      | DECIMAL(15,2) | YES      | 0                 | CHECK >= 0          | Monetary amount       |
| category_id | UUID          | YES      | -                 | FK → categories(id) | Parent category       |
| created_at  | TIMESTAMP     | NO       | CURRENT_TIMESTAMP | -                   | Creation timestamp    |
| updated_at  | TIMESTAMP     | NO       | CURRENT_TIMESTAMP | -                   | Update timestamp      |
| deleted_at  | TIMESTAMP     | YES      | NULL              | -                   | Soft delete timestamp |
| created_by  | UUID          | NO       | -                 | FK → users(id)      | Creator user          |
| updated_by  | UUID          | YES      | NULL              | FK → users(id)      | Last updater          |

### Indexes

| Name                       | Type   | Columns    | Purpose             |
| -------------------------- | ------ | ---------- | ------------------- |
| idx\_<entity>\_name        | B-Tree | name       | Fast name lookup    |
| idx\_<entity>\_status      | B-Tree | status     | Status filtering    |
| idx\_<entity>\_created_at  | B-Tree | created_at | Sorting by date     |
| idx\_<entity>\_deleted_at  | B-Tree | deleted_at | Soft delete queries |
| idx\_<entity>\_name_search | GIN    | name       | Full-text search    |

### Constraints

| Name                  | Type        | Columns | Condition                 |
| --------------------- | ----------- | ------- | ------------------------- |
| pk\_<entity>\_id      | PRIMARY KEY | id      | -                         |
| uq\_<entity>\_code    | UNIQUE      | code    | -                         |
| chk\_<entity>\_status | CHECK       | status  | IN ('ACTIVE', 'INACTIVE') |
| chk\_<entity>\_amount | CHECK       | amount  | >= 0                      |

## Relationships

### Foreign Keys

| Column      | References     | On Delete | On Update |
| ----------- | -------------- | --------- | --------- |
| category_id | categories(id) | SET NULL  | CASCADE   |
| created_by  | users(id)      | NO ACTION | CASCADE   |
| updated_by  | users(id)      | SET NULL  | CASCADE   |

### Referenced By

| Table       | Column    | Relationship |
| ----------- | --------- | ------------ |
| order_items | entity_id | One-to-Many  |
| audit_logs  | entity_id | One-to-Many  |

## Triggers

### Auto-Update Timestamp

```sql
CREATE TRIGGER update_<entity>_timestamp
BEFORE UPDATE ON <table_name>
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```
````

## Migrations

### Create Table

**File**: `migrations/20240115_create_<entity>_table.sql`

```sql
CREATE TABLE IF NOT EXISTS <table_name> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,

    CONSTRAINT uq_<entity>_code UNIQUE (code)
);

CREATE INDEX idx_<entity>_name ON <table_name>(name);
CREATE INDEX idx_<entity>_status ON <table_name>(status);
```

### Rollback

```sql
DROP TABLE IF EXISTS <table_name>;
```

## Data

### Seed Data

**File**: `apps/api/seeders/<entity>_seeder.go`

| ID           | Name    | Status | Created By |
| ------------ | ------- | ------ | ---------- |
| ae000001-... | Default | ACTIVE | system     |

## Usage

### Common Queries

#### List Active Entities

```sql
SELECT * FROM <table_name>
WHERE status = 'ACTIVE'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

#### Search by Name

```sql
SELECT * FROM <table_name>
WHERE name ILIKE 'search%'
AND deleted_at IS NULL;
```

#### Get with Relations

```sql
SELECT e.*, c.name as category_name
FROM <table_name> e
LEFT JOIN categories c ON e.category_id = c.id
WHERE e.id = 'uuid'::uuid;
```

## Maintenance

### VACUUM Schedule

- Daily: Auto-vacuum enabled
- Weekly: Full VACUUM ANALYZE

### Index Maintenance

- Weekly: REINDEX if fragmentation > 30%

### Monitoring

- Table size growth
- Index usage stats
- Query performance

## Change Log

| Date       | Version | Changes                 | Author  |
| ---------- | ------- | ----------------------- | ------- |
| 2024-01-15 | 1.0     | Initial schema          | @author |
| 2024-01-20 | 1.1     | Added name_search index | @author |

````

### 8.2 Update Entity Relationship Diagram
**File**: `docs/erp-database-relations.mmd`

Add to Mermaid diagram:
```mermaid
erDiagram
    ENTITY ||--o{ ORDER_ITEM : contains
    ENTITY {
        uuid id PK
        string name
        string status
        decimal amount
        uuid category_id FK
        timestamp created_at
        timestamp deleted_at
    }
````

### 8.3 Document Migration Script

**Location**: `docs/database/migrations/MIGRATION-XXX.md`

````markdown
# Migration: Add <Entity> Table

## Migration ID

MIGRATION-XXX

## Date

YYYY-MM-DD

## Author

@developer-name

## Description

Create <entity> table to store <description>.

## Changes

- Create table <table_name>
- Add indexes for performance
- Add foreign key constraints

## SQL

### Up

```sql
CREATE TABLE IF NOT EXISTS <table_name> (...);
```
````

### Down

```sql
DROP TABLE IF EXISTS <table_name>;
```

## Impact

- **Downtime Required**: No
- **Data Migration**: No
- **Rollback**: Simple (DROP TABLE)

## Verification

```sql
-- Verify table exists
SELECT * FROM information_schema.tables
WHERE table_name = '<table_name>';

-- Verify indexes
SELECT * FROM pg_indexes
WHERE tablename = '<table_name>';
```

## Related

- PR: #XXX
- Feature: docs/features/<domain>\_<feature>.md

````

### 8.4 Update Feature Documentation

Add database section to feature docs:

```markdown
## Database Schema

### Entity: <TableName>
See: docs/database/schemas/<domain>_<entity>.md

### Key Points
- Soft delete implemented (deleted_at column)
- Indexes on name, status for performance
- Foreign key to categories table
- Audit fields (created_by, updated_by)

### Migration
```bash
# Run migration
cd apps/api
go run cmd/migrate/main.go

# Verify
make db-status
````

````

### 8.5 Document Seeder

**Location**: `docs/database/seeders/<entity>_seeder.md`

```markdown
# <Entity> Seeder

## Purpose
Populate <table_name> with initial/reference data.

## Seed Data

### Default Entities
| ID | Name | Code | Status |
|----|------|------|--------|
| ae000001-... | Default | DEF001 | ACTIVE |

## Running the Seeder
```bash
cd apps/api
go run cmd/seed/main.go
````

## Verification

```sql
SELECT COUNT(*) FROM <table_name>;
-- Expected: 5 rows
```

````

### 8.6 Update API Error Codes

If new error codes added:

**File**: `docs/api-standart/api-error-codes.md`

```markdown
## <Domain> Errors

### <ENTITY>_NOT_FOUND
- **Code**: <ENTITY>_NOT_FOUND
- **Status**: 404
- **Message**: "<Entity> not found"
- **Scenario**: Requested entity ID does not exist

### <ENTITY>_ALREADY_EXISTS
- **Code**: <ENTITY>_ALREADY_EXISTS
- **Status**: 409
- **Message**: "<Entity> with this code already exists"
- **Scenario**: Attempting to create duplicate entity
````

### 8.7 Update Glossary

**File**: `docs/glossary.md`

```markdown
## <Entity>

<Definition of the entity and its role in the system>

### Related Terms

- **<Related Term>**: Definition
```

### 8.8 Documentation Checklist

- [ ] Database schema document created
- [ ] ERD diagram updated
- [ ] Migration documented
- [ ] Seeder documented
- [ ] Feature docs updated with DB section
- [ ] API error codes updated (if needed)
- [ ] Glossary updated (if new terms)
- [ ] Common queries documented
- [ ] Maintenance procedures noted

---

## Complete Checklist

### Model Checklist

- [ ] File created in correct location
- [ ] All required audit fields present
- [ ] ID field with gen_random_uuid() default
- [ ] DeletedAt field for soft delete
- [ ] Proper GORM tags on all fields
- [ ] TableName() method defined
- [ ] Foreign keys use pointers if nullable
- [ ] Indexes defined for searchable fields
- [ ] Registered in migrate.go
- [ ] Full import path used in migrate.go
- [ ] Grouped with related models
- [ ] Comment added indicating feature

### Migration Checklist

- [ ] go mod tidy executed
- [ ] go build ./... passes
- [ ] Database table created
- [ ] Columns match model definition
- [ ] Indexes created
- [ ] Constraints applied
- [ ] No migration errors in logs

### Seeder Checklist

- [ ] Seeder file created
- [ ] Implements Seeder interface
- [ ] UUIDs are hex-only (0-9, a-f)
- [ ] Pointer fields use local variables
- [ ] References constants from constants.go
- [ ] Check logic prevents duplicates
- [ ] Seed order correct (dependencies first)
- [ ] Registered in seed_all.go
- [ ] Seeder runs without errors
- [ ] Data verified in database

### Documentation Checklist

- [ ] Model documented with comments
- [ ] Business rules noted
- [ ] Relationships explained
- [ ] Migration notes added

---

## Example: Complete Implementation

### 1. Model

**File**: `apps/api/internal/hrd/data/models/employee_contract.go`

```go
package models

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type EmployeeContract struct {
    ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ContractNumber string         `gorm:"column:contract_number;type:varchar(50);not null;uniqueIndex"`
    EmployeeID     uuid.UUID      `gorm:"column:employee_id;type:uuid;not null;index"`
    Employee       Employee       `gorm:"foreignKey:EmployeeID"`
    StartDate      time.Time      `gorm:"column:start_date;not null"`
    EndDate        *time.Time     `gorm:"column:end_date"` // Nullable
    ContractType   string         `gorm:"column:contract_type;type:varchar(20);not null"`
    Salary         float64        `gorm:"column:salary;type:decimal(15,2);not null;default:0"`
    Status         string         `gorm:"column:status;type:varchar(20);not null;default:'ACTIVE'"`
    Notes          *string        `gorm:"column:notes;type:text"`
    CreatedAt      time.Time      `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP"`
    UpdatedAt      time.Time      `gorm:"column:updated_at;not null;default:CURRENT_TIMESTAMP"`
    DeletedAt      gorm.DeletedAt `gorm:"column:deleted_at;index"`
    CreatedBy      uuid.UUID      `gorm:"column:created_by;type:uuid"`
    UpdatedBy      *uuid.UUID     `gorm:"column:updated_by;type:uuid"`
}

func (EmployeeContract) TableName() string {
    return "employee_contracts"
}
```

### 2. Migration Registration

**File**: `apps/api/internal/core/infrastructure/database/migrate.go`

```go
import hrd "github.com/gilabs/gims/api/internal/hrd/data/models"

func AutoMigrate() error {
    return migrateWithErrorHandling(
        // ... other models ...

        // Sprint 14 - Employee Documents
        &hrd.EmployeeContract{},
    )
}
```

### 3. Seeder

**File**: `apps/api/seeders/employee_contract_seeder.go`

```go
package seeders

import (
    "log"
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
    "github.com/gilabs/gims/api/internal/hrd/data/models"
)

type EmployeeContractSeeder struct {
    db *gorm.DB
}

func NewEmployeeContractSeeder(db *gorm.DB) *EmployeeContractSeeder {
    return &EmployeeContractSeeder{db: db}
}

func (s *EmployeeContractSeeder) Seed() error {
    log.Println("Seeding Employee Contracts...")

    var count int64
    s.db.Model(&models.EmployeeContract{}).Count(&count)
    if count > 0 {
        log.Println("Employee contracts already seeded, skipping...")
        return nil
    }

    // Use local variable for pointer
    adminID := AdminEmployeeID

    contracts := []models.EmployeeContract{
        {
            ID:             uuid.MustParse("ae001001-0000-0000-0000-000000000001"),
            ContractNumber: "CTR-2024-001",
            EmployeeID:     EmployeeID, // From constants
            StartDate:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
            EndDate:        nil, // Permanent
            ContractType:   "PERMANENT",
            Salary:         5000000.00,
            Status:         "ACTIVE",
            Notes:          strPtr("First contract"),
            CreatedBy:      adminID,
            UpdatedBy:      &adminID, // Use pointer to local variable
        },
        {
            ID:             uuid.MustParse("ae001002-0000-0000-0000-000000000002"),
            ContractNumber: "CTR-2024-002",
            EmployeeID:     uuid.MustParse("ae000002-0000-0000-0000-000000000002"),
            StartDate:      time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
            EndDate:        &[]time.Time{time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)}[0],
            ContractType:   "CONTRACT",
            Salary:         3000000.00,
            Status:         "ACTIVE",
            Notes:          nil,
            CreatedBy:      adminID,
            UpdatedBy:      nil,
        },
    }

    for _, contract := range contracts {
        if err := s.db.Create(&contract).Error; err != nil {
            log.Printf("Error seeding contract %s: %v", contract.ContractNumber, err)
            return err
        }
    }

    log.Printf("Successfully seeded %d employee contracts", len(contracts))
    return nil
}

func strPtr(s string) *string {
    return &s
}
```

### 4. Registration

**File**: `apps/api/seeders/seed_all.go`

```go
seeders := []Seeder{
    NewCompanySeeder(db),
    NewDepartmentSeeder(db),
    NewEmployeeSeeder(db),
    NewEmployeeContractSeeder(db), // After employees
    // ...
}
```

---

## Quick Reference Commands

```bash
# Check migration status
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db -c "\dt"

# Describe table
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db -c "\d table_name"

# Check seeded data
docker exec -it gims-platform-postgres-1 psql -U postgres -d gims_db -c "SELECT * FROM table_name LIMIT 5;"

# Reset database
docker-compose down -v
docker-compose up -d postgres

# Run seeder
cd apps/api && go run cmd/seed/main.go

# Verify UUID format (should be empty)
grep -r "uuid.MustParse.*[g-zG-Z]" apps/api/seeders/

# Check for pointer address issues
grep -r "&[A-Z]" apps/api/seeders/*.go | grep -v "func\|return\|//"
```

Ready to manage database migrations and seeders safely!
