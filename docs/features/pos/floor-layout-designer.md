# POS Floor & Layout Designer

> **Module:** POS (Point of Sale)
> **Sprint:** 14
> **Version:** 1.0.0
> **Status:** Complete
> **Last Updated:** July 2025

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Data Models](#data-models)
- [Business Logic](#business-logic)
- [API Reference](#api-reference)
- [Frontend Components](#frontend-components)
- [Permissions](#permissions)
- [Keputusan Teknis](#keputusan-teknis)
- [Notes & Improvements](#notes--improvements)

---

## Overview

Gamified floor layout designer for POS outlets. Allows owners/managers to design restaurant floor plans with drag-and-drop canvas editing, multi-floor support, and version control. Designed with a Sims-like aesthetic for intuitive layout creation.

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-outlet support | Owner (franchise) sees all companies; Manager sees only their outlet |
| Multi-floor support | Each outlet can have multiple floor plans (floor 1, floor 2, etc.) |
| Canvas editor | SVG-based drag-and-drop editor with grid snapping |
| Object palette | Tables, chairs, walls, doors, cashier, zones, decorations |
| Object inspector | Edit properties of selected objects (position, size, rotation, type-specific) |
| Version control | Draft/Published status with immutable version snapshots |
| RBAC | Permission-scoped access (ALL = owner, OWN = manager) |

---

## Features

### Object Types

| Type | Attributes | Visual |
|------|-----------|--------|
| Table | tableNumber, tableShape (rect/circle/square), capacity, label | Amber colored rect/circle |
| Chair | - | Small blue circle |
| Wall | thickness | Dark slate rectangle |
| Door | doorWidth | Yellow with swing arc |
| Cashier | label | Green with monitor icon |
| Zone | zoneType, color, opacity | Transparent colored overlay with dashed border |
| Decoration | label | Pink with decorative symbol |

### Zone Types
dining, vip, outdoor, bar, kitchen, storage, entrance, restroom, waiting

### Canvas Features
- Dot grid with snap-to-grid
- Zoom (25%-300%) via Ctrl+Scroll or toolbar buttons
- Pan via middle mouse button drag
- Undo/Redo with 50-entry deep history
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo), Delete, Ctrl+D (duplicate), Escape

---

## System Architecture

### Backend Structure
```
apps/api/internal/pos/
├── data/
│   └── models/
│       ├── floor_plan.go        # FloorPlan GORM entity
│       └── layout_version.go    # LayoutVersion GORM entity
│   └── repositories/
│       └── floor_plan_repository.go  # RBAC-aware data access
├── domain/
│   ├── dto/
│   │   └── floor_plan_dto.go    # Request/Response DTOs
│   ├── mapper/
│   │   └── floor_plan_mapper.go # Model-DTO conversion
│   └── usecase/
│       └── floor_plan_usecase.go # Business logic with ownership checks
└── presentation/
    ├── handler/
    │   └── floor_plan_handler.go # HTTP handlers
    ├── router/
    │   └── floor_plan_router.go  # Route definitions
    └── routers.go                # Domain aggregator
```

### Frontend Structure
```
apps/web/src/features/pos/floor-layout/
├── types/index.d.ts              # TypeScript interfaces
├── schemas/floor-layout.schema.ts # Zod validation
├── services/floor-layout-service.ts # API client
├── stores/use-canvas-store.ts     # Zustand canvas state
├── hooks/
│   ├── use-floor-layouts.ts      # TanStack Query hooks
│   └── use-canvas-editor.ts      # Canvas business logic
├── components/
│   ├── floor-layout-container.tsx # Main container (list/editor toggle)
│   ├── floor-layout-list.tsx     # Grid listing with company filter
│   ├── floor-layout-editor.tsx   # Editor wrapper
│   ├── floor-canvas.tsx          # SVG canvas with grid
│   ├── canvas-object.tsx         # Object renderers per type
│   ├── layout-palette.tsx        # Left tool sidebar
│   ├── object-inspector.tsx      # Right property panel
│   ├── layout-toolbar.tsx        # Top toolbar (save/publish/zoom)
│   ├── publish-dialog.tsx        # Publish confirmation
│   ├── version-history-panel.tsx # Version history sheet
│   ├── create-floor-plan-dialog.tsx # Create form dialog
│   └── index.ts                  # Barrel exports
└── i18n/
    ├── en.ts                     # English translations
    └── id.ts                     # Indonesian translations
```

---

## Data Models

### FloorPlan (pos_floor_plans)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Auto-generated |
| company_id | UUID (FK, indexed) | Links to companies table |
| name | string | Floor plan name |
| floor_number | int | Floor level (1-99) |
| status | string | "draft" or "published" |
| grid_size | int | Grid snap size (default: 20px) |
| snap_to_grid | bool | Whether grid snapping is enabled |
| width | int | Canvas width (default: 1200px) |
| height | int | Canvas height (default: 800px) |
| layout_data | jsonb | JSON array of LayoutObject |
| version | int | Auto-incremented on publish |
| published_at | timestamptz | Last publish timestamp |
| published_by | string | User who published |
| created_by | string | Creator user ID |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |
| deleted_at | timestamptz | Soft delete |

### LayoutVersion (pos_layout_versions)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Auto-generated |
| floor_plan_id | UUID (FK) | Links to floor plan |
| version | int | Version snapshot number |
| layout_data | jsonb | Immutable layout snapshot |
| published_at | timestamptz | When published |
| published_by | string | Who published |

---

## Business Logic

### RBAC Rules
- **Owner (permission_scope = "ALL")**: Can see and manage floor plans across ALL outlets/companies
- **Manager (permission_scope = "OWN")**: Can only see and manage floor plans for their own company (user_company_id)
- **Single permission**: `pos.layout.manage` guards all endpoints

### Publish Workflow
1. User edits layout in draft mode (autosave to layout_data)
2. User clicks "Publish" to create an immutable LayoutVersion snapshot
3. Version number increments, published_at and published_by are set
4. Published status is set on the floor plan

### Layout Data Format
`layout_data` is stored as JSONB containing an array of LayoutObject:
```json
[
  {
    "id": "obj_1234_abc",
    "type": "table",
    "x": 100, "y": 200,
    "width": 80, "height": 80,
    "rotation": 0,
    "locked": false,
    "tableNumber": 1,
    "tableShape": "rectangle",
    "capacity": 4,
    "label": "T1"
  }
]
```

---

## API Reference

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/pos/floor-plans` | pos.layout.manage | List floor plans (RBAC-filtered) |
| GET | `/pos/floor-plans/:id` | pos.layout.manage | Get single floor plan |
| POST | `/pos/floor-plans` | pos.layout.manage | Create new floor plan |
| PUT | `/pos/floor-plans/:id` | pos.layout.manage | Update floor plan metadata |
| PUT | `/pos/floor-plans/:id/layout` | pos.layout.manage | Save layout data only |
| DELETE | `/pos/floor-plans/:id` | pos.layout.manage | Soft delete floor plan |
| POST | `/pos/floor-plans/:id/publish` | pos.layout.manage | Publish (create version snapshot) |
| GET | `/pos/floor-plans/:id/versions` | pos.layout.manage | List published versions |
| GET | `/pos/floor-plans/form-data` | pos.layout.manage | Get companies dropdown |

### Query Parameters (GET /pos/floor-plans)

| Param | Type | Description |
|-------|------|-------------|
| search | string | Prefix search on name |
| company_id | UUID | Filter by company |
| status | string | Filter by draft/published |
| sort_by | string | Sort column (name, floor_number, updated_at, created_at) |
| sort_order | string | asc/desc |
| page | int | Page number |
| per_page | int | Items per page (max 100) |

---

## Frontend Components

| Component | File | Description |
|-----------|------|-------------|
| FloorLayoutContainer | floor-layout-container.tsx | Main container toggling list/editor views |
| FloorLayoutList | floor-layout-list.tsx | Card grid of floor plans with company filter |
| FloorLayoutEditor | floor-layout-editor.tsx | Full editor wrapper with toolbar, palette, canvas, inspector |
| FloorCanvas | floor-canvas.tsx | SVG canvas with grid, zoom, pan, object rendering |
| CanvasObject | canvas-object.tsx | SVG renderers for each object type (table, chair, wall, etc.) |
| LayoutPalette | layout-palette.tsx | Left sidebar with tool selection buttons |
| ObjectInspector | object-inspector.tsx | Right sidebar for editing selected object properties |
| LayoutToolbar | layout-toolbar.tsx | Top bar with undo/redo, zoom, save, publish |
| CreateFloorPlanDialog | create-floor-plan-dialog.tsx | Dialog form for creating a new floor plan |
| PublishDialog | publish-dialog.tsx | Alert dialog confirming publish action |
| VersionHistoryPanel | version-history-panel.tsx | Sheet showing version history |

---

## Permissions

| Permission | Description |
|-----------|-------------|
| pos.layout.manage | Full CRUD + publish access to POS floor layouts |

Scoped by `permission_scope`:
- `ALL` = franchise owner, can manage all outlets
- `OWN` = outlet manager, restricted to own company

---

## Keputusan Teknis

### JSONB for layout_data instead of relational object table
- **Alasan**: Layout objects are tightly coupled to a single floor plan and always loaded/saved together. JSONB avoids N+1 queries and complex joins for canvas rendering.
- **Trade-off**: Cannot query individual objects via SQL. Acceptable because objects are only accessed through their parent floor plan.

### SVG over HTML5 Canvas for rendering
- **Alasan**: SVG provides individual element event handling, CSS class styling with Tailwind tokens, and scale-independent rendering. Each object is a DOM element that can be clicked, hovered, and styled independently.
- **Trade-off**: Performance may degrade with hundreds of objects. Acceptable for typical restaurant layouts (10-50 objects).

### Click-to-place over drag-from-palette
- **Alasan**: Sims-like UX where user selects a tool then clicks canvas to place. More intuitive for spatial placement than dragging from sidebar.
- **Trade-off**: Two-step interaction (select tool, then click). Mitigated by auto-switching back to select tool after placement.

### Zustand store for canvas state, TanStack Query for server state
- **Alasan**: Canvas state (objects, selection, zoom) needs synchronous updates for smooth interaction. Server state (CRUD, versions) needs cache invalidation and async handling.
- **Trade-off**: Two state management systems. Follows existing project convention of Zustand for local state + TanStack Query for server state.

---

## Manual Testing

1. Login as admin/owner user
2. Navigate to `/pos/floor-layout`
3. Click "New Floor Plan", select an outlet, name it "Ground Floor", floor 1
4. Canvas editor opens with empty grid
5. Click "Table" in palette, then click on canvas to place a table
6. Place multiple objects: chairs, walls, doors, cashier, zone
7. Select an object, verify inspector shows correct properties
8. Edit properties in inspector (label, size, rotation)
9. Click Save Draft, verify toast success
10. Click Publish, verify version is created
11. Click version history icon, verify snapshot appears
12. Logout, login as manager user
13. Verify only own outlet's floor plans are visible

---

## Notes & Improvements

### Completed
- Full CRUD with RBAC (owner/manager scoping)
- SVG canvas editor with 7 object types
- Grid snapping, zoom, pan, undo/redo
- Version control (draft → publish → snapshot)
- i18n (English + Indonesian)

### Planned Improvements
- **Multi-select**: Shift+click to select multiple objects, bulk move/delete
- **Resize handles**: Drag corner handles to resize objects
- **Copy/paste**: Ctrl+C/V for clipboard operations
- **Mini-map**: Small overview panel for large canvases
- **Template library**: Pre-made layout templates (cafe, restaurant, bar)
- **Real-time collaboration**: Multiple users editing same layout
- **Table status integration**: Show occupied/available status from POS orders
- **Floor plan preview**: Thumbnail generation for list view cards

### Known Limitations
- No multi-select; only single object selection
- No resize via drag handles (use inspector number inputs)
- Canvas performance may degrade with 100+ objects (consider virtualization)
- No undo history persistence across browser refreshes
