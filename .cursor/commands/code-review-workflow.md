---
description: Code Review Workflow - Quality Assurance and Standards Compliance
globs: apps/**/*
alwaysApply: false
---

# Code Review Workflow

## Purpose

Systematically review code for quality, standards compliance, and best practices.

## When to Use

- Before merging pull requests
- Reviewing your own code before commit
- Pair programming sessions
- Mentoring junior developers

## Time Estimate

- Small PR (1-2 files): 15-20 mins
- Medium PR (3-5 files): 30-45 mins
- Large PR (5+ files): 45-60+ mins

---

## Phase 1: Overview (5 mins)

### 1.1 Understand the Change

- [ ] Read PR description
- [ ] Check linked issue/ticket
- [ ] Understand business requirement
- [ ] Identify affected domains
- [ ] Note database changes

### 1.2 Check Scope

- [ ] Files changed
- [ ] Lines added/removed
- [ ] New dependencies added?
- [ ] Breaking changes?

```bash
# Quick overview
git diff --stat HEAD~1
```

---

## Phase 2: Backend Review (15-20 mins)

### 2.1 Architecture Review

#### Vertical Slice Pattern

- [ ] Domain folder structure correct?
- [ ] Layers properly separated?
  - data/ (models, repositories)
  - domain/ (dto, mapper, usecase)
  - presentation/ (handler, router)
- [ ] No business logic in handlers?
- [ ] Repository uses interface?
- [ ] Dependencies injected?

#### File Locations

```
apps/api/internal/<domain>/
├── data/
│   ├── models/<entity>.go              ✅
│   └── repositories/
│       ├── <entity>_repository.go      ✅
│       └── <entity>_repository_impl.go ✅
├── domain/
│   ├── dto/<entity>_dto.go              ✅
│   ├── mapper/<entity>_mapper.go        ✅
│   └── usecase/
│       ├── <entity>_usecase.go          ✅
│       └── <entity>_usecase_impl.go    ✅
└── presentation/
    ├── handler/<entity>_handler.go      ✅
    └── router/<entity>_router.go        ✅
```

### 2.2 Code Quality

#### Imports

- [ ] Using full module path?

  ```go
  // ✅ Correct
  "github.com/gilabs/gims/api/internal/hrd/data/models"

  // ❌ Incorrect
  "internal/hrd/data/models"
  ```

- [ ] Import order: Standard → External → Internal?
- [ ] No unused imports?

#### Naming

- [ ] PascalCase for exported types/functions
- [ ] camelCase for unexported
- [ ] Descriptive names (not `data`, `item`, `temp`)
- [ ] Interface names end with interface type:
  ```go
  type EntityRepository interface {}  // ✅
  type IEntityRepository interface {} // ❌
  ```

#### Error Handling

- [ ] Errors wrapped with context?
- [ ] Proper HTTP status codes?
- [ ] Error codes from api-error-codes.md?
- [ ] No panic() in production code

### 2.3 Database & Models

#### Model Requirements

- [ ] All required GORM fields present?
  ```go
  ID        uuid.UUID      `gorm:"type:uuid;primaryKey;..."`
  CreatedAt time.Time      `gorm:"column:created_at;..."`
  UpdatedAt time.Time      `gorm:"column:updated_at;..."`
  DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"` // Soft delete
  CreatedBy uuid.UUID      `gorm:"column:created_by;..."`
  UpdatedBy *uuid.UUID     `gorm:"column:updated_by;..."`   // Pointer for nullable
  ```
- [ ] Registered in migrate.go?
- [ ] TableName() method defined?
- [ ] Proper column tags?
- [ ] Indexes defined for searchable fields?

#### Repository

- [ ] Interface defined separately?
- [ ] Implementation uses Preload() for relations?
- [ ] Pagination implemented (max 100)?
- [ ] Context with timeout (30s)?
- [ ] FOR UPDATE for concurrent updates?
- [ ] No raw SQL concatenation (SQL injection risk)?

### 2.4 API & DTOs

#### DTO Structure

- [ ] Separate request/response DTOs?
- [ ] Validation tags present?
  ```go
  Name string `json:"name" binding:"required,min=3,max=100"`
  ```
- [ ] Proper Go types (uuid.UUID, not string for IDs)?
- [ ] Nullable fields use pointers?

#### API Standards

- [ ] Response format matches standard?
  ```json
  {
    "success": true,
    "data": {},
    "meta": { "pagination": {...} },
    "timestamp": "...",
    "request_id": "..."
  }
  ```
- [ ] Pagination enforced (max 100)?
- [ ] Error response format correct?
- [ ] Routes follow REST conventions?

### 2.5 Security

#### Critical Checks

- [ ] **IDOR Prevention**: Ownership validated?
  ```go
  // ✅ Check ownership before operation
  if entity.CreatedBy != userID {
      return errors.New("unauthorized")
  }
  ```
- [ ] **Input Validation**: All inputs validated via DTOs?
- [ ] **SQL Injection**: Using GORM properly?
- [ ] **CSRF**: Token validation where needed?
- [ ] **Authorization**: Permission checks present?

### 2.6 Performance

- [ ] N+1 query problems avoided?
- [ ] GIN indexes for text search?
- [ ] Pagination implemented?
- [ ] Context timeouts set?
- [ ] No memory leaks?

### 2.7 Testing

- [ ] Unit tests for usecases?
- [ ] Repository tests with mocks?
- [ ] Handler tests?
- [ ] BDD naming convention?
  ```go
  func TestEntity_ShouldReturnError_WhenNotFound(t *testing.T) {}
  ```

---

## Phase 3: Frontend Review (15-20 mins)

### 3.1 Architecture Review

#### Feature Structure

```
apps/web/src/features/<feature>/
├── types/
│   └── index.d.ts          ✅
├── schemas/
│   └── <feature>.schema.ts ✅
├── services/
│   └── <feature>-service.ts ✅
├── hooks/
│   └── use-<feature>.ts   ✅
├── components/
│   ├── <feature>-list.tsx  ✅
│   ├── <feature>-form.tsx  ✅
│   ├── <feature>-detail-modal.tsx ✅
│   └── index.ts            ✅
└── i18n/
    ├── en.ts               ✅
    └── id.ts               ✅
