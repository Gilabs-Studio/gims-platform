---
description: Testing Workflow - Unit, Integration, and E2E Testing
globs: apps/**/*
alwaysApply: false
---

# Testing Workflow

## Purpose

Implement comprehensive testing strategy for GIMS including unit, integration, and E2E tests.

## When to Use

- Adding new features
- Fixing bugs (write test first)
- Refactoring existing code
- Setting up CI/CD pipelines

## Time Estimate

- Unit tests for simple function: 15-20 mins
- Unit tests for complex logic: 30-45 mins
- Integration tests: 45-60 mins
- E2E tests: 60-90 mins

---

## Phase 1: Test Planning (10 mins)

### 1.1 Identify What to Test

#### Backend Testing Levels

```
Unit Tests (Fast, Isolated)
├── Repository Layer
├── Usecase Layer (Business Logic)
├── Mapper Layer
└── Utilities/Helpers

Integration Tests (Medium Speed)
├── API Endpoints (Handler + Router)
├── Database Operations
└── External Service Calls

E2E Tests (Slow, Full Flow)
├── Complete User Workflows
├── Cross-domain Integration
└── Critical Business Paths
```

#### Frontend Testing Levels

```
Unit Tests (Fast)
├── Hooks (useQuery, useMutation)
├── Utilities/Helpers
├── Schemas (Zod validation)
└── Services (API calls)

Component Tests (Medium)
├── Component Rendering
├── User Interactions
├── Form Validation
└── State Management

Integration Tests (Slower)
├── Feature Workflows
├── API Integration
└── Routing
```

### 1.2 Define Test Cases

For each function/feature, define:

- **Happy path**: Normal successful operation
- **Error cases**: Expected failures
- **Edge cases**: Boundary conditions
- **Invalid inputs**: Validation failures

### 1.3 Test Naming Convention

Use BDD-style naming:

```go
// Backend
func TestFeature_ShouldReturnResult_WhenCondition() {}
func TestCreateEntity_ShouldReturnError_WhenNameIsEmpty() {}
func TestGetEntity_ShouldReturnNotFound_WhenIDDoesNotExist() {}

// Frontend
it('should display loading state while fetching data', () => {});
it('should show error message when API fails', () => {});
it('should disable submit button when form is invalid', () => {});
```

---

## Phase 2: Backend Unit Tests (30-45 mins)

### 2.1 Repository Tests

**File**: `apps/api/internal/domain/data/repositories/entity_repository_test.go`

```go
package repositories

import (
    "context"
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/gilabs/gims/api/internal/domain/data/models"
)

// Mock database
type MockDB struct {
    mock.Mock
}

func TestEntityRepository_FindByID_ShouldReturnEntity_WhenExists(t *testing.T) {
    // Arrange
    mockDB := new(MockDB)
    repo := NewEntityRepository(mockDB)
    ctx := context.Background()
    id := uuid.MustParse("ae000001-0000-0000-0000-000000000001")

    expectedEntity := &models.Entity{
        ID:   id,
        Name: "Test Entity",
    }

    mockDB.On("First", mock.Anything, id).Return(expectedEntity, nil)

    // Act
    result, err := repo.FindByID(ctx, id)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, result)
    assert.Equal(t, expectedEntity.Name, result.Name)
    mockDB.AssertExpectations(t)
}

func TestEntityRepository_FindByID_ShouldReturnError_WhenNotFound(t *testing.T) {
    // Arrange
    mockDB := new(MockDB)
    repo := NewEntityRepository(mockDB)
    ctx := context.Background()
    id := uuid.MustParse("ae000001-0000-0000-0000-000000000001")

    mockDB.On("First", mock.Anything, id).Return(nil, gorm.ErrRecordNotFound)

    // Act
    result, err := repo.FindByID(ctx, id)

    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
}

func TestEntityRepository_FindAll_ShouldReturnPaginatedResults(t *testing.T) {
    // Arrange
    mockDB := new(MockDB)
    repo := NewEntityRepository(mockDB)
    ctx := context.Background()
    query := dto.ListQuery{Page: 1, PerPage: 10}

    entities := []models.Entity{
        {ID: uuid.New(), Name: "Entity 1"},
        {ID: uuid.New(), Name: "Entity 2"},
    }

    mockDB.On("Limit", 10).Return(mockDB)
    mockDB.On("Offset", 0).Return(mockDB)
    mockDB.On("Find", mock.Anything).Return(mockDB)
    mockDB.On("Count", mock.Anything).Return(int64(2), nil)

    // Act
    results, total, err := repo.FindAll(ctx, query)

    // Assert
    assert.NoError(t, err)
    assert.Len(t, results, 2)
    assert.Equal(t, int64(2), total)
}
```

