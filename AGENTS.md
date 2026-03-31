# AGENTS.md - GIMS Platform Developer Guide

## Build, Test & Lint Commands

### Root (Turborepo)

use npx to use pnpm, like 'npx pnpm type-check'

```bash
pnpm dev                    # Run all apps
pnpm dev:web               # Frontend only (localhost:3000)
pnpm dev:api               # Backend via Docker (localhost:8080)
pnpm build                 # Build all
pnpm lint                  # Lint all
pnpm type-check            # TypeScript check all
pnpm test                  # Run all tests
pnpm format                # Format with Prettier
```

### Backend (Go)

```bash
cd apps/api
go run ./cmd/api/main.go              # Run server
pnpm dev                             # Run with DROP_ALL_TABLES=true
go build -o bin/server ./cmd/api/main.go
go test ./...                        # Run all tests
go test ./internal/hrd/...           # Run package tests
go test -run TestEmployeeContract    # Run single test
go test ./internal/hrd/domain/usecase -v -run TestEmployeeContract
golangci-lint run
go vet ./...
go fmt ./...
```

### Frontend (Next.js)

```bash
cd apps/web
pnpm dev                             # Dev server
pnpm build                           # Production build
pnpm lint                            # ESLint
pnpm check-types                     # TypeScript check
```

## Go Code Style

### Imports (CRITICAL)

```go
// ✅ CORRECT - Full module path
import "github.com/gilabs/gims/api/internal/hrd/data/models"

// ❌ WRONG - Relative imports fail
import "internal/hrd/data/models"
```

**Order:** Standard lib → External → Internal (full path)

**After new files:** Run `go mod tidy` in `apps/api/`

### Naming

- Files: `snake_case.go`
- Types: `PascalCase`
- Interfaces: `Repository`, `Usecase`
- Variables: `camelCase`

### Error Handling

```go
if err != nil {
    return nil, fmt.Errorf("failed to create employee: %w", err)
}
```

### Timezone & `apptime` (CRITICAL)

**NEVER use bare `time.Now()` in business logic.** Always use the `apptime` package.

```go
// ❌ WRONG — timezone depends on OS/container
now := time.Now()

// ✅ CORRECT — uses configured application timezone
now := apptime.Now()

// ✅ CORRECT — per-employee timezone (HRD module)
now := apptime.NowForEmployee(employeeID)
loc := apptime.LocationForEmployee(employeeID)

// ✅ CORRECT — per-company timezone
now := apptime.NowForCompany(companyID)
```

**Rules:**

- Import: `"github.com/gilabs/gims/api/internal/core/apptime"`
- Global helpers: `Now()`, `Today()`, `StartOfMonth()`, `Location()`
- Per-company: `NowForCompany()`, `LocationForCompany()`, `TodayForCompany()`
- Per-employee: `NowForEmployee()`, `LocationForEmployee()`, `TodayForEmployee()`, `StartOfMonthForEmployee()`
- HRD module **must** use per-employee/company functions for attendance, leave, overtime
- Holiday queries **must** use company-scoped methods: `IsHolidayForCompany()`, `FindByDateRangeForCompany()`
- DB timestamp columns in HRD use `timestamptz` (not `timestamp`)
- DSN includes `TimeZone=UTC` for consistent storage
- Company model has `Timezone` field (IANA string, default `Asia/Jakarta`)
- Holiday model has `CompanyID` (nullable UUID): NULL = global, non-NULL = company-specific
- Docs: `docs/features/core/apptime-timezone-support.md`

### Architecture (Vertical Slice)

```
internal/<domain>/
├── data/models/         # GORM entities
├── data/repositories/   # Data access
├── domain/dto/          # Request/Response DTOs
├── domain/mapper/       # Model ↔ DTO
├── domain/usecase/      # Business logic
└── presentation/
    ├── handler/         # HTTP handlers
    ├── router/          # Routes
    └── routers.go       # Aggregator
```

## TypeScript/React Code Style

### Imports

```typescript
// React first
import { useState } from "react";
// Third-party
import { useTranslations } from "next-intl";
// Internal absolute
import { Button } from "@/components/ui/button";
// Internal relative (same feature only)
import { EmployeeForm } from "./employee-form";
```

### Naming

