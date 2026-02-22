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

```typescript
try {
  await createEmployee.mutateAsync(data);
  toast.success(t("createSuccess"));
} catch (error) {
  toast.error(t("createError"));
}
```

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

### Tailwind CSS

- **NEVER** use arbitrary values
- Use semantic tokens only
- Mobile-first design

## Documentation

update the postman: `docs\postman\postman.json`
Create: `docs/features/{features folder name}/{feature-name}.md`

Required:

1. Ringkasan Fitur
2. Fitur Utama
3. Business Rules
4. Keputusan Teknis
5. API Endpoints (table)
6. Cara Test Manual

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