### 2.2 Usecase Tests

**File**: `apps/api/internal/domain/usecase/entity_usecase_test.go`

```go
package usecase

import (
    "context"
    "errors"
    "testing"

    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/gilabs/gims/api/internal/domain/data/models"
    "github.com/gilabs/gims/api/internal/domain/dto"
    "github.com/gilabs/gims/api/internal/domain/mapper"
)

// Mock repository
type MockEntityRepository struct {
    mock.Mock
}

func (m *MockEntityRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Entity, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*models.Entity), args.Error(1)
}

func TestEntityUsecase_Create_ShouldReturnCreatedEntity_WhenValidInput(t *testing.T) {
    // Arrange
    mockRepo := new(MockEntityRepository)
    usecase := NewEntityUsecase(mockRepo)
    ctx := context.Background()
    userID := uuid.MustParse("ae000001-0000-0000-0000-000000000001")

    req := dto.EntityCreateRequest{
        Name: "New Entity",
        Type: "TYPE_A",
    }

    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Entity")).
        Run(func(args mock.Arguments) {
            entity := args.Get(1).(*models.Entity)
            entity.ID = uuid.New()
        }).
        Return(nil)

    // Act
    result, err := usecase.Create(ctx, req, userID)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, result)
    assert.Equal(t, req.Name, result.Name)
    assert.Equal(t, req.Type, result.Type)
    mockRepo.AssertExpectations(t)
}

func TestEntityUsecase_Create_ShouldReturnError_WhenNameIsEmpty(t *testing.T) {
    // Arrange
    mockRepo := new(MockEntityRepository)
    usecase := NewEntityUsecase(mockRepo)
    ctx := context.Background()
    userID := uuid.New()

    req := dto.EntityCreateRequest{
        Name: "", // Empty name
        Type: "TYPE_A",
    }

    // Act
    result, err := usecase.Create(ctx, req, userID)

    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Contains(t, err.Error(), "name is required")
    mockRepo.AssertNotCalled(t, "Create")
}

func TestEntityUsecase_GetByID_ShouldReturnError_WhenNotFound(t *testing.T) {
    // Arrange
    mockRepo := new(MockEntityRepository)
    usecase := NewEntityUsecase(mockRepo)
    ctx := context.Background()
    id := uuid.MustParse("ae000001-0000-0000-0000-000000000001")

    mockRepo.On("FindByID", ctx, id).Return(nil, gorm.ErrRecordNotFound)

    // Act
    result, err := usecase.GetByID(ctx, id)

    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Equal(t, "ENTITY_NOT_FOUND", err.Code)
}

func TestEntityUsecase_Delete_ShouldReturnError_WhenUserNotOwner(t *testing.T) {
    // Arrange
    mockRepo := new(MockEntityRepository)
    usecase := NewEntityUsecase(mockRepo)
    ctx := context.Background()
    entityID := uuid.New()
    userID := uuid.New()

    entity := &models.Entity{
        ID:        entityID,
        CreatedBy: uuid.New(), // Different from userID
    }

    mockRepo.On("FindByID", ctx, entityID).Return(entity, nil)

    // Act
    err := usecase.Delete(ctx, entityID)

    // Assert
    assert.Error(t, err)
    assert.Equal(t, "FORBIDDEN", err.Code)
    mockRepo.AssertNotCalled(t, "Delete")
}
```

