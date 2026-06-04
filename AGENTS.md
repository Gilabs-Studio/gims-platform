# GIMS Platform Knowledge Base

**Generated:** 2026-04-19
**Stack:** Go 1.25+ (Gin/GORM) + Next.js 16 (React 19/Tailwind v4)
**Monorepo:** Turborepo + pnpm workspaces

## Structure

```
gims/
├── apps/
│   ├── api/          # Go backend — see apps/api/AGENTS.md
│   └── web/          # Next.js frontend — see apps/web/AGENTS.md
├── packages/         # Shared configs (eslint, typescript)
└── docs/             # Feature docs, Postman, sprint planning
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add backend domain | `apps/api/internal/<domain>/` | Vertical slice: models → repo → dto → mapper → usecase → handler → router |
| Add frontend feature | `apps/web/src/features/<feature>/` | types → schemas → services → hooks → components |
| Register new model | `apps/api/internal/core/infrastructure/database/migrate.go` | Required after any new GORM model |
| Register i18n keys | `apps/web/src/i18n/request.ts` | Merge feature translations into messages object |
| API docs | `docs/postman/postman.json` | Update after new endpoints |
| Sprint tasks | `docs/erp-sprint-planning.md` | Mark `[x]` when done |

## Critical Cross-Cutting Rules

### Timezone (NEVER use bare `time.Now()`)

```go
import "github.com/gilabs/gims/api/internal/core/apptime"

now := apptime.Now()                        // Global
now := apptime.NowForCompany(companyID)     // Per-company
now := apptime.NowForEmployee(employeeID)   // Per-employee (HRD only)
```

- HRD timestamps: `timestamptz` in DB, DSN has `TimeZone=UTC`
- Company model: `Timezone` field (IANA, default `Asia/Jakarta`)

### Go Imports (CRITICAL)

Always use **full module path**, never relative:

```go
// ✅ CORRECT
import "github.com/gilabs/gims/api/internal/hrd/data/models"

// ❌ WRONG — will fail
import "internal/hrd/data/models"
```

Order: stdlib → external → internal. Run `go mod tidy` after new files.

### Security Baseline

- JWT: HttpOnly cookies, split access/refresh secrets
- CSRF: Double-Submit Cookie (`X-CSRF-Token` header)
- Rate limiting: Redis-backed on public endpoints
- IDOR: Validate ownership before resource access
- Row-level locking: `FOR UPDATE` for concurrent mutations

## Commands

use 'npx' to run 'pnpm'

```bash
# Root
pnpm dev                  # All apps
pnpm dev --filter=web     # Frontend only (localhost:3000)
pnpm dev --filter=api     # Backend via Docker (localhost:8080)
pnpm dev:db               # Start DB via Docker (Postgres + Redis)
pnpm dev:local            # Backend via Air hot reload (recommended for daily dev)
pnpm build && pnpm lint && pnpm type-check

# Backend (cd apps/api)
air                       # Hot reload (or: make dev). Requires: docker compose up -d postgres redis
go run ./cmd/api/main.go  # Without hot reload
go test ./...
go mod tidy

# Frontend (cd apps/web)
pnpm dev
pnpm build
pnpm lint
pnpm check-types

# k6 Performance & Security Testing (root)
pnpm k6:seed              # Seed test data via k6
pnpm k6:seed:dry          # Dry-run seed (no writes)
pnpm k6:smoke             # Smoke test (local)
pnpm k6:smoke:staging     # Smoke test (staging)
pnpm k6:smoke:prod        # Smoke test (production)
pnpm k6:load              # Load test
pnpm k6:load:staging      # Load test (staging)
pnpm k6:stress            # Stress test
pnpm k6:spike             # Spike test
pnpm k6:soak              # Soak test
pnpm k6:breakpoint        # Breakpoint test
pnpm k6:security          # Security negative tests
pnpm k6:concurrency       # Domain concurrency tests
pnpm k6:browser           # Browser-based dashboard test
pnpm k6:profiler          # Endpoint profiler (JSON report)
pnpm k6:profiler:local    # Profiler with relaxed thresholds
pnpm k6:analyze           # Analyze profiler report
pnpm k6:validate          # Validate all k6 test scripts
```

## Child Knowledge Bases

- [`apps/api/AGENTS.md`](apps/api/AGENTS.md) — Backend architecture & conventions
- [`apps/web/AGENTS.md`](apps/web/AGENTS.md) — Frontend patterns & performance
- [`apps/api/internal/finance/AGENTS.md`](apps/api/internal/finance/AGENTS.md) — Finance domain
- [`apps/api/internal/hrd/AGENTS.md`](apps/api/internal/hrd/AGENTS.md) — HRD domain (attendance, leave, timezone)
- [`apps/web/src/features/master-data/AGENTS.md`](apps/web/src/features/master-data/AGENTS.md) — Master data frontend

## Resources

- API Standards: `docs/api-standart/README.md`
- Security: `.cursor/rules/security.mdc`
- Standards: `.cursor/rules/standart.mdc`
- Timezone deep-dive: `docs/features/core/apptime-timezone-support.md`
- k6 CI/Release Gates: `k6/docs/CI_RELEASE_GATES.md`
