# GIMS Platform - AI Coding Agent Instructions

## Project Overview
GIMS (GILABS Integrated Management System) is an enterprise ERP monorepo using Turborepo with:
- **Backend**: Go 1.25+ / Gin / GORM / PostgreSQL (`apps/api/`)
- **Frontend**: Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn/ui (`apps/web/`)

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
- Pagination: max `per_page` = 100 (enforced)
- Error codes: Use patterns from `docs/api-standart/api-error-codes.md`

### Frontend Component Rules
1. **NEVER** put business logic in components - extract to hooks
2. **ALWAYS** use optional chaining (`?.`) and nullish coalescing (`??`)
3. **ALWAYS** handle loading/error/empty states from TanStack Query
4. **ALWAYS** add `cursor-pointer` to clickable elements
5. Use `PageMotion` from `framer-motion` for page transitions

### Backend Security (Non-negotiable)
- JWT stored in HttpOnly cookies (not response body)
- CSRF: Double-Submit Cookie pattern required
- Rate limiting: Redis-backed on all public endpoints
- Row-level locking for concurrent updates (`FOR UPDATE`)
- Always validate ownership before resource access (IDOR prevention)

## Development Commands
```bash
pnpm dev                    # Run all apps
pnpm dev --filter=web       # Frontend only (localhost:3000)
pnpm dev --filter=api       # Backend via Docker (localhost:8080)
pnpm build                  # Build all
pnpm lint && pnpm type-check
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
4. Update Postman collection: `docs/postman/postman.json`

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
- API Standards: `docs/api-standart/README.md`
- Sprint Planning: `docs/erp-sprint-planning.md`
- Template Structure: `TEMPLATE_STRUCTURE.md`
- Security Rules: `.cursor/rules/security.mdc`
- Project Standards: `.cursor/rules/standart.mdc`

## TypeScript/Styling Rules
- **NEVER** use `any` type - use `unknown` with type guards
- **NEVER** use arbitrary Tailwind values (`bg-[#e53e3e]`, `mt-[13px]`)
- Use semantic tokens from `tailwind.config.js` only
- Kebab-case directories, PascalCase components, camelCase functions
