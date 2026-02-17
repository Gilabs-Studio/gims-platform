---
description: Refactoring Workflow - Code Improvement and Optimization
globs: apps/**/*
alwaysApply: false
---

# Refactoring Workflow

## Purpose

Improve existing code quality, performance, and maintainability while preserving functionality.

## When to Use

- Code smells detected (duplication, long functions, etc.)
- Performance optimization needed
- Improving testability
- Reducing technical debt
- Modernizing patterns

## Time Estimate

- Simple refactoring: 30-60 mins
- Medium complexity: 1-2 hours
- Major refactoring: 2-4+ hours

---

## Phase 1: Analysis (15-20 mins)

### 1.1 Identify Code Smells

#### Common Code Smells

**Duplication**

```go
// ❌ Before - Duplicate validation
func CreateHandler(c *gin.Context) {
    if req.Name == "" {
        return errors.New("name required")
    }
    // ...
}

func UpdateHandler(c *gin.Context) {
    if req.Name == "" {
        return errors.New("name required")
    }
    // ...
}

// ✅ After - Extract to usecase
func (u *Usecase) Validate(req Request) error {
    if req.Name == "" {
        return errors.New("name required")
    }
    return nil
}
```

**Long Functions**

```go
// ❌ Before - Function too long
func ProcessOrder(order Order) error {
    // 100+ lines of code
    // Hard to understand
    // Hard to test
}

// ✅ After - Extract functions
func ProcessOrder(order Order) error {
    if err := validateOrder(order); err != nil {
        return err
    }

    if err := checkInventory(order); err != nil {
        return err
    }

    if err := processPayment(order); err != nil {
        return err
    }

    return createShipment(order)
}
```

**Feature Envy**

```go
// ❌ Before - Using other object's data excessively
func CalculateTotal(order Order) float64 {
    total := 0.0
    for _, item := range order.Items {
        price := item.Product.Price
        discount := item.Product.GetDiscount()
        tax := item.Product.GetTax()
        total += (price - discount) * (1 + tax)
    }
    return total
}

// ✅ After - Move to appropriate class
func (p Product) GetFinalPrice() float64 {
    return (p.Price - p.GetDiscount()) * (1 + p.GetTax())
}

func CalculateTotal(order Order) float64 {
    total := 0.0
    for _, item := range order.Items {
        total += item.Product.GetFinalPrice()
    }
    return total
}
```

### 1.2 Performance Issues

**N+1 Query Problem**

```go
// ❌ Before - N+1 queries
entities, _ := repo.FindAll()
for _, e := range entities {
    category, _ := categoryRepo.FindByID(e.CategoryID) // N queries!
    e.Category = category
}

// ✅ After - Single query with join
entities, _ := repo.FindAllWithCategory() // 1 query with Preload
```

**Missing Pagination**

```go
// ❌ Before - Loading all records
func GetAll() ([]Entity, error) {
    return db.Find(&[]Entity{}).Error
}

// ✅ After - Always paginate
func GetAll(query ListQuery) ([]Entity, int64, error) {
    var entities []Entity
    var total int64

    db.Model(&Entity{}).Count(&total)
    db.Limit(query.PerPage).Offset((query.Page-1)*query.PerPage).Find(&entities)

    return entities, total, nil
}
```

### 1.3 TypeScript Issues

**Any Types**

```typescript
// ❌ Before - Using any
function processData(data: any) {
  return data.name; // No type safety
}

// ✅ After - Proper typing
interface Data {
  name: string;
  value: number;
}

function processData(data: Data) {
  return data.name; // Type safe
}
```

**Business Logic in Components**

```typescript
// ❌ Before - Logic in component
function EntityList() {
    const [data, setData] = useState();

    useEffect(() => {
        fetch('/api/entities').then(res => res.json()).then(setData);
    }, []);

    const filtered = data?.filter(e => e.status === 'ACTIVE');
    const sorted = filtered?.sort((a, b) => b.created_at - a.created_at);

    return (<div>{sorted?.map(...)}</div>);
}

// ✅ After - Logic in hook
function EntityList() {
    const { data, isLoading } = useEntities({ status: 'ACTIVE', sort: 'created_desc' });
    return (<div>{data?.map(...)}</div>);
}
```

---

## Phase 2: Planning (10-15 mins)

### 2.1 Define Scope

- [ ] What exactly needs to be refactored?
- [ ] What are the success criteria?
- [ ] Are there breaking changes?
- [ ] What tests need updating?