### 2.3 Mapper Tests

**File**: `apps/api/internal/domain/mapper/entity_mapper_test.go`

```go
package mapper

import (
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/gilabs/gims/api/internal/domain/data/models"
    "github.com/gilabs/gims/api/internal/domain/dto"
)

func TestToModel_ShouldMapRequestToEntity(t *testing.T) {
    // Arrange
    req := dto.EntityCreateRequest{
        Name:        "Test Entity",
        Description: "Test Description",
        Type:        "TYPE_A",
        Amount:      100.50,
    }

    // Act
    result := ToModel(req)

    // Assert
    assert.Equal(t, req.Name, result.Name)
    assert.Equal(t, req.Description, result.Description)
    assert.Equal(t, req.Type, result.Type)
    assert.Equal(t, req.Amount, result.Amount)
    assert.NotEqual(t, uuid.Nil, result.ID)
}

func TestToResponse_ShouldMapEntityToResponse(t *testing.T) {
    // Arrange
    now := time.Now()
    entity := models.Entity{
        ID:          uuid.New(),
        Name:        "Test Entity",
        Description: "Test Description",
        CreatedAt:   now,
        UpdatedAt:   now,
    }

    // Act
    result := ToResponse(entity)

    // Assert
    assert.Equal(t, entity.ID.String(), result.ID)
    assert.Equal(t, entity.Name, result.Name)
    assert.Equal(t, entity.CreatedAt.Format(time.RFC3339), result.CreatedAt)
}

func TestToResponseList_ShouldMapMultipleEntities(t *testing.T) {
    // Arrange
    entities := []models.Entity{
        {ID: uuid.New(), Name: "Entity 1"},
        {ID: uuid.New(), Name: "Entity 2"},
        {ID: uuid.New(), Name: "Entity 3"},
    }

    // Act
    results := ToResponseList(entities)

    // Assert
    assert.Len(t, results, 3)
    assert.Equal(t, entities[0].Name, results[0].Name)
    assert.Equal(t, entities[1].Name, results[1].Name)
    assert.Equal(t, entities[2].Name, results[2].Name)
}
```

### 2.4 Running Backend Tests

```bash
# Run all tests
cd apps/api
go test ./...

# Run tests for specific package
go test ./internal/hrd/domain/usecase/...

# Run with verbose output
go test -v ./internal/hrd/domain/usecase/...

# Run with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific test
go test -run TestEntityUsecase_Create ./internal/hrd/domain/usecase/...
```

---

## Phase 3: Backend Integration Tests (30-45 mins)

### 3.1 API Handler Tests

**File**: `apps/api/internal/domain/presentation/handler/entity_handler_test.go`

```go
package handler

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/gilabs/gims/api/internal/domain/dto"
    "github.com/gilabs/gims/api/internal/domain/usecase"
)

// Mock usecase
type MockEntityUsecase struct {
    mock.Mock
}

func TestEntityHandler_GetByID_ShouldReturnEntity_WhenExists(t *testing.T) {
    // Arrange
    gin.SetMode(gin.TestMode)
    mockUsecase := new(MockEntityUsecase)
    handler := NewEntityHandler(mockUsecase)

    entityID := uuid.MustParse("ae000001-0000-0000-0000-000000000001")
    expectedEntity := &dto.EntityResponse{
        ID:   entityID.String(),
        Name: "Test Entity",
    }

    mockUsecase.On("GetByID", mock.Anything, entityID).Return(expectedEntity, nil)

    router := gin.New()
    router.GET("/entities/:id", handler.GetByID)

    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/entities/"+entityID.String(), nil)

    // Act
    router.ServeHTTP(w, req)

    // Assert
    assert.Equal(t, http.StatusOK, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)

    assert.True(t, response["success"].(bool))
    assert.Equal(t, "Test Entity", response["data"].(map[string]interface{})["name"])
}

func TestEntityHandler_Create_ShouldReturnError_WhenInvalidJSON(t *testing.T) {
    // Arrange
    gin.SetMode(gin.TestMode)
    mockUsecase := new(MockEntityUsecase)
    handler := NewEntityHandler(mockUsecase)

    router := gin.New()
    router.POST("/entities", handler.Create)

    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/entities", bytes.NewBufferString("invalid json"))
    req.Header.Set("Content-Type", "application/json")

    // Act
    router.ServeHTTP(w, req)

    // Assert
    assert.Equal(t, http.StatusBadRequest, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)

    assert.False(t, response["success"].(bool))
    assert.Equal(t, "INVALID_REQUEST_BODY", response["error"].(map[string]interface{})["code"])
}
```

