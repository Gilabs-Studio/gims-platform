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

This PRD covers only the Floor & Layout Designer module for POS F&B. The feature is a canvas-based layout editor for floors, rooms, walls, doors, tables, chairs, cashier positions, and service zones. It is a configuration tool, not a live operations screen.

It does not own live table state, reservation, queue, invoice, payment, stock deduction, finance posting, loyalty, or customer feedback.

## Product Goals

| Goal | Description |
|---|---|
| Fast layout creation | Admins can create and modify a floor map quickly. |
| Game-like interaction | Layout editing uses drag, drop, rotate, resize, and draw interactions. |
| Multi-outlet support | Each outlet is a warehouse with `is_pos_outlet=true`. See [warehouse-outlet-rbac.md](../shared/warehouse-outlet-rbac.md). |
| Versioned publishing | Drafts can be saved and published as stable snapshots. |
| Clear spatial structure | Floors, rooms, zones, tables, chairs, doors, and cashier positions are distinct. |

## Scope

### In Scope

- Outlet selection from company data.
- Floor plan list per outlet.
- Draft floor editor with dotted grid canvas.
- Drag-and-drop placement for objects.
- Resize, rotate, lock, and duplicate actions.
- Draft save and publish flow.
- Basic version history for published layouts.

### Out of Scope

- Live table occupancy or status badges.
- Order panel and bill drawer.
- Reservation and waiting list.
- Finance settlement and payment flow.
- Inventory stock or recipe/BOM.
- Customer feedback and loyalty.
- Reports and analytics.

## UX Principles

1. Use a dotted grid canvas so object placement feels precise.
2. Keep the interaction model visual: click, drag, drop, resize, rotate, draw.
3. Show tools in a palette on the left, canvas in the center, and properties on the right.
4. Use floor tabs or layer switches for multi-floor outlets.
5. Make selected objects obvious with handles and borders.
6. Avoid modal-heavy workflows unless destructive or requiring publish confirmation.
7. Support touch input for tablet devices.
8. Keep keyboard shortcuts for power users.

## ASCII Layout

```text
POS
`-- Table Operations
    `-- Floor & Layout Designer
```

## Data Ownership and Integration

| Domain | Ownership in This Module | Notes |
|---|---|---|
| Company | Read-only reference | One company maps to one outlet context. |
| Floor Plan | POS-owned | Stores the visual layout and draft state. |
| Layout Object | POS-owned | Tables, chairs, walls, doors, stations, and zones. |
| Version Snapshot | POS-owned | Published layouts are immutable snapshots. |
| Product | Not used | Product master is outside this module. |
| Stock | Not used | Inventory logic belongs to the stock module. |
| Finance | Not used | Finance logic belongs to the finance module. |
| Customer | Not used | Customer feedback and loyalty belong elsewhere. |

### Integration Boundary

- The module reads outlet identity from Master Data Company only.
- The module writes only to POS-owned layout tables and version records.
- The module must not create order, invoice, stock, or finance side effects.
- The module may expose published layout metadata to other POS modules later.

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

## Permissions

| Permission | Description |
|---|---|
| pos.layout.manage | Create, view, edit, validate, save, and publish floor layouts. |

## API Reference

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
| LayoutPalette | Show draggable tools. |
| LayoutToolbar | Handle save, publish, undo, redo, zoom, and grid controls. |
| ObjectInspector | Edit selected object properties. |
| FloorSwitcher | Switch between floors or layers. |
| PublishDialog | Confirm validation and publish action. |

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

- **Canvas-based editor instead of forms**: A layout editor is spatial, so a canvas gives faster interactions than field-based editing.
- **Single permission scope**: One permission keeps the module easy to grant and audit.
- **Versioned publish model**: Draft edits are isolated until publish.
- **POS-owned layout data**: Layout objects should not live in master data or stock tables.

## Risks and Open Questions

| Risk / Question | Impact | Proposed Direction |
|---|---|---|
| Can large layouts become slow? | UX degradation | Use lightweight canvas rendering. |
| Should object templates be reusable? | Productivity | Yes, but later after core editor is stable. |
| Should the editor support mobile phones? | Usability | Tablet support is required; phone support can be deferred. |
| Should floor templates be shared across outlets? | Consistency | Consider template duplication later, not in MVP. |

## Appendix

### Related Documentation

- [../pos-fnb-module-mapping.md](../pos-fnb-module-mapping.md) for the broader POS navigation and packaging strategy.

### Glossary

| Term | Meaning |
|---|---|
| Outlet | A company instance used as the POS tenancy unit. |
| Floor Plan | A visual map for one outlet floor or zone. |
| Draft | Editable working state before publish. |
| Layout Version | Immutable snapshot created after publish. |
| Layout Object | Any object placed on the editor canvas. |