### 2.2 Create Refactoring Plan

```
Step 1: Extract validation logic (15 mins)
Step 2: Move business logic to usecase (30 mins)
Step 3: Simplify component (20 mins)
Step 4: Update tests (30 mins)
Step 5: Verify no regressions (15 mins)
```

### 2.3 Safety Measures

- [ ] Create feature branch
- [ ] Ensure good test coverage exists
- [ ] Plan rollback strategy
- [ ] Document breaking changes

---

## Phase 3: Implementation (Time varies)

### 3.1 Backend Refactoring Patterns

#### Extract Method

```go
// ❌ Before
func (h *Handler) Create(c *gin.Context) {
    var req dto.CreateRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    if req.Name == "" {
        c.JSON(400, gin.H{"error": "name required"})
        return
    }

    if req.Email == "" {
        c.JSON(400, gin.H{"error": "email required"})
        return
    }
    // ... more validation ...
}

// ✅ After
func (h *Handler) Create(c *gin.Context) {
    req, err := h.parseAndValidateCreateRequest(c)
    if err != nil {
        h.sendValidationError(c, err)
        return
    }
    // ... proceed with creation ...
}

func (h *Handler) parseAndValidateCreateRequest(c *gin.Context) (*dto.CreateRequest, error) {
    var req dto.CreateRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        return nil, err
    }

    if err := validate.Struct(req); err != nil {
        return nil, err
    }

    return &req, nil
}
```

#### Move Method

```go
// ❌ Before - Handler has business logic
func (h *Handler) CalculateTotal(c *gin.Context) {
    id := c.Param("id")
    order, _ := h.usecase.GetByID(c, id)

    total := 0.0
    for _, item := range order.Items {
        price := item.Price
        discount := item.Discount
        tax := item.TaxRate * price
        total += (price - discount) + tax
    }

    c.JSON(200, gin.H{"total": total})
}

// ✅ After - Business logic in usecase
func (h *Handler) CalculateTotal(c *gin.Context) {
    id := c.Param("id")
    total, err := h.usecase.CalculateTotal(c, id)
    if err != nil {
        h.sendError(c, err)
        return
    }

    c.JSON(200, gin.H{"total": total})
}

// In usecase
func (u *Usecase) CalculateTotal(ctx context.Context, id string) (float64, error) {
    order, err := u.repo.FindByID(ctx, id)
    if err != nil {
        return 0, err
    }

    return order.CalculateTotal(), nil
}

// In model
func (o Order) CalculateTotal() float64 {
    total := 0.0
    for _, item := range o.Items {
        total += item.CalculateSubtotal()
    }
    return total
}

func (i Item) CalculateSubtotal() float64 {
    tax := i.TaxRate * i.Price
    return (i.Price - i.Discount) + tax
}
```

#### Replace Conditional with Polymorphism

```go
// ❌ Before - Switch statements everywhere
func (s *Service) ProcessPayment(payment Payment) error {
    switch payment.Type {
    case "credit_card":
        return s.processCreditCard(payment)
    case "bank_transfer":
        return s.processBankTransfer(payment)
    case "cash":
        return s.processCash(payment)
    default:
        return errors.New("unknown payment type")
    }
}

// ✅ After - Strategy pattern
type PaymentProcessor interface {
    Process(payment Payment) error
}

type CreditCardProcessor struct{}
func (c CreditCardProcessor) Process(payment Payment) error {
    // Process credit card
}

type BankTransferProcessor struct{}
func (b BankTransferProcessor) Process(payment Payment) error {
    // Process bank transfer
}

func (s *Service) ProcessPayment(payment Payment) error {
    processor, err := s.getProcessor(payment.Type)
    if err != nil {
        return err
    }
    return processor.Process(payment)
}
```

### 3.2 Frontend Refactoring Patterns

#### Extract Component

```typescript
// ❌ Before - Everything in one file
function EntityPage() {
    return (
        <div>
            <div className="header">...</div>
            <table>...</table>
            <div className="pagination">...</div>
        </div>
    );
}

// ✅ After - Extract components
function EntityPage() {
    return (
        <div>
            <PageHeader />
            <EntityTable />
            <Pagination />
        </div>
    );
}
```

#### Extract Hook

```typescript
// ❌ Before - Logic in component
function EntityList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/entities")
      .then((res) => setData(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  // ... render
}

// ✅ After - Extract to hook
function EntityList() {
  const { data, isLoading, error } = useEntities();
  // ... render
}

// In use-entities.ts
export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: () => apiClient.get("/entities").then((res) => res.data),
  });
}
```

