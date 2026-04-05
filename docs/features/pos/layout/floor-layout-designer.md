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

Gamified floor layout designer for POS outlets. This is the visual configuration workspace for tables, chairs, walls, doors, cashier stations, and zones. It stays separate from live operations and does not own reservation, queue, invoice, payment, or stock behavior.

### Key Features

| Feature | Description |
|---|---|
| Multi-outlet support | Owner roles can see all companies; outlet managers only their scope. |
| Multi-floor support | An outlet can have multiple floors or layout layers. |
| Canvas editor | SVG-based drag-and-drop editor with grid snapping. |
| Object palette | Tables, chairs, walls, doors, cashier, zones, and decorations. |
| Object inspector | Edit properties of the selected object. |
| Version control | Draft and published states with immutable snapshots. |
| RBAC | Permission-scoped access using `pos.layout.manage`. |

---

## Features

### Object Types

| Type | Attributes | Visual |
|---|---|---|
| Table | tableNumber, tableShape, capacity, label | Amber table shapes |
| Chair | - | Small blue circle |
| Wall | thickness | Dark slate bar |
| Door | doorWidth | Yellow door with arc |
| Cashier | label | Green station marker |
| Zone | zoneType, color, opacity | Transparent area with dashed border |
| Decoration | label | Pink icon |

### Canvas Features
- Dot grid with snap-to-grid.
- Zoom controls via toolbar.
- Pan and drag interactions.
- Undo/redo history.
- Keyboard shortcuts for common canvas operations.

---

## System Architecture

### Backend Structure
```
apps/api/internal/pos/
├── data/models/
│   ├── floor_plan.go
│   └── layout_version.go
├── data/repositories/
│   └── floor_plan_repository.go
├── domain/
│   ├── dto/
│   │   └── floor_plan_dto.go
│   ├── mapper/
│   │   └── floor_plan_mapper.go
│   └── usecase/
│       └── floor_plan_usecase.go
└── presentation/
    ├── handler/
    │   └── floor_plan_handler.go
    ├── router/
    │   └── floor_plan_router.go
    └── routers.go
```

### Frontend Structure
```
apps/web/src/features/pos/floor-layout/
├── types/index.d.ts
├── schemas/floor-layout.schema.ts
├── services/floor-layout-service.ts
├── stores/use-canvas-store.ts
├── hooks/
├── components/
└── i18n/
```

---

## Data Models

### FloorPlan

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key. |
| company_id | UUID | Outlet owner. |
| name | string | Floor name. |
| floor_number | int | Floor ordering. |
| status | string | draft or published. |
| layout_data | jsonb | Serialized canvas objects. |
| version | int | Incremented on publish. |

### LayoutVersion

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key. |
| floor_plan_id | UUID | Parent floor plan. |
| version | int | Snapshot number. |
| layout_data | jsonb | Immutable published layout. |

---

## Business Logic

- Owner roles can manage layouts across all outlets.
- Managers can only manage their own outlet.
- Draft edits do not change published versions until publish is confirmed.
- Objects must snap to the configured grid.
- Tables and chairs cannot overlap blocked zones or leave the canvas.
- This module never owns live table occupancy.

---

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/pos/outlets` | pos.layout.manage | List outlets available for layout editing. |
| GET | `/pos/outlets/{outletId}/floor-layouts` | pos.layout.manage | List layouts and drafts for one outlet. |
| POST | `/pos/outlets/{outletId}/floor-layouts` | pos.layout.manage | Create a floor layout draft. |
| GET | `/pos/floor-layouts/{layoutId}` | pos.layout.manage | Get a layout draft or published version. |
| PUT | `/pos/floor-layouts/{layoutId}` | pos.layout.manage | Update the canvas and metadata. |
| POST | `/pos/floor-layouts/{layoutId}/publish` | pos.layout.manage | Publish the current draft. |

---

## Frontend Components

| Component | Purpose |
|---|---|
| FloorLayoutEditorPage | Main page wrapper. |
| FloorCanvas | Render the grid and objects. |
| LayoutPalette | Tool palette for object types. |
| LayoutToolbar | Save, publish, undo, redo, zoom. |
| ObjectInspector | Edit selected object properties. |
| FloorSwitcher | Switch floors or layers. |
| PublishDialog | Confirm publish action. |

---

## Permissions

| Permission | Description |
|---|---|
| pos.layout.manage | Create, view, edit, validate, save, and publish floor layouts. |

---

## Keputusan Teknis

- **Canvas-based editor**: Layout work is spatial, so a canvas is more efficient than a form-only UI.
- **Single permission scope**: One permission keeps the module easier to audit.
- **Versioned publish model**: Drafts are isolated until publish to prevent operational mistakes.
- **POS-owned layout data**: Layout objects stay separate from master data and stock.

---

## Notes & Improvements

### Completed
- Full CRUD with RBAC scoping.
- SVG canvas editor with grid snapping.
- Version control from draft to publish.

### Planned Improvements
- Multi-select and bulk actions.
- Resize handles.
- Copy/paste support.
- Mini-map for large layouts.

### Related Documentation

- [../pos-fnb-module-mapping.md](../pos-fnb-module-mapping.md) for the broader POS navigation and packaging strategy.