### 3.2 Database Integration Tests

**File**: `apps/api/internal/domain/data/repositories/entity_repository_integration_test.go`

```go
// +build integration

package repositories

import (
    "context"
    "testing"

    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
    "github.com/gilabs/gims/api/internal/core/infrastructure/database"
    "github.com/gilabs/gims/api/internal/domain/data/models"
)

type EntityRepositoryIntegrationTestSuite struct {
    suite.Suite
    db   *gorm.DB
    repo EntityRepository
}

func (suite *EntityRepositoryIntegrationTestSuite) SetupSuite() {
    // Connect to test database
    db, err := database.NewConnection(database.Config{
        Host:     "localhost",
        Port:     5434,
        User:     "postgres",
        Password: "postgres",
        DBName:   "gims_test",
    })
    if err != nil {
        suite.T().Fatal(err)
    }

    suite.db = db
    suite.repo = NewEntityRepository(db)

    // Run migrations
    db.AutoMigrate(&models.Entity{})
}

func (suite *EntityRepositoryIntegrationTestSuite) TearDownSuite() {
    // Clean up
    suite.db.Migrator().DropTable(&models.Entity{})
}

func (suite *EntityRepositoryIntegrationTestSuite) SetupTest() {
    // Clear data before each test
    suite.db.Where("1 = 1").Delete(&models.Entity{})
}

func (suite *EntityRepositoryIntegrationTestSuite) TestCreate_ShouldPersistEntity() {
    // Arrange
    ctx := context.Background()
    entity := &models.Entity{
        ID:   uuid.New(),
        Name: "Test Entity",
    }

    // Act
    err := suite.repo.Create(ctx, entity)

    // Assert
    assert.NoError(suite.T(), err)

    // Verify in database
    var found models.Entity
    result := suite.db.First(&found, entity.ID)
    assert.NoError(suite.T(), result.Error)
    assert.Equal(suite.T(), entity.Name, found.Name)
}

func (suite *EntityRepositoryIntegrationTestSuite) TestFindByID_ShouldReturnEntity() {
    // Arrange
    ctx := context.Background()
    entity := &models.Entity{
        ID:   uuid.New(),
        Name: "Test Entity",
    }
    suite.db.Create(entity)

    // Act
    result, err := suite.repo.FindByID(ctx, entity.ID)

    // Assert
    assert.NoError(suite.T(), err)
    assert.NotNil(suite.T(), result)
    assert.Equal(suite.T(), entity.Name, result.Name)
}

func TestEntityRepositoryIntegrationTestSuite(t *testing.T) {
    suite.Run(t, new(EntityRepositoryIntegrationTestSuite))
}
```

---

## Phase 4: Frontend Unit Tests (30-45 mins)

### 4.1 Hook Tests