#### Replace Prop Drilling with Context

```typescript
// ❌ Before - Prop drilling
function App() {
    const [user, setUser] = useState();
    return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
    return <Header user={user} setUser={setUser} />;
}

function Header({ user, setUser }) {
    return <UserMenu user={user} setUser={setUser} />;
}

// ✅ After - Use context
function App() {
    return (
        <UserProvider>
            <Layout />
        </UserProvider>
    );
}

function UserMenu() {
    const { user, setUser } = useUser();
    // ... use user directly
}
```

### 3.3 Database Refactoring

#### Add Index

```go
// Migration to add index
type AddIndexToEntity struct{}

func (AddIndexToEntity) Up(db *gorm.DB) error {
    return db.Exec("CREATE INDEX idx_entities_status ON entities(status)").Error
}

func (AddIndexToEntity) Down(db *gorm.DB) error {
    return db.Exec("DROP INDEX idx_entities_status").Error
}
```

#### Split Table

```go
// ❌ Before - Wide table
type Entity struct {
    ID          uuid.UUID
    Name        string
    // ... 50+ fields
    ConfigJSON  string // Storing complex config as JSON
}

// ✅ After - Normalize
// Main table
type Entity struct {
    ID          uuid.UUID
    Name        string
    // Essential fields only
}

// Separate config table
type EntityConfig struct {
    EntityID    uuid.UUID `gorm:"primaryKey"`
    Settings    datatypes.JSON
    Preferences datatypes.JSON
}
```

---

## Phase 4: Testing (30-45 mins)

### 4.1 Ensure No Regressions

```bash
# Run all tests
cd apps/api && go test ./...
cd apps/web && npx pnpm test

# Check coverage
go test -cover ./...
npx pnpm test --coverage

# Build verification
cd apps/api && go build ./...
cd apps/web && npx pnpm build

# Lint check
cd apps/api && go vet ./...
cd apps/web && npx pnpm lint
```

### 4.2 Manual Testing

```bash
# Start application
npx pnpm dev

# Test critical paths
# 1. Login
# 2. Navigate to refactored feature
# 3. Perform CRUD operations
# 4. Check for console errors
# 5. Verify performance
```

### 4.3 Performance Testing

```bash
# Backend performance
go test -bench=. ./internal/domain/usecase/...

# Frontend performance
# Check bundle size
npx pnpm build
# Check for unnecessary re-renders with React DevTools Profiler
```

---

## Phase 5: Documentation (15 mins)

### 5.1 Create Refactoring Documentation

**Location**: `docs/refactoring/REF-XXX-<description>.md`

````markdown
# Refactoring Report: <Feature/Module Name>

## Refactoring ID

REF-XXX

## Date

YYYY-MM-DD

## Author

@developer-name

## Status

- [ ] Planned
- [x] In Progress
- [x] Completed
- [ ] Reviewed

## Overview

### What Changed

Brief description of the refactoring.

### Why It Was Needed

- Reason 1: Technical debt
- Reason 2: Performance issues
- Reason 3: Maintainability

### Scope

- **Files Modified**: 10
- **Lines Changed**: +500, -800
- **Breaking Changes**: No

## Before & After

### Architecture

**Before**:

- Description of old architecture
- Issues with old approach

**After**:

- Description of new architecture
- Benefits of new approach

### Code Example

**Before**:

```go
// Old code - 200+ lines in handler
func (h *Handler) Process(c *gin.Context) {
    // Validation
    // Business logic
    // Database calls
    // Response
}
```
````

**After**:

```go
// New code - Separated concerns
func (h *Handler) Process(c *gin.Context) {
    result, err := h.usecase.Process(ctx, req)
    // Just handle response
}

func (u *Usecase) Process(ctx context.Context, req Request) (Result, error) {
    // Business logic only
}
```

## Changes Detail

### Backend Changes

| File            | Change Type | Description              |
| --------------- | ----------- | ------------------------ |
| handler.go      | Modified    | Extracted business logic |
| usecase.go      | Created     | New usecase layer        |
| usecase_impl.go | Created     | Implementation           |

### Frontend Changes

| File             | Change Type | Description             |
| ---------------- | ----------- | ----------------------- |
| use-feature.ts   | Modified    | Improved error handling |
| feature-list.tsx | Modified    | Better loading states   |

### Database Changes