```

### 3.2 TypeScript Quality

#### Type Safety

- [ ] **NO `any` types** - use `unknown` with guards?
- [ ] Strict typing enabled?
- [ ] All functions have return types?
- [ ] Props interfaces defined?

#### Null Safety

- [ ] Optional chaining (`?.`) used?
- [ ] Nullish coalescing (`??`) for defaults?
  ```typescript
  const name = data?.name ?? "N/A";
  ```
- [ ] Null checks before access?

### 3.3 Components

#### Separation of Concerns

- [ ] **NO business logic in components**?

  ```typescript
  // ✅ Correct - logic in hook
  const { data, isLoading } = useEntities();

  // ❌ Incorrect - API call in component
  const [data, setData] = useState();
  useEffect(() => {
    fetch("/api/entities").then(setData);
  }, []);
  ```

#### State Management

- [ ] TanStack Query for server state?
- [ ] Zustand only for client state?
- [ ] No direct state mutation?

#### UI/UX

- [ ] Loading states handled?
  ```typescript
  if (isLoading) return <SkeletonTable />;
  ```
- [ ] Error states handled?
  ```typescript
  if (error) return <ErrorState message={error.message} />;
  ```
- [ ] Empty states handled?
  ```typescript
  if (!data?.length) return <EmptyState />;
  ```
- [ ] `cursor-pointer` on clickable elements?
- [ ] PageMotion used for transitions?

### 3.4 Forms

#### Validation

- [ ] Zod schema defined?
- [ ] React Hook Form with zodResolver?
- [ ] Error messages displayed inline?
- [ ] Form validation on submit?

#### Form Pattern

```typescript
// ✅ Correct pattern
const form = useForm<CreateEntityInput>({
  resolver: zodResolver(createEntitySchema),
});

const onSubmit = async (data) => {
  try {
    await createMutation.mutateAsync(data);
    onClose();
  } catch (error) {
    // Error handled by mutation
  }
};
```

### 3.5 Styling

#### Tailwind CSS

- [ ] **NO arbitrary values** (`w-[100px]`)?
- [ ] Using semantic tokens?
- [ ] Consistent spacing?
- [ ] shadcn/ui components used?
- [ ] Responsive design?

### 3.6 API Integration

#### Service Layer

- [ ] API calls in services folder?
- [ ] Using apiClient from lib?
- [ ] Proper error handling?
- [ ] Type safety?

#### Hooks

- [ ] React Query for server state?
- [ ] Proper query keys?
- [ ] Cache invalidation after mutations?
- [ ] Optimistic updates where appropriate?

### 3.7 i18n

- [ ] All user-facing strings in i18n?
- [ ] Both en.ts and id.ts present?
- [ ] Registered in request.ts?
- [ ] Interpolation used correctly?

---

## Phase 4: Cross-Cutting Concerns (10 mins)

### 4.1 Documentation

#### Code Comments

- [ ] Complex logic explained (WHY, not WHAT)?
- [ ] TODO comments for future work?
- [ ] No commented-out code?

#### Documentation Files

- [ ] docs/features/<feature>.md updated?
- [ ] API changes documented?
- [ ] Postman collection updated?

### 4.2 Testing

#### Test Coverage

- [ ] Unit tests for business logic?
- [ ] Integration tests for API?
- [ ] Component tests?
- [ ] All tests passing?

#### Run Tests

```bash
# Backend
cd apps/api
go test ./...

# Frontend
cd apps/web
npx pnpm test
```

### 4.3 Quality Checks

#### Linting

```bash
# Backend
cd apps/api
go vet ./...
go fmt ./...

# Frontend
cd apps/web
npx pnpm lint
npx pnpm type-check
```

#### Build Verification

```bash
# Backend
cd apps/api
go build ./...