- Files: `kebab-case.tsx`, `camelCase.ts`
- Components: `PascalCase`
- Hooks: `useCamelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Component Structure

```
features/<feature>/
├── types/           # .d.ts declarations
├── schemas/         # Zod validation
├── stores/          # Zustand state (STATE ONLY)
├── hooks/           # Business logic (ALL LOGIC)
├── services/        # API calls
└── components/      # UI (NO logic)
```

### Error Handling

````typescript
try {
  await createEmployee.mutateAsync(data);
  toast.success(t("createSuccess"));
} catch (error) {
  toast.error(t("createError"));
}

## Critical Rules

### Security

- JWT in HttpOnly cookies
- CSRF: Double-Submit Cookie
- Rate limiting on sensitive endpoints
- IDOR prevention: Validate ownership
- Row-level locking (`FOR UPDATE`)

### API Response

```json
{
  "success": true,
  "data": {},
  "meta": { "pagination": {...} },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123"
}
```

### Performance

- Pagination: Max 100 per_page
- Context timeouts: 30s
- Use `Preload()` for relationships
- GIN indexes for text search

### Database

**CRITICAL:** After new model, register in:
`apps/api/internal/core/infrastructure/database/migrate.go`

```go
import <domain> "github.com/gilabs/gims/api/internal/<domain>/data/models"

// In migrateWithErrorHandling():
&<domain>.<ModelName>{},
```

### TypeScript

- **NEVER** use `any` - use `unknown`
- Always define return types
- Strict null checks

### Internationalization (i18n)

**File Locations:**

- Feature-specific: `features/<feature>/i18n/{en.ts, id.ts}`
- Global: `src/i18n/messages/{en.json, id.json}`

**Translation Keys:**

```typescript
// Use nested structure
const t = useTranslations("financeAssets");
t("detail.tabs.overview");
t("actions.edit");

// Common translations
const tCommon = useTranslations("common");
tCommon("systemInfo");
tCommon("description");
```

**Adding New Keys:**

1. Add to both `en.ts` AND `id.ts` (or `en.json` AND `id.json`)
2. Use consistent naming convention
3. Group related keys together

**Common Keys in messages/en.json:**

```json
{
  "common": {
    "systemInfo": "System Information",
    "description": "Description",
    "amount": "Amount",
    "match": "Match"
  }
}
```

**Preventing Missing Translation Errors:**

- Check browser console for `IntlError: MISSING_MESSAGE`
- Always add keys to both language files
- Use `tCommon` for shared/common translations
- Test both EN and ID locales

### Tailwind CSS

- **NEVER** use arbitrary values
- Use semantic tokens only
- Mobile-first design

## Documentation

Update Postman: `docs\postman\postman.json`
Create: `docs/features/{features folder name}/{feature-name}.md`

### Documentation Standard Format

Follow the structure from `hrd-attendance.md` for consistency:

**Header Metadata:**

```markdown
> **Module:** [Module Name]
> **Sprint:** [Sprint Number]
> **Version:** [X.Y.Z]
> **Status:** [Complete/In Progress/Planned]
> **Last Updated:** [Month Year]
```

**Required Sections:**

1. **Table of Contents** - Auto-generated links to sections
2. **Overview** - Module description + Key Features table
3. **Features** - Detailed feature breakdown with tables
4. **System Architecture** - Backend/Frontend structure tree
5. **Data Models** - Tables with field names, types, descriptions
6. **Business Logic** - Rules, formulas, calculations
7. **API Reference** - Endpoint tables (Method, Path, Permission, Description)
8. **Frontend Components** - Component tables (Name, File, Description)
9. **User Flows** - Mermaid sequence diagrams
10. **Permissions** - Permission table (Name, Description)
11. **Integration Points** - Integration with other modules
12. **Testing Strategy** - Unit/Integration/E2E test locations
13. **Keputusan Teknis** - Technical decisions with trade-offs (Rationale + Trade-off format)
14. **Notes & Improvements** - Completed features, planned improvements, known limitations
15. **Appendix** - Error codes, database indexes

**Formatting Guidelines:**

- Use **English** for all content (except Indonesian business terms like PKWTT, PKWT)
- Use **tables** for structured data (features, API endpoints, fields, components)
- Include **Mermaid diagrams** for user flows
- Follow **Keputusan Teknis** format: Decision → Alasan → Trade-off
- Maintain consistent indentation (2 spaces for code, 4 for YAML/JSON)

## Quick Reference

| Task               | Command                               |
| ------------------ | ------------------------------------- |
| Run single Go test | `go test -run TestName ./package/...` |
| Run dev            | `pnpm dev`                            |
| Lint               | `pnpm lint`                           |
| Type check         | `pnpm type-check`                     |
| Format             | `pnpm format`                         |
| Build              | `pnpm build`                          |

## Resources

- Security: `.cursor/rules/security.mdc`
- Standards: `.cursor/rules/standart.mdc`
- Copilot: `.github/copilot-instructions.md`
- API Standards: `docs/api-standart/README.md`
- Timezone/apptime: `docs/features/core/apptime-timezone-support.md`
````