- [ ] No changes
- [x] Schema migration (describe)
- [ ] Index added

## Impact Analysis

### Performance

| Metric            | Before | After | Improvement   |
| ----------------- | ------ | ----- | ------------- |
| API Response Time | 200ms  | 140ms | 30% faster    |
| Database Queries  | 25     | 15    | 40% reduction |
| Bundle Size       | 500KB  | 425KB | 15% smaller   |
| Test Execution    | 45s    | 30s   | 33% faster    |

### Maintainability

- **Cyclomatic Complexity**: Reduced from 25 to 10
- **Code Duplication**: Reduced by 60%
- **Test Coverage**: Increased from 60% to 85%

### Developer Experience

- Easier to test (unit testable)
- Clearer separation of concerns
- Better error messages
- More consistent patterns

## Risks & Mitigation

| Risk                   | Likelihood | Impact | Mitigation                 |
| ---------------------- | ---------- | ------ | -------------------------- |
| Breaking changes       | Low        | High   | Backward compatible design |
| Performance regression | Low        | Medium | Benchmark tests            |
| Regression bugs        | Medium     | Medium | Comprehensive testing      |

## Testing

### Tests Performed

- [x] Unit tests updated
- [x] Integration tests pass
- [x] E2E tests pass
- [x] Manual testing completed
- [x] Performance benchmarks

### Coverage Report

```
Before: 60% coverage
After: 85% coverage
+25% improvement
```

## Migration Guide

### For Developers

No changes required - backward compatible.

### For DevOps

No infrastructure changes.

## Rollback Plan

If issues occur:

1. Revert commit: `git revert <commit-hash>`
2. Database: No rollback needed (no schema changes)
3. Notify team in #dev channel

## Lessons Learned

1. **What Worked Well**:
   - Extracting usecases improved testability
   - Early validation caught issues

2. **What Could Be Better**:
   - Could have done smaller PRs
   - More documentation upfront

3. **Recommendations**:
   - Apply same pattern to other modules
   - Document patterns for team

## Related

- PR: #XXX
- Issue: #YYY
- ADR: docs/decisions/ADR-XXX.md

## Approval

- [x] Tech Lead Review
- [x] QA Sign-off
- [ ] Product Owner Approval

````

### 5.2 Update Feature Documentation

Update existing feature docs to reflect changes:

```markdown
## Architecture Update (v2.0)

### Changes in v2.0 (2024-01-15)
- **Refactored**: Moved business logic from handlers to usecases
- **Improved**: Response time reduced by 30%
- **Added**: Comprehensive test coverage (85%)

### Migration Notes
No migration required. All changes are backward compatible.
````

### 5.3 Create Architecture Decision Record (ADR)

**Location**: `docs/decisions/ADR-XXX-<decision-title>.md`

```markdown
# ADR-XXX: Refactor to Vertical Slice Architecture

## Status

- Proposed: 2024-01-10
- Accepted: 2024-01-15
- Implemented: 2024-01-15

## Context

Original codebase had business logic scattered across handlers,
leading to:

- Difficult to test
- Code duplication
- Tight coupling

## Decision

Migrate to Vertical Slice Architecture with clear layers:

1. Handler: HTTP layer only
2. Usecase: Business logic
3. Repository: Data access

## Consequences

### Positive

- Better testability
- Clear separation of concerns
- Easier maintenance

### Negative

- More files to manage
- Learning curve for team

## Implementation

See: docs/refactoring/REF-XXX.md

## References