**File**: `apps/web/src/features/entity/hooks/use-entity.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEntities, useCreateEntity } from './use-entity';
import { entityService } from '../services/entity-service';

// Mock the service
jest.mock('../services/entity-service');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useEntities', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should return entities when API call succeeds', async () => {
    // Arrange
    const mockEntities = [
      { id: '1', name: 'Entity 1' },
      { id: '2', name: 'Entity 2' },
    ];

    (entityService.getAll as jest.Mock).mockResolvedValue({
      success: true,
      data: mockEntities,
      meta: { pagination: { page: 1, total: 2 } },
    });

    // Act
    const { result } = renderHook(() => useEntities({ page: 1 }), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].name).toBe('Entity 1');
  });

  it('should return error when API call fails', async () => {
    // Arrange
    (entityService.getAll as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    // Act
    const { result } = renderHook(() => useEntities({ page: 1 }), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useCreateEntity', () => {
  it('should invalidate entities query on success', async () => {
    // Arrange
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    (entityService.create as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: '1', name: 'New Entity' },
    });

    // Act
    const { result } = renderHook(() => useCreateEntity(), { wrapper });

    await result.current.mutateAsync({ name: 'New Entity' });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['entities'] });
  });
});
```

### 4.2 Component Tests

**File**: `apps/web/src/features/entity/components/entity-list.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntityList } from './entity-list';
import * as hooks from '../hooks/use-entity';

// Mock the hooks
jest.mock('../hooks/use-entity');

const queryClient = new QueryClient();

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('EntityList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading skeleton when loading', () => {
    // Arrange
    (hooks.useEntities as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    // Act
    render(<EntityList />, { wrapper });

    // Assert
    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('should display entities when loaded', () => {
    // Arrange
    (hooks.useEntities as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: '1', name: 'Entity 1', status: 'ACTIVE' },
          { id: '2', name: 'Entity 2', status: 'INACTIVE' },
        ],
        meta: { pagination: { page: 1, total_pages: 1 } },
      },
      isLoading: false,
      error: null,
    });

    // Act
    render(<EntityList />, { wrapper });

    // Assert
    expect(screen.getByText('Entity 1')).toBeInTheDocument();
    expect(screen.getByText('Entity 2')).toBeInTheDocument();
  });

  it('should show empty state when no entities', () => {
    // Arrange
    (hooks.useEntities as jest.Mock).mockReturnValue({
      data: { data: [], meta: { pagination: { page: 1, total: 0 } } },
      isLoading: false,
      error: null,
    });

    // Act
    render(<EntityList />, { wrapper });

    // Assert
    expect(screen.getByText(/no entities found/i)).toBeInTheDocument();
  });

  it('should show error state when API fails', () => {
    // Arrange
    (hooks.useEntities as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    // Act
    render(<EntityList />, { wrapper });

    // Assert
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call setSearch when search input changes', () => {
    // Arrange
    const mockSetSearch = jest.fn();
    jest.spyOn(React, 'useState')
      .mockReturnValueOnce([1, jest.fn()]) // page
      .mockReturnValueOnce(['', mockSetSearch]); // search

    (hooks.useEntities as jest.Mock).mockReturnValue({
      data: { data: [], meta: { pagination: { page: 1, total: 0 } } },
      isLoading: false,
      error: null,
    });

    // Act
    render(<EntityList />, { wrapper });
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Assert
    expect(mockSetSearch).toHaveBeenCalledWith('test');
  });
});
```

### 4.3 Schema Tests

**File**: `apps/web/src/features/entity/schemas/entity.schema.test.ts`

```typescript
import { createEntitySchema } from "./entity.schema";

describe("createEntitySchema", () => {
  it("should validate correct data", () => {
    // Arrange
    const validData = {
      name: "Test Entity",
      type: "TYPE_A",
      amount: 100,
    };

    // Act
    const result = createEntitySchema.safeParse(validData);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should fail when name is too short", () => {
    // Arrange
    const invalidData = {
      name: "Te", // Too short
      type: "TYPE_A",
      amount: 100,
    };

    // Act
    const result = createEntitySchema.safeParse(invalidData);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("at least 3 characters");
    }
  });

  it("should fail when name is missing", () => {
    // Arrange
    const invalidData = {
      type: "TYPE_A",
      amount: 100,
    };

    // Act
    const result = createEntitySchema.safeParse(invalidData);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should fail when type is invalid", () => {
    // Arrange
    const invalidData = {
      name: "Test Entity",
      type: "INVALID_TYPE",
      amount: 100,
    };

    // Act
    const result = createEntitySchema.safeParse(invalidData);

    // Assert
    expect(result.success).toBe(false);
  });

  it("should allow optional description", () => {
    // Arrange
    const dataWithoutDescription = {
      name: "Test Entity",
      type: "TYPE_A",
      amount: 100,
    };

    // Act
    const result = createEntitySchema.safeParse(dataWithoutDescription);

    // Assert
    expect(result.success).toBe(true);
  });
});
```

