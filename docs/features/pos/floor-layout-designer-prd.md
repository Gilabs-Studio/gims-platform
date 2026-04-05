# Floor & Layout Designer Product Requirements Document

> **Module:** POS -> Table Operations -> Floor & Layout Designer
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Product Goals](#product-goals)
3. [Scope](#scope)
4. [UX Principles](#ux-principles)
5. [ASCII Layout](#ascii-layout)
6. [Data Ownership and Integration](#data-ownership-and-integration)
7. [Business Rules](#business-rules)
8. [Permissions](#permissions)
9. [API Reference](#api-reference)
10. [Frontend Components](#frontend-components)
11. [User Flow](#user-flow)
12. [Testing Strategy](#testing-strategy)
13. [Technical Decisions](#technical-decisions)
14. [Risks and Open Questions](#risks-and-open-questions)
15. [Appendix](#appendix)

---

## Overview

This PRD covers only the Floor & Layout Designer module for POS F&B. The feature is a canvas-based layout editor used to design outlet floors, rooms, walls, doors, tables, chairs, cashier positions, and service zones.

This module is intentionally narrow.

- It does not cover Live Table Map.
- It does not cover Order Panel.
- It does not cover Reservation or Waiting List.
- It does not cover invoice, payment, stock deduction, or finance posting.

The editor should feel like a simple game-like workspace: a dotted grid, drag-and-drop objects, snap behavior, and quick visual feedback.

### Product Intent

The module exists so an outlet admin can quickly build and publish a spatial layout without touching operational POS flow. It is a configuration tool, not a live operations screen.

### Non-Goals

- No order taking workflow.
- No table state lifecycle management.
- No kitchen, reservation, or queue logic.
- No product, stock, finance, loyalty, or customer feedback logic.

## Product Goals

| Goal | Description |
|---|---|
| Fast layout creation | Admins can create and modify a floor map quickly. |
| Game-like interaction | Layout editing uses drag, drop, rotate, resize, and draw interactions instead of heavy forms. |
| Multi-outlet support | One company in master data is treated as one outlet context for layout editing. |
| Versioned publishing | Drafts can be saved and published as stable snapshots. |
| Clear spatial structure | Floors, rooms, zones, tables, chairs, doors, and cashier positions are visually distinct. |

## Scope

### In Scope

- Outlet selection from master company data.
- Floor plan list per outlet.
- Draft floor editor with dotted grid canvas.
- Drag-and-drop placement for tables, chairs, walls, doors, cashier stations, and zones.
- Resize, rotate, lock, and duplicate object actions.
- Floor switching for multi-level outlets.
- Draft save and publish flow.
- Basic version history for published layouts.
- Validation for object overlap, out-of-bounds placement, and invalid wall geometry.

### Out of Scope

- Live table occupancy or status badges.
- Order panel and bill drawer.
- Reservation and waiting list.
- Finance settlement and payment flow.
- Ingredient inventory or recipe/BOM.
- Customer feedback and loyalty.
- Reports and analytics.

## UX Principles

1. Use a dotted grid canvas so object placement feels precise and simple.
2. Keep the interaction model visual: click, drag, drop, resize, rotate, and draw.
3. Show tools in a palette on the left, canvas in the center, and object properties on the right.
4. Use clear floor tabs or layer switches for multi-floor outlets.
5. Make selected objects obvious with handles, borders, and metadata.
6. Avoid modal-heavy workflows unless the action is destructive or requires publish confirmation.
7. Support touch input for tablet devices without sacrificing mouse precision.
8. Keep keyboard shortcuts available for power users.

## ASCII Layout

### Navigation Placement

```text
POS
`-- Table Operations
    `-- Floor & Layout Designer
```

### Layout Editor Wireframe

```text
+----------------------------------------------------------------------------------+
| Floor & Layout Designer | Outlet A | Floor 1 | Draft v3                           |
| [Save Draft] [Publish] [Undo] [Redo] [Snap On] [Grid 16] [Zoom -] [Zoom +]       |
+----------------------+-----------------------------------------------------------+
| Palette              | Canvas                                                    |
|----------------------|-----------------------------------------------------------|
| Walls                | . . . . . . . . . . . . . . . . . . . . . . .           |
| Doors                | .  +--------+     . . . . . . [T-01] . . . [T-02]      |
| Tables               | .  |   K    |     . . . . . . . . . . . . . . .         |
| Chairs               | .  +--------+     . . . . . . . . . . . . . . .         |
| Cashier Station      | .  .... corridor ....      [Bar]      [Wait]            |
| Zones / Decor        | .  [Room A].............[Room B]..............           |
| Floor Layers         | .  Floor 1 | Floor 2 | Floor 3                            |
+----------------------+-----------------------------------------------------------+
| Inspector: name, type, size, rotation, position, label, capacity, lock, delete   |
+----------------------------------------------------------------------------------+
```

### Canvas Behavior

```text
Grid dots indicate snap points.
Selected objects show resize and rotate handles.
Walls can be drawn as connected segments.
Tables and chairs can be dragged freely, then snapped.
Cashier stations and zones are treated as anchored layout objects.
```

## Data Ownership and Integration

### Ownership Model

| Domain | Ownership in This Module | Notes |
|---|---|---|
| Company | Read-only reference | One company maps to one outlet context. |
| Floor Plan | POS-owned | Stores the visual layout and draft state. |
| Layout Object | POS-owned | Tables, chairs, walls, doors, stations, and zones. |
| Version Snapshot | POS-owned | Published layouts are immutable snapshots. |
| Product | Not used | Product master is outside this module. |
| Stock | Not used | Stock logic belongs to the inventory module. |
| Finance | Not used | Finance logic belongs to the finance module. |
| Customer | Not used | Customer feedback and loyalty belong elsewhere. |

### Integration Boundary

- The module reads outlet identity from Master Data Company only.
- The module writes only to POS-owned layout tables and version records.
- The module must not create order, invoice, stock, or finance side effects.
- The module may expose published layout metadata to other POS modules later, but it does not own those flows.

### Core Entities

| Entity | Purpose |
|---|---|
| FloorPlan | Represents one outlet floor or layout draft. |
| FloorLayer | Supports multi-floor or layered layouts. |
| LayoutObject | Generic object placed on the canvas. |
| LayoutObjectStyle | Stores size, rotation, label, color, and lock state. |
| LayoutVersion | Immutable snapshot after publish. |
| LayoutDraft | Editable working copy before publish. |

## Business Rules

- One company in POS context equals one outlet context.
- A floor plan can have multiple layers, but only one active draft at a time per floor.
- Publish creates a new immutable layout version.
- Draft edits do not affect the published version until publish is confirmed.
- Objects must snap to the configured grid.
- Walls must connect cleanly and cannot float without an anchor point.
- Tables and chairs cannot overlap blocked zones or leave the canvas boundary.
- Cashier stations must be visually distinct from customer seating objects.
- Layout validation errors must be visible before publish.
- This module does not own live table state, so it never changes occupancy or order data.

## Permissions

Only one permission is required for this module.

| Permission | Description |
|---|---|
| pos.layout.manage | Create, view, edit, validate, save, and publish floor layouts. |

## API Reference

The API should stay narrow and centered on layout editing only.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | /pos/outlets | pos.layout.manage | List outlets available for layout editing. |
| GET | /pos/outlets/{outletId}/floor-layouts | pos.layout.manage | List layouts and drafts for one outlet. |
| POST | /pos/outlets/{outletId}/floor-layouts | pos.layout.manage | Create a new floor layout draft. |
| GET | /pos/floor-layouts/{layoutId} | pos.layout.manage | Get one layout draft or published version. |
| PUT | /pos/floor-layouts/{layoutId} | pos.layout.manage | Update canvas objects, properties, and draft metadata. |
| POST | /pos/floor-layouts/{layoutId}/publish | pos.layout.manage | Publish the current draft as a new immutable version. |

## Frontend Components

| Component | Purpose |
|---|---|
| FloorLayoutEditorPage | Main page wrapper for the editor. |
| FloorCanvas | Render the dotted grid and layout objects. |
| LayoutPalette | Show draggable tools such as walls, doors, tables, and chairs. |
| LayoutToolbar | Handle save, publish, undo, redo, zoom, and grid controls. |
| ObjectInspector | Edit selected object properties. |
| FloorSwitcher | Switch between floors or layers. |
| PublishDialog | Confirm validation and publish action. |
| VersionHistoryPanel | Show previous published versions. |
| SnapGridOverlay | Render the snap grid state. |

## User Flow

```text
Select Outlet
    |
    v
Open Floor & Layout Designer
    |
    v
Choose Floor or Create Draft
    |
    v
Drag Objects / Draw Walls / Adjust Properties
    |
    v
Save Draft
    |
    v
Validate Layout
    |
    v
Publish Version
```

## Testing Strategy

### Manual Testing

1. Open the layout editor for an outlet.
2. Create a new floor draft.
3. Add walls, doors, tables, chairs, and a cashier station.
4. Resize and rotate objects.
5. Switch between floors or layers.
6. Save a draft and reopen it.
7. Publish the layout.
8. Verify the published version stays immutable.

### Automated Testing

- Unit tests for snap-to-grid, overlap detection, and wall validation.
- Unit tests for publish snapshot creation.
- E2E tests for drag-and-drop editing, save, and publish flows.

## Technical Decisions

- **Canvas-based editor instead of forms**: A layout editor is spatial, so a canvas gives faster and clearer interactions than field-based editing. Trade-off: more custom frontend work.
- **Single permission scope**: One permission keeps the module easy to grant and audit. Trade-off: less granular access control, but this module is narrow enough to justify it.
- **Versioned publish model**: Draft edits are isolated until publish. Trade-off: extra storage for snapshots, but much safer for operations.
- **POS-owned layout data**: Layout objects should not live in master data or stock tables. Trade-off: a separate layout model, but cleaner boundaries.

## Risks and Open Questions

| Risk / Question | Impact | Proposed Direction |
|---|---|---|
| Can large layouts become slow? | UX degradation | Use object virtualization and lightweight canvas rendering. |
| Should object templates be reusable? | Productivity | Yes, but as a later enhancement after the core editor is stable. |
| Should the editor support mobile phones? | Usability | Tablet support is required; phone support can be deferred. |
| Should floor templates be shared across outlets? | Consistency | Consider template duplication later, not in the MVP. |

## Appendix

### Related Documentation

- [pos-fnb-module-mapping.md](pos-fnb-module-mapping.md) for the broader POS navigation and packaging strategy.

### Glossary

| Term | Meaning |
|---|---|
| Outlet | A company instance used as the POS tenancy unit. |
| Floor Plan | A visual map for one outlet floor or zone. |
| Draft | Editable working state before publish. |
| Layout Version | Immutable snapshot created after publish. |
| Layout Object | Any object placed on the editor canvas. |
