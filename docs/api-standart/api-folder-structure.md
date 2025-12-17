# API Folder Structure Standards
## WebApp Ticketing Platform - Backend API

**Versi**: 1.0  
**Status**: Active  
**Last Updated**: 2025

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Prinsip Feature-Based Structure](#prinsip-feature-based-structure)
3. [Struktur Folder Lengkap](#struktur-folder-lengkap)
4. [Step-by-Step: Membuat Module Baru](#step-by-step-membuat-module-baru)
5. [Template Code untuk Setiap Layer](#template-code-untuk-setiap-layer)
6. [Naming Conventions](#naming-conventions)
7. [Best Practices](#best-practices)
8. [Checklist Module Baru](#checklist-module-baru)
9. [Contoh Implementasi](#contoh-implementasi)

---

## Overview

Dokumentasi ini menjelaskan **standar struktur folder** untuk membuat module/fitur baru di API. Semua module mengikuti **Feature-Based Structure** yang konsisten untuk memastikan:

- **Konsistensi**: Struktur folder sama di semua module
- **Scalability**: Mudah menambah module baru tanpa mengganggu yang sudah ada
- **Maintainability**: File terkait satu feature terorganisir dengan baik
- **Navigability**: Developer mudah menemukan file terkait satu feature

---

## Prinsip Feature-Based Structure

### ✅ Feature-Based (Recommended)

Setiap feature memiliki folder sendiri di setiap layer:

```
internal/
├── domain/
│   └── feature_name/
│       └── entity.go
├── repository/
│   ├── interfaces/
│   │   └── feature_name/
│   │       └── repository.go
│   └── postgres/
│       └── feature_name/
│           └── repository.go
├── service/
│   └── feature_name/
│       └── service.go
└── api/
    ├── handlers/
    │   └── feature_name/
    │       └── handler.go
    └── routes/
        └── feature_name/
            └── routes.go
```

**Keuntungan**:
- ✅ File terkait satu feature terorganisir
- ✅ Package names lebih ringkas (`package feature_name` bukan `package feature_name_handler`)
- ✅ Mudah menemukan semua file terkait satu feature
- ✅ Scalable untuk project besar

---

## Struktur Folder Lengkap

### Struktur untuk Module Baru: `ticket`

```
apps/api/
├── internal/
│   ├── domain/
│   │   └── ticket/                    # Domain Layer
│   │       └── entity.go              # Entity, DTOs, Request/Response models
│   │
│   ├── repository/
│   │   ├── interfaces/
│   │   │   └── ticket/                # Repository Interface
│   │   │       └── repository.go      # Interface contract
│   │   └── postgres/
│   │       └── ticket/                 # Repository Implementation
│   │           └── repository.go     # PostgreSQL implementation
│   │
│   ├── service/
│   │   └── ticket/                     # Service Layer
│   │       └── service.go              # Business logic
│   │
│   └── api/
│       ├── handlers/
│       │   └── ticket/                 # HTTP Handlers
│       │       └── handler.go          # Request handlers
│       └── routes/
│           └── ticket/                 # Route Definitions
│               └── routes.go           # Route setup
│
└── seeders/
    └── ticket/                         # Database Seeders (optional)
        └── seeder.go                   # Initial data seeder
```

---

## Step-by-Step: Membuat Module Baru

### Step 1: Buat Domain Entity

**Lokasi**: `internal/domain/ticket/entity.go`

```go
package ticket

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// Ticket represents a ticket entity
type Ticket struct {
    ID          string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    Code        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"code"`
    Title       string    `gorm:"type:varchar(255);not null" json:"title"`
    Description string    `gorm:"type:text" json:"description"`
    Status      string    `gorm:"type:varchar(50);default:'pending'" json:"status"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name
func (Ticket) TableName() string {
    return "tickets"
}

// BeforeCreate hook to generate UUID
func (t *Ticket) BeforeCreate(tx *gorm.DB) error {
    if t.ID == "" {
        t.ID = uuid.New().String()
    }
    return nil
}

// TicketResponse represents ticket response DTO
type TicketResponse struct {
    ID          string    `json:"id"`
    Code        string    `json:"code"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    Status      string    `json:"status"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// ToTicketResponse converts Ticket to TicketResponse
func (t *Ticket) ToTicketResponse() *TicketResponse {
    return &TicketResponse{
        ID:          t.ID,
        Code:        t.Code,
        Title:       t.Title,
        Description: t.Description,
        Status:      t.Status,
        CreatedAt:   t.CreatedAt,
        UpdatedAt:   t.UpdatedAt,
    }
}

// CreateTicketRequest represents create ticket request
type CreateTicketRequest struct {
    Code        string `json:"code" binding:"required"`
    Title       string `json:"title" binding:"required"`
    Description string `json:"description"`
}

// UpdateTicketRequest represents update ticket request
type UpdateTicketRequest struct {
    Title       string `json:"title"`
    Description string `json:"description"`
    Status      string `json:"status"`
}
```

### Step 2: Buat Repository Interface

**Lokasi**: `internal/repository/interfaces/ticket/repository.go`

```go
package ticket

import (
    "github.com/gilabs/webapp-ticket-konser/api/internal/domain/ticket"
)

// Repository defines the interface for ticket repository operations
type Repository interface {
    // FindByID finds a ticket by ID
    FindByID(id string) (*ticket.Ticket, error)
    
    // FindByCode finds a ticket by code
    FindByCode(code string) (*ticket.Ticket, error)
    
    // Create creates a new ticket
    Create(t *ticket.Ticket) error
    
    // Update updates a ticket
    Update(t *ticket.Ticket) error
    
    // Delete soft deletes a ticket
    Delete(id string) error
    
    // List lists all tickets
    List() ([]*ticket.Ticket, error)
}
```

### Step 3: Buat Repository Implementation

**Lokasi**: `internal/repository/postgres/ticket/repository.go`

```go
package ticket

import (
    "errors"
    "github.com/gilabs/webapp-ticket-konser/api/internal/domain/ticket"
    ticketrepo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/interfaces/ticket"
    "gorm.io/gorm"
)

var (
    ErrTicketNotFound = errors.New("ticket not found")
)

type Repository struct {
    db *gorm.DB
}

// NewRepository creates a new ticket repository
func NewRepository(db *gorm.DB) ticketrepo.Repository {
    return &Repository{
        db: db,
    }
}

// FindByID finds a ticket by ID
func (r *Repository) FindByID(id string) (*ticket.Ticket, error) {
    var t ticket.Ticket
    if err := r.db.Where("id = ?", id).First(&t).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrTicketNotFound
        }
        return nil, err
    }
    return &t, nil
}

// FindByCode finds a ticket by code
func (r *Repository) FindByCode(code string) (*ticket.Ticket, error) {
    var t ticket.Ticket
    if err := r.db.Where("code = ?", code).First(&t).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrTicketNotFound
        }
        return nil, err
    }
    return &t, nil
}

// Create creates a new ticket
func (r *Repository) Create(t *ticket.Ticket) error {
    return r.db.Create(t).Error
}

// Update updates a ticket
func (r *Repository) Update(t *ticket.Ticket) error {
    return r.db.Save(t).Error
}

// Delete soft deletes a ticket
func (r *Repository) Delete(id string) error {
    return r.db.Where("id = ?", id).Delete(&ticket.Ticket{}).Error
}

// List lists all tickets
func (r *Repository) List() ([]*ticket.Ticket, error) {
    var tickets []*ticket.Ticket
    if err := r.db.Find(&tickets).Error; err != nil {
        return nil, err
    }
    return tickets, nil
}
```

### Step 4: Buat Service Layer

**Lokasi**: `internal/service/ticket/service.go`

```go
package ticket

import (
    "errors"
    "github.com/gilabs/webapp-ticket-konser/api/internal/domain/ticket"
    ticketrepo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/interfaces/ticket"
    "gorm.io/gorm"
)

var (
    ErrTicketNotFound      = errors.New("ticket not found")
    ErrTicketAlreadyExists = errors.New("ticket already exists")
)

type Service struct {
    repo ticketrepo.Repository
}

func NewService(repo ticketrepo.Repository) *Service {
    return &Service{
        repo: repo,
    }
}

// GetByID returns a ticket by ID
func (s *Service) GetByID(id string) (*ticket.TicketResponse, error) {
    t, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrTicketNotFound
        }
        return nil, err
    }
    return t.ToTicketResponse(), nil
}

// Create creates a new ticket
func (s *Service) Create(req *ticket.CreateTicketRequest) (*ticket.TicketResponse, error) {
    // Check if code already exists
    _, err := s.repo.FindByCode(req.Code)
    if err == nil {
        return nil, ErrTicketAlreadyExists
    }
    if !errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, err
    }

    // Create ticket
    t := &ticket.Ticket{
        Code:        req.Code,
        Title:       req.Title,
        Description: req.Description,
        Status:      "pending",
    }

    if err := s.repo.Create(t); err != nil {
        return nil, err
    }

    // Reload to get generated fields
    createdTicket, err := s.repo.FindByID(t.ID)
    if err != nil {
        return nil, err
    }

    return createdTicket.ToTicketResponse(), nil
}

// Update updates a ticket
func (s *Service) Update(id string, req *ticket.UpdateTicketRequest) (*ticket.TicketResponse, error) {
    // Find ticket
    t, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrTicketNotFound
        }
        return nil, err
    }

    // Update fields
    if req.Title != "" {
        t.Title = req.Title
    }
    if req.Description != "" {
        t.Description = req.Description
    }
    if req.Status != "" {
        t.Status = req.Status
    }

    if err := s.repo.Update(t); err != nil {
        return nil, err
    }

    // Reload
    updatedTicket, err := s.repo.FindByID(t.ID)
    if err != nil {
        return nil, err
    }

    return updatedTicket.ToTicketResponse(), nil
}

// Delete deletes a ticket
func (s *Service) Delete(id string) error {
    _, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return ErrTicketNotFound
        }
        return err
    }

    return s.repo.Delete(id)
}

// List lists all tickets
func (s *Service) List() ([]*ticket.TicketResponse, error) {
    tickets, err := s.repo.List()
    if err != nil {
        return nil, err
    }

    responses := make([]*ticket.TicketResponse, len(tickets))
    for i, t := range tickets {
        responses[i] = t.ToTicketResponse()
    }

    return responses, nil
}
```

### Step 5: Buat Handler

**Lokasi**: `internal/api/handlers/ticket/handler.go`

```go
package ticket

import (
    "github.com/gin-gonic/gin"
    "github.com/gilabs/webapp-ticket-konser/api/internal/domain/ticket"
    ticketservice "github.com/gilabs/webapp-ticket-konser/api/internal/service/ticket"
    "github.com/gilabs/webapp-ticket-konser/api/pkg/errors"
    "github.com/gilabs/webapp-ticket-konser/api/pkg/response"
)

type Handler struct {
    ticketService *ticketservice.Service
}

func NewHandler(ticketService *ticketservice.Service) *Handler {
    return &Handler{
        ticketService: ticketService,
    }
}

// GetByID gets a ticket by ID
// GET /api/v1/tickets/:id
func (h *Handler) GetByID(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        errors.BadRequestResponse(c, "INVALID_REQUEST", map[string]interface{}{
            "field": "id",
            "reason": "ID is required",
        }, nil)
        return
    }

    ticket, err := h.ticketService.GetByID(id)
    if err != nil {
        if err == ticketservice.ErrTicketNotFound {
            errors.NotFoundResponse(c, "TICKET_NOT_FOUND", map[string]interface{}{
                "id": id,
            }, nil)
            return
        }
        errors.InternalServerErrorResponse(c, "")
        return
    }

    response.SuccessResponse(c, ticket, nil)
}

// Create creates a new ticket
// POST /api/v1/tickets
func (h *Handler) Create(c *gin.Context) {
    var req ticket.CreateTicketRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        errors.BadRequestResponse(c, "VALIDATION_ERROR", map[string]interface{}{
            "reason": err.Error(),
        }, nil)
        return
    }

    ticket, err := h.ticketService.Create(&req)
    if err != nil {
        if err == ticketservice.ErrTicketAlreadyExists {
            errors.ConflictResponse(c, "TICKET_ALREADY_EXISTS", map[string]interface{}{
                "code": req.Code,
            }, nil)
            return
        }
        errors.InternalServerErrorResponse(c, "")
        return
    }

    response.SuccessResponse(c, ticket, nil)
}

// Update updates a ticket
// PUT /api/v1/tickets/:id
func (h *Handler) Update(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        errors.BadRequestResponse(c, "INVALID_REQUEST", map[string]interface{}{
            "field": "id",
            "reason": "ID is required",
        }, nil)
        return
    }

    var req ticket.UpdateTicketRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        errors.BadRequestResponse(c, "VALIDATION_ERROR", map[string]interface{}{
            "reason": err.Error(),
        }, nil)
        return
    }

    ticket, err := h.ticketService.Update(id, &req)
    if err != nil {
        if err == ticketservice.ErrTicketNotFound {
            errors.NotFoundResponse(c, "TICKET_NOT_FOUND", map[string]interface{}{
                "id": id,
            }, nil)
            return
        }
        errors.InternalServerErrorResponse(c, "")
        return
    }

    response.SuccessResponse(c, ticket, nil)
}

// Delete deletes a ticket
// DELETE /api/v1/tickets/:id
func (h *Handler) Delete(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        errors.BadRequestResponse(c, "INVALID_REQUEST", map[string]interface{}{
            "field": "id",
            "reason": "ID is required",
        }, nil)
        return
    }

    err := h.ticketService.Delete(id)
    if err != nil {
        if err == ticketservice.ErrTicketNotFound {
            errors.NotFoundResponse(c, "TICKET_NOT_FOUND", map[string]interface{}{
                "id": id,
            }, nil)
            return
        }
        errors.InternalServerErrorResponse(c, "")
        return
    }

    response.SuccessResponse(c, gin.H{"message": "Ticket deleted successfully"}, nil)
}

// List lists all tickets
// GET /api/v1/tickets
func (h *Handler) List(c *gin.Context) {
    tickets, err := h.ticketService.List()
    if err != nil {
        errors.InternalServerErrorResponse(c, "")
        return
    }

    response.SuccessResponse(c, tickets, nil)
}
```

### Step 6: Buat Routes

**Lokasi**: `internal/api/routes/ticket/routes.go`

```go
package ticket

import (
    "github.com/gin-gonic/gin"
    "github.com/gilabs/webapp-ticket-konser/api/internal/api/handlers/ticket"
    "github.com/gilabs/webapp-ticket-konser/api/internal/api/middleware"
    "github.com/gilabs/webapp-ticket-konser/api/internal/repository/interfaces/role"
    "github.com/gilabs/webapp-ticket-konser/api/pkg/jwt"
)

func SetupRoutes(
    router *gin.RouterGroup,
    ticketHandler *ticket.Handler,
    roleRepo role.Repository,
    jwtManager *jwt.JWTManager,
) {
    // Public ticket routes (for authenticated users)
    ticketRoutes := router.Group("/tickets")
    ticketRoutes.Use(middleware.AuthMiddleware(jwtManager))
    {
        ticketRoutes.GET("", ticketHandler.List)           // Get all tickets
        ticketRoutes.GET("/:id", ticketHandler.GetByID)   // Get ticket by ID
    }

    // Admin only routes
    adminRoutes := router.Group("/admin/tickets")
    adminRoutes.Use(middleware.AuthMiddleware(jwtManager))
    adminRoutes.Use(middleware.RequirePermission("ticket.read", roleRepo))
    {
        adminRoutes.POST("", ticketHandler.Create)        // Create ticket (admin)
        adminRoutes.PUT("/:id", ticketHandler.Update)     // Update ticket (admin)
        adminRoutes.DELETE("/:id", ticketHandler.Delete) // Delete ticket (admin)
    }
}
```

### Step 7: Register di main.go

**Lokasi**: `cmd/server/main.go`

Tambahkan import dan setup:

```go
// Import handlers
tickethandler "github.com/gilabs/webapp-ticket-konser/api/internal/api/handlers/ticket"

// Import routes
ticketroutes "github.com/gilabs/webapp-ticket-konser/api/internal/api/routes/ticket"

// Import repositories
ticketrepo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/postgres/ticket"

// Import services
ticketservice "github.com/gilabs/webapp-ticket-konser/api/internal/service/ticket"
```

Di dalam `main()` function:

```go
// Setup repositories
ticketRepo := ticketrepo.NewRepository(database.DB)

// Setup services
ticketService := ticketservice.NewService(ticketRepo)

// Setup handlers
ticketHandler := tickethandler.NewHandler(ticketService)

// Setup router
router := setupRouter(
    jwtManager,
    authHandler,
    menuHandler,
    ticketHandler,  // Add this
    roleRepo,
)
```

Update `setupRouter()` function:

```go
func setupRouter(
    jwtManager *jwt.JWTManager,
    authHandler *authhandler.Handler,
    menuHandler *menuhandler.Handler,
    ticketHandler *tickethandler.Handler,  // Add this
    roleRepo role.Repository,
) *gin.Engine {
    // ... existing code ...

    // API v1 routes
    v1 := router.Group("/api/v1")
    {
        // ... existing routes ...

        // Ticket routes
        ticketroutes.SetupRoutes(v1, ticketHandler, roleRepo, jwtManager)
    }

    return router
}
```

### Step 8: Update Database Migration

**Lokasi**: `internal/database/database.go`

Tambahkan entity ke `AutoMigrate()`:

```go
func AutoMigrate() error {
    return database.DB.AutoMigrate(
        // ... existing entities ...
        &ticket.Ticket{},
    )
}
```

Jangan lupa import:

```go
"github.com/gilabs/webapp-ticket-konser/api/internal/domain/ticket"
```

---

## Naming Conventions

### Folder Names
- ✅ **Kebab-case**: `ticket-management`, `user-profile`
- ✅ **Singular**: `ticket` (bukan `tickets`)
- ✅ **Lowercase**: `ticket` (bukan `Ticket`)

### Package Names
- ✅ **Lowercase**: `package ticket` (bukan `package Ticket`)
- ✅ **Singular**: `package ticket` (bukan `package tickets`)
- ✅ **No underscores**: `package ticket` (bukan `package ticket_management`)

### File Names
- ✅ **Snake_case**: `handler.go`, `repository.go`, `service.go`
- ✅ **Descriptive**: `handler.go` (bukan `h.go`)

### Type Names
- ✅ **PascalCase**: `Ticket`, `TicketResponse`, `CreateTicketRequest`
- ✅ **Descriptive**: `TicketHandler` (bukan `TH`)

### Function Names
- ✅ **PascalCase** untuk exported: `NewHandler`, `GetByID`
- ✅ **camelCase** untuk unexported: `validateRequest`
- ✅ **Verb-based**: `Create`, `Update`, `Delete`, `GetByID`

---

## Best Practices

### 1. Dependency Injection

✅ **GOOD**: Inject dependencies via constructor

```go
func NewHandler(ticketService *ticketservice.Service) *Handler {
    return &Handler{
        ticketService: ticketService,
    }
}
```

❌ **BAD**: Create dependencies inside handler

```go
func (h *Handler) Create(c *gin.Context) {
    repo := ticketrepo.NewRepository(database.DB) // BAD!
    // ...
}
```

### 2. Error Handling

✅ **GOOD**: Use custom errors from service

```go
if err == ticketservice.ErrTicketNotFound {
    errors.NotFoundResponse(c, "TICKET_NOT_FOUND", ...)
    return
}
```

❌ **BAD**: Return raw database errors

```go
if err != nil {
    c.JSON(500, err.Error()) // BAD!
    return
}
```

### 3. Response Format

✅ **GOOD**: Use standard response helpers

```go
response.SuccessResponse(c, ticket, nil)
errors.NotFoundResponse(c, "TICKET_NOT_FOUND", ...)
```

❌ **BAD**: Manual JSON response

```go
c.JSON(200, gin.H{"data": ticket}) // BAD!
```

### 4. Package Aliases

✅ **GOOD**: Use aliases to avoid conflicts

```go
ticketrepo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/interfaces/ticket"
ticketservice "github.com/gilabs/webapp-ticket-konser/api/internal/service/ticket"
```

### 5. Interface-Based Design

✅ **GOOD**: Service depends on interface, not implementation

```go
type Service struct {
    repo ticketrepo.Repository  // Interface, not concrete type
}
```

---

## Checklist Module Baru

Gunakan checklist ini untuk memastikan semua layer sudah dibuat:

### Domain Layer
- [ ] `internal/domain/{feature}/entity.go` dibuat
- [ ] Entity struct dengan GORM tags
- [ ] Response DTO struct
- [ ] Request DTO structs (Create, Update, List)
- [ ] `ToResponse()` method untuk convert entity ke DTO
- [ ] `TableName()` method
- [ ] `BeforeCreate()` hook untuk UUID generation

### Repository Interface
- [ ] `internal/repository/interfaces/{feature}/repository.go` dibuat
- [ ] Interface `Repository` didefinisikan
- [ ] Semua method yang diperlukan didefinisikan
- [ ] Method signatures menggunakan domain types

### Repository Implementation
- [ ] `internal/repository/postgres/{feature}/repository.go` dibuat
- [ ] Struct `Repository` dengan `db *gorm.DB`
- [ ] `NewRepository()` constructor
- [ ] Semua method dari interface diimplementasikan
- [ ] Error handling untuk `gorm.ErrRecordNotFound`
- [ ] Custom error variables didefinisikan

### Service Layer
- [ ] `internal/service/{feature}/service.go` dibuat
- [ ] Struct `Service` dengan repository dependency
- [ ] `NewService()` constructor
- [ ] Business logic methods
- [ ] Error handling dan custom errors
- [ ] Validation logic

### Handler Layer
- [ ] `internal/api/handlers/{feature}/handler.go` dibuat
- [ ] Struct `Handler` dengan service dependency
- [ ] `NewHandler()` constructor
- [ ] HTTP handler methods untuk setiap endpoint
- [ ] Request validation
- [ ] Error handling dengan standard responses
- [ ] Response formatting dengan `response.SuccessResponse()`

### Routes Layer
- [ ] `internal/api/routes/{feature}/routes.go` dibuat
- [ ] `SetupRoutes()` function
- [ ] Route groups (public, admin, etc.)
- [ ] Middleware (auth, permission) jika diperlukan
- [ ] Route paths mengikuti RESTful conventions

### Main.go Registration
- [ ] Import semua packages yang diperlukan
- [ ] Repository diinisialisasi
- [ ] Service diinisialisasi
- [ ] Handler diinisialisasi
- [ ] Routes di-register di router
- [ ] Entity ditambahkan ke `AutoMigrate()`

### Optional: Seeder
- [ ] `seeders/{feature}/seeder.go` dibuat (jika diperlukan)
- [ ] `Seed()` function
- [ ] Ditambahkan ke `seeders/seed_all.go`

### Testing
- [ ] Unit tests untuk service layer
- [ ] Integration tests untuk endpoints
- [ ] Error cases di-test

---

## Contoh Implementasi

Lihat implementasi yang sudah ada sebagai referensi:

- **Auth Module**: `internal/domain/auth/`, `internal/service/auth/`, `internal/api/handlers/auth/`
- **Menu Module**: `internal/domain/menu/`, `internal/service/menu/`, `internal/api/handlers/menu/`
- **User Module**: `internal/domain/user/`, `internal/service/user/`, `internal/api/handlers/user/`

---

## Quick Reference

### Import Paths Pattern

```go
// Domain
"github.com/gilabs/webapp-ticket-konser/api/internal/domain/{feature}"

// Repository Interface
{feature}repo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/interfaces/{feature}"

// Repository Implementation
{feature}repo "github.com/gilabs/webapp-ticket-konser/api/internal/repository/postgres/{feature}"

// Service
{feature}service "github.com/gilabs/webapp-ticket-konser/api/internal/service/{feature}"

// Handler
{feature}handler "github.com/gilabs/webapp-ticket-konser/api/internal/api/handlers/{feature}"

// Routes
{feature}routes "github.com/gilabs/webapp-ticket-konser/api/internal/api/routes/{feature}"
```

### File Structure Template

```
{feature}/
├── entity.go          (Domain)
├── repository.go     (Interface)
├── repository.go     (Implementation)
├── service.go        (Service)
├── handler.go        (Handler)
└── routes.go         (Routes)
```

---

**Last Updated**: 2025  
**Maintained By**: Development Team  
**Related Documents**: 
- [API Response Standards](./api-response-standards.md)
- [API Error Codes](./api-error-codes.md)
- [API Structure Documentation](../../apps/api/STRUCTURE.md)