### 4.4 Running Frontend Tests

```bash
# Run all tests
cd apps/web
npx pnpm test

# Run in watch mode
npx pnpm test --watch

# Run with coverage
npx pnpm test --coverage

# Run specific file
npx pnpm test entity-list.test.tsx

# Run with verbose output
npx pnpm test --verbose
```

---

## Phase 5: E2E Tests (Optional, 60+ mins)

### 5.1 Setup Playwright

```bash
cd apps/web
npm init playwright@latest
```

### 5.2 Write E2E Test

**File**: `apps/web/e2e/entity-management.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Entity Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto("/login");
    await page.fill('[name="email"]', "admin@gilabs.com");
    await page.fill('[name="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");

    // Navigate to entity page
    await page.click("text=Entities");
    await page.waitForURL("**/entities");
  });

  test("should display entity list", async ({ page }) => {
    // Assert
    await expect(page.locator("h1")).toContainText("Entity Management");
    await expect(page.locator("table")).toBeVisible();
  });

  test("should create new entity", async ({ page }) => {
    // Act
    await page.click("text=Create Entity");
    await page.fill('[name="name"]', "Test E2E Entity");
    await page.selectOption('[name="type"]', "TYPE_A");
    await page.fill('[name="amount"]', "100");
    await page.click('button:has-text("Save")');

    // Assert
    await expect(
      page.locator("text=Entity created successfully"),
    ).toBeVisible();
    await expect(page.locator("text=Test E2E Entity")).toBeVisible();
  });

  test("should edit entity", async ({ page }) => {
    // Act
    await page.click("text=Test E2E Entity");
    await page.click('button:has-text("Edit")');
    await page.fill('[name="name"]', "Updated Entity Name");
    await page.click('button:has-text("Save")');

    // Assert
    await expect(
      page.locator("text=Entity updated successfully"),
    ).toBeVisible();
    await expect(page.locator("text=Updated Entity Name")).toBeVisible();
  });

  test("should delete entity", async ({ page }) => {
    // Act
    await page.click("text=Updated Entity Name");
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');

    // Assert
    await expect(
      page.locator("text=Entity deleted successfully"),
    ).toBeVisible();
    await expect(page.locator("text=Updated Entity Name")).not.toBeVisible();
  });
});
```

### 5.3 Run E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test
npx playwright test entity-management

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

---

## Phase 6: Test Best Practices

### 6.1 Testing Principles

#### AAA Pattern

```typescript
// Arrange - Set up test data and mocks
const mockData = { id: "1", name: "Test" };
mockService.get.mockResolvedValue(mockData);

// Act - Execute the code being tested
const result = await service.get("1");

// Assert - Verify the results
expect(result.name).toBe("Test");
```

#### FIRST Principles

- **Fast**: Tests should run quickly
- **Independent**: No dependencies between tests
- **Repeatable**: Same results every time
- **Self-validating**: Pass/fail clearly defined
- **Timely**: Write tests before or with code

### 6.2 Test Coverage Goals

| Layer                 | Target Coverage |
| --------------------- | --------------- |
| Usecase (Backend)     | 80%+            |
| Repository (Backend)  | 70%+            |
| Handler (Backend)     | 60%+            |
| Hooks (Frontend)      | 70%+            |
| Services (Frontend)   | 60%+            |
| Schemas (Frontend)    | 90%+            |
| Components (Frontend) | 50%+            |

### 6.3 Test Data Management

#### Fixtures

