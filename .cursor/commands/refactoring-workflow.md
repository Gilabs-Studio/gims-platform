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

## Phase 5: Documentation (10 mins)

### 5.1 Update Documentation

```markdown
## Refactoring: Entity Module

### Changes Made

- Extracted validation logic to usecase
- Simplified handler methods
- Added comprehensive tests

### Breaking Changes

- None (backward compatible)

### Performance Impact

- 30% reduction in API response time
- Reduced bundle size by 15%

### Testing

- All existing tests pass
- Added 15 new unit tests
- No regressions detected
```

### 5.2 Code Comments

```go
// REFACTOR(2024-01-15): Extracted from handler to improve testability
// Previous implementation had 200+ lines, now split into focused methods
func (u *Usecase) ValidateAndProcess(req Request) error {
    // ...
}
```

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
```

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