# Frontend
cd apps/web
npx pnpm build
```

---

## Phase 5: Security Review (10 mins)

### 5.1 Security Checklist

#### Backend

- [ ] Input validation on all endpoints?
- [ ] SQL injection prevention?
- [ ] IDOR (Insecure Direct Object Reference) prevented?
- [ ] CSRF protection?
- [ ] XSS prevention?
- [ ] Sensitive data not logged?
- [ ] Authentication/authorization checks?

#### Frontend

- [ ] XSS prevention (no dangerouslySetInnerHTML)?
- [ ] No hardcoded secrets?
- [ ] Proper CORS handling?
- [ ] Sensitive data not in localStorage?

---

## Phase 6: Final Assessment (5 mins)

### 6.1 Review Decision

#### Approve

- [ ] All requirements met
- [ ] No critical issues
- [ ] Tests passing
- [ ] Documentation updated

#### Request Changes

- [ ] Critical issues found
- [ ] Tests failing
- [ ] Breaking changes not documented
- [ ] Security concerns

### 6.2 Review Comments Template

```markdown
## Review Summary

### ✅ Approving

- Good separation of concerns
- Proper error handling
- Tests included

### ⚠️ Suggestions (Non-blocking)

1. Consider adding index on search field
2. Could use early return pattern here
3. Add more descriptive error message

### ❌ Issues (Must fix)

1. Missing ownership check in Delete handler
2. Model not registered in migrate.go
3. Using 'any' type - should be typed

### Questions

- Why did you choose X over Y?
- Is this field nullable?
```

---

## Common Issues Checklist

### Backend Issues

#### Critical (Must Fix)

- [ ] ❌ Missing model in migrate.go
- [ ] ❌ Relative imports (`internal/...`)
- [ ] ❌ Business logic in handler
- [ ] ❌ No ownership validation (IDOR)
- [ ] ❌ No soft delete field
- [ ] ❌ No GetFormData for foreign keys
- [ ] ❌ Non-hex UUIDs in seeders
- [ ] ❌ Taking address of constant

#### Warning (Should Fix)

- [ ] ⚠️ No pagination on list
- [ ] ⚠️ N+1 queries
- [ ] ⚠️ Missing FOR UPDATE
- [ ] ⚠️ No context timeout
- [ ] ⚠️ Hardcoded error messages
- [ ] ⚠️ Missing validation tags

### Frontend Issues

#### Critical (Must Fix)

- [ ] ❌ Business logic in components
- [ ] ❌ Using 'any' type
- [ ] ❌ Missing loading states
- [ ] ❌ No cursor-pointer
- [ ] ❌ Arbitrary Tailwind values
- [ ] ❌ Missing i18n registration

#### Warning (Should Fix)

- [ ] ⚠️ No error handling
- [ ] ⚠️ Missing empty states
- [ ] ⚠️ Poor form UX
- [ ] ⚠️ No TypeScript strict mode
- [ ] ⚠️ Direct state mutation
- [ ] ⚠️ Missing PropTypes/interfaces

---

## Review Output Format

For each file reviewed:

```markdown
## File: apps/api/internal/hrd/data/models/employee_contract.go

### ✅ Good Practices

- Proper GORM tags
- Soft delete field included
- Audit fields present

### ⚠️ Suggestions

- Add index on employee_id (line 15)
- Consider using enum type for contract_type (line 28)

### ❌ Issues

1. **Line 1**: Model not registered in migrate.go
   - Must add to migrateWithErrorHandling
   - Add import with full module path
```

---

## Review Checklist Summary

### Backend

- [ ] Architecture follows vertical slice
- [ ] Full module path imports
- [ ] Model registered in migrate.go
- [ ] Business logic in usecase only
- [ ] Repository uses interface
- [ ] DTOs with validation tags
- [ ] Error handling proper
- [ ] Security checks (IDOR, validation)
- [ ] Pagination max 100
- [ ] Tests present
- [ ] Documentation updated

### Frontend

- [ ] Feature-based structure
- [ ] No business logic in components
- [ ] Types defined (no any)
- [ ] TanStack Query for server state
- [ ] Loading/error/empty states
- [ ] cursor-pointer on clickable
- [ ] i18n for all strings
- [ ] Zod validation
- [ ] Route registered
- [ ] Tests present
- [ ] Build passes

---

## Code Review Principles

### DO

- ✅ Be constructive and kind
- ✅ Explain WHY, not just WHAT
- ✅ Suggest alternatives
- ✅ Acknowledge good practices
- ✅ Ask questions for clarification
- ✅ Provide code examples

### DON'T

- ❌ Be rude or dismissive
- ❌ Nitpick style (use linters for that)
- ❌ Block PR for minor issues
- ❌ Ignore context/business needs
- ❌ Make it personal
- ❌ Review when tired or rushed

---

## Quick Review Commands

```bash
# Check recent changes
git diff HEAD~5 --name-only

# Run tests
cd apps/api && go test ./...
cd apps/web && npx pnpm test

# Check linting
cd apps/api && go vet ./...
cd apps/web && npx pnpm lint

# Build check
cd apps/api && go build ./...
cd apps/web && npx pnpm build
```

Ready to review code thoroughly!