```typescript
// apps/web/src/test/fixtures/entities.ts
export const mockEntity = {
  id: "ae000001-0000-0000-0000-000000000001",
  name: "Test Entity",
  status: "ACTIVE",
  created_at: "2024-01-15T10:30:00Z",
};

export const mockEntities = [
  mockEntity,
  {
    ...mockEntity,
    id: "ae000002-0000-0000-0000-000000000002",
    name: "Entity 2",
  },
];
```

#### Factories

```typescript
// apps/web/src/test/factories/entity-factory.ts
export const createMockEntity = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  status: "ACTIVE",
  created_at: faker.date.recent().toISOString(),
  ...overrides,
});
```

---

## Phase 7: CI/CD Integration

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: gims_test
        ports:
          - 5434:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: "1.21"

      - name: Run backend tests
        run: |
          cd apps/api
          go test -v -race -coverprofile=coverage.out ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/api/coverage.out

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: |
          cd apps/web
          npm ci

      - name: Run frontend tests
        run: |
          cd apps/web
          npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/web/coverage/lcov.info
```

---

## Phase 8: Test Documentation (15 mins)

### 8.1 Create Test Documentation

**Location**: `docs/testing/<feature>-test-plan.md`

````markdown
# <Feature Name> Test Plan

## Overview

- **Feature**: <Feature Name>
- **Domain**: <Domain> (HRD/Sales/Purchase/etc.)
- **Version**: 1.0
- **Last Updated**: YYYY-MM-DD

## Test Scope

### In Scope

- Unit tests for business logic
- Integration tests for API endpoints
- Component tests for UI
- E2E tests for critical workflows

### Out of Scope

- Third-party integrations (mocked)
- Performance testing (separate plan)
- Security testing (separate plan)

## Test Strategy

### Unit Tests

**Coverage Target**: 80%+
**Tools**: Go testing, Jest, React Testing Library

#### Backend Unit Tests

| Component  | Test File              | Coverage |
| ---------- | ---------------------- | -------- |
| Usecase    | `*_usecase_test.go`    | 85%      |
| Repository | `*_repository_test.go` | 70%      |
| Handler    | `*_handler_test.go`    | 60%      |

#### Frontend Unit Tests

| Component | Test File           | Coverage |
| --------- | ------------------- | -------- |
| Hooks     | `use-*.test.ts`     | 80%      |
| Services  | `*-service.test.ts` | 70%      |
| Schemas   | `*.schema.test.ts`  | 90%      |

### Integration Tests

**Scope**: API endpoints with database
**Tools**: httptest, testcontainers

#### Test Scenarios

1. **Create Entity**
   - Valid request → 201 Created
   - Invalid request → 400 Bad Request
   - Duplicate → 409 Conflict

2. **Get Entity**
   - Existing ID → 200 OK
   - Non-existing ID → 404 Not Found
   - Invalid ID format → 400 Bad Request

### E2E Tests

**Scope**: Complete user workflows
**Tools**: Playwright

#### Test Cases

1. **CRUD Workflow**
   - Create entity
   - View in list
   - Edit entity
   - Delete entity

2. **Error Handling**
   - Network error
   - Validation error
   - Permission denied

## Test Data

### Test Fixtures

```typescript
// Fixture file: src/test/fixtures/entities.ts
export const mockEntities = [
  {
    id: "test-uuid-1",
    name: "Test Entity 1",
    status: "ACTIVE",
  },
  // ...
];
```
````

### Test Database

- **Name**: gims_test
- **Reset**: Before each test suite
- **Seed**: Minimal required data

## Test Execution

### Pre-requisites

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
cd apps/api && go run cmd/migrate/main.go

# Seed test data
cd apps/api && go run cmd/seed/main.go --env=test
```

### Running Tests

```bash
# All tests
make test

# Specific domain
cd apps/api && go test ./internal/hrd/...

# With coverage
cd apps/api && go test -cover ./...

# E2E tests
cd apps/web && npx playwright test
```

## Test Results

### Coverage Reports