- [Vertical Slice Architecture](https://link)
- [Clean Architecture](https://link)
```

### 5.4 Update API Documentation

If API behavior changed:

```markdown
## API Changes

### Version 2.0 (2024-01-15)

**Breaking Changes**: None

**Improvements**:

- Response time reduced by 30%
- Better error messages
- Consistent error format

**Deprecations**:

- Old endpoint still works (deprecated)
- Will be removed in v3.0
```

### 5.5 Code Comments

```go
// REFACTOR(2024-01-15, REF-XXX): Extracted from handler to improve testability
// Previous implementation had 200+ lines, now split into focused methods
// See: docs/refactoring/REF-XXX-entity-module.md
func (u *Usecase) ValidateAndProcess(req Request) error {
    // ...
}

// OPTIMIZE(2024-01-15): Added database index on status column
// Improves query performance by 40% for filtered lists
// Migration: migrations/20240115_add_status_index.sql
```

### 5.6 Update Change Log

**File**: `CHANGELOG.md`

```markdown
## [2.0.0] - 2024-01-15

### Changed

- **Refactored**: Entity module to vertical slice architecture
  - Moved business logic from handlers to usecases
  - Improved testability and maintainability
  - 30% performance improvement
  - See: docs/refactoring/REF-XXX.md

### Improved

- API response time reduced by 30%
- Test coverage increased to 85%
- Reduced bundle size by 15%
```

### 5.7 Update Team Documentation

**File**: `docs/team/development-patterns.md`

```markdown
## Patterns

### Vertical Slice Architecture (New)

Following REF-XXX refactoring, we now use:
```

internal/<domain>/
├── data/
│ ├── models/
│ └── repositories/
├── domain/
│ ├── dto/
│ ├── mapper/
│ └── usecase/
└── presentation/
├── handler/
└── router/

```

**Benefits**:
- Better testability
- Clear separation of concerns
- Easier to understand

**Example**: See entity module implementation
```

### 5.8 Documentation Checklist

- [ ] Refactoring report created
- [ ] ADR created (if architectural change)
- [ ] Feature documentation updated
- [ ] API documentation updated
- [ ] Code comments added
- [ ] CHANGELOG.md updated
- [ ] Team patterns documented
- [ ] Migration guide provided (if needed)
- [ ] Rollback plan documented
      // ...
      }

````

---

## Common Refactoring Patterns

### Backend Patterns

**Extract Repository Interface**

```go
// Before - Direct dependency
func NewUsecase(db *gorm.DB) *Usecase {
    return &Usecase{db: db}
}

// After - Interface for testability
type EntityRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*Entity, error)
    Create(ctx context.Context, entity *Entity) error
    // ...
}

func NewUsecase(repo EntityRepository) *Usecase {
    return &Usecase{repo: repo}
}
````

**Add Context for Cancellation**

```go
// Before - No context
func GetByID(id string) (*Entity, error) {
    return db.First(&Entity{}, id).Error
}

// After - With context and timeout
func GetByID(ctx context.Context, id string) (*Entity, error) {
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    var entity Entity
    if err := db.WithContext(ctx).First(&entity, id).Error; err != nil {
        return nil, err
    }
    return &entity, nil
}
```

### Frontend Patterns

**Memoization for Performance**

```typescript
// Before - Recalculates on every render
function EntityList({ entities }) {
    const sorted = entities.sort((a, b) => b.date - a.date);
    const filtered = sorted.filter(e => e.status === 'active');

    return <div>{filtered.map(...)}</div>;
}

// After - Memoize calculations
function EntityList({ entities }) {
    const filtered = useMemo(() => {
        return entities
            .sort((a, b) => b.date - a.date)
            .filter(e => e.status === 'active');
    }, [entities]);

    return <div>{filtered.map(...)}</div>;
}
```

**Lazy Loading**

```typescript
// Before - Load everything at once
import { HeavyComponent } from './heavy-component';

// After - Lazy load
const HeavyComponent = lazy(() => import('./heavy-component'));

function App() {
    return (
        <Suspense fallback={<Loading />}>
            <HeavyComponent />
        </Suspense>
    );
}
```

---

## Refactoring Checklist

### Before Starting

- [ ] Create feature branch
- [ ] Review current tests
- [ ] Identify all affected files
- [ ] Plan rollback strategy
- [ ] Estimate time required

### During Refactoring

- [ ] Make small, focused changes
- [ ] Run tests frequently
- [ ] Commit often with clear messages
- [ ] Update tests as you go
- [ ] Document breaking changes

### After Refactoring

- [ ] All tests pass
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Manual testing complete
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Merged to main

---

## Quick Commands

```bash
# Check for code duplication
jscpd apps/web/src --reporters console

# Find TODO/FIXME comments
grep -r "TODO\|FIXME\|XXX" apps/

# Check function complexity
gocyclo apps/api/internal/domain/usecase/

# Measure test coverage
cd apps/api && go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out

# Bundle analysis
cd apps/web && npx pnpm build && npx webpack-bundle-analyzer dist/static/*.js
```

---

## When NOT to Refactor

❌ **Don't refactor when:**

- Deadline is tight
- Tests don't exist
- Requirements are unclear
- You're fixing a critical bug
- The code is being replaced soon

✅ **Do refactor when:**

- Adding a feature becomes difficult
- Tests are hard to write
- Code is hard to understand
- Performance is poor
- You have time and tests exist

Ready to refactor safely!