- **Backend**: `apps/api/coverage.out`
- **Frontend**: `apps/web/coverage/`

### Current Status

| Test Type   | Total | Passed | Failed | Coverage |
| ----------- | ----- | ------ | ------ | -------- |
| Unit        | 50    | 50     | 0      | 82%      |
| Integration | 20    | 20     | 0      | -        |
| E2E         | 10    | 10     | 0      | -        |

## Known Issues

| Issue            | Severity | Workaround | Ticket |
| ---------------- | -------- | ---------- | ------ |
| Flaky test in CI | Medium   | Retry 3x   | #XXX   |

## Maintenance

- Review and update monthly
- Update when feature changes
- Add tests for new bugs

## Related Documentation

- [Testing Strategy](../testing-strategy.md)
- [API Testing Guide](../api-testing-guide.md)
- [E2E Testing Guide](../e2e-testing-guide.md)

````

### 8.2 Document Test Cases

#### Create Test Case Documentation
**Location**: `docs/testing/test-cases/<feature>.md`

```markdown
## Test Case: TC-001 - Create Valid Entity

**Objective**: Verify entity can be created with valid data

**Pre-conditions**:
- User is authenticated
- User has 'entity.create' permission

**Steps**:
1. Navigate to /entities
2. Click "Create" button
3. Fill in valid data:
   - Name: "Test Entity"
   - Status: "ACTIVE"
4. Click "Save"

**Expected Results**:
1. Form validates successfully
2. API returns 201 Created
3. Success toast appears
4. Entity appears in list
5. URL redirects to list

**Test Data**:
```json
{
  "name": "Test Entity",
  "status": "ACTIVE"
}
````

**Automated**: ✅ Yes (e2e/entity.spec.ts)

````

### 8.3 Update Feature Documentation

Add testing section to feature docs:

```markdown
## Testing

### Automated Tests
```bash
# Run all tests for this feature
cd apps/api && go test ./internal/<domain>/... -v
cd apps/web && npx pnpm test <feature>
````

### Test Coverage

- Backend: 85% (usecase), 70% (repository)
- Frontend: 80% (hooks), 60% (components)

### Manual Testing

1. Create entity with valid data
2. Verify validation errors
3. Test pagination
4. Test search/filter

````

### 8.4 Create Testing Cheat Sheet
**Location**: `docs/testing/<feature>-cheatsheet.md`

Quick reference for developers:
```markdown
# <Feature> Testing Cheat Sheet

## Quick Commands
```bash
# Unit tests
cd apps/api && go test ./internal/<domain>/domain/usecase/... -v

# Component tests
cd apps/web && npx pnpm test <feature>-list.test.tsx

# E2E
cd apps/web && npx playwright test <feature>.spec.ts --headed
````

## Common Test Scenarios

1. Empty list → Should show empty state
2. API error → Should show error message
3. Form validation → Required fields error
4. Create success → List should update

## Debugging

- Check `apps/api/logs/test.log`
- Use `console.log` in tests
- React DevTools Profiler for performance

````

### 8.5 Documentation Checklist
- [ ] Test plan created
- [ ] Test cases documented
- [ ] Test data fixtures created
- [ ] Automated tests referenced in docs
- [ ] Manual test steps documented
- [ ] Coverage targets defined
- [ ] Known issues documented
- [ ] Debugging guide provided
- [ ] Feature documentation updated with testing section

---

## Quick Test Commands

```bash
# Backend
cd apps/api
go test ./... -v                    # Verbose
go test ./... -race                 # Race detection
go test ./... -cover                # Coverage
go test ./... -run TestName         # Specific test

# Frontend
cd apps/web
npx pnpm test                       # All tests
npx pnpm test --watch              # Watch mode
npx pnpm test --coverage           # With coverage
npx pnpm test EntityList           # Specific file

# E2E
cd apps/web
npx playwright test                 # All E2E
npx playwright test --headed       # See browser
npx playwright test --debug        # Debug mode
````

Ready to test thoroughly!
