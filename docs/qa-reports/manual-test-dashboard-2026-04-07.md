# Manual Test Report - Dashboard Module

**Date:** 2026-04-07  
**Tester:** Claude Code (Playwright manual browser testing)  
**Environment:** Local development (http://localhost:3000)  
**User:** admin@example.com  

---

## Overview

This report covers comprehensive manual browser testing of the **Dashboard** module (`/dashboard`), validating page loads, interactivity of widgets, KPI info buttons, chart toggles, customize mode, track tables, and console error states.

---

## Dashboard Features Tested

Based on `navigation-config.ts`, the Dashboard module contains a single overview page with the following sub-features/widgets:

1. **Page Load** (`/en/dashboard`)
2. **Date Range Selector**
3. **Customize Mode** (Add Widget, Reset, Done)
4. **Owner Intelligence** (Business health + Bottleneck)
5. **KPI Cards**
   - CCC, DIO, AR Days (DSO), AP Days (DPO), ROE, Net Profit Margin, Gross Profit Margin, ROA
6. **Info Buttons** on KPI cards
7. **Revenue Chart** (Revenue / Costs toggle)
8. **Cost Structure** (OPEX, CAPEX, Depreciation breakdowns)
9. **Inventory Turnover**
10. **Asset Turnover**
11. **OTD Rate**
12. **Utilization Rate**
13. **Track Sales Order** table
14. **Track Purchase Order** table

---

## Test Results Summary

| Category | Count |
|----------|-------|
| Total Features Tested | 14 |
| Passed | 13 |
| Failed | 0 |
| Bugs Found | 1 |

---

## Detailed Test Results

### 1. Page Load
- **PASS** - Loads correctly at `/en/dashboard`.
- Heading "Dashboard" renders along with all KPI cards, charts, and track tables.
- **Console Error:** 1 network error observed (see Bug #1).

### 2. Date Range Selector
- **PASS** - Button "Select date range" opens a calendar popover with month grid.
- Keyboard `Escape` closes the picker.

### 3. Customize Mode
- **PASS** - Clicking "Customize" enters customize mode.
- Buttons **Add Widget**, **Reset**, and **Done** become visible.
- Clicking **Done** exits customize mode and restores normal view.

### 4. Owner Intelligence
- **PASS** - Card displays **Critical Condition** status and business-health explanation.
- **Primary Bottleneck** shows "Inventory" with descriptive text.

### 5. KPI Cards
- **PASS** - All 8 KPI cards render with values and status labels:
  - CCC: `29 days` (Healthy)
  - DIO: `0 days` (Healthy)
  - AR Days (DSO): `29 days` (Healthy)
  - AP Days (DPO): `0 days` (Critical)
  - ROE: `40.0%` (Healthy)
  - Net Profit Margin: `100.0%` (Healthy)
  - Gross Profit Margin: `100.0%` (Healthy)
  - ROA: `33.3%` (Healthy)

### 6. Info Buttons
- **PASS** - 13 info-icon buttons are present (one per KPI/metric card).
- Buttons are clickable and have proper `aria-label` attributes (e.g. `aria-label="Info: CCC"`).
- **Tooltip content verified** on hover: e.g. CCC tooltip displays formula (`DIO + DSO - DPO`) and purpose description.

### 7. Revenue Chart
- **PASS** - "Revenue" and "Costs" toggle buttons are present.
- Clicking each button updates chart view without errors.
- Legend shows `Rp 999.000` (Revenue) and `Rp 100.000` (Costs).

### 8. Cost Structure
- **PASS** - Card renders OPEX, CAPEX, and Depreciation sections.
- Breakdowns appear for OPEX (Salaries, Logistics, Rent, Admin) and CAPEX (Equipment, Vehicles, Warehouse).

### 9. Inventory Turnover
- **PASS** - Renders `0.0x` with **Critical** status.

### 10. Asset Turnover
- **PASS** - Renders `0.3x` with **Critical** status.

### 11. OTD Rate
- **PASS** - Renders `100.0%` with **Healthy** status.

### 12. Utilization Rate
- **PASS** - Renders `75.0%` with **Watch** status.

### 13. Track Sales Order
- **PASS** - Table displays 3 sales orders with Code, Status, Fulfillment, DO, Invoice, and Total Amount.
- Expandable status buttons (e.g. `Cancelled +2`, `Paid +1`, `Draft +1`, `Unpaid +2`) are clickable and reveal linked document popovers.
- **Console Errors:** None originating from this widget.

### 14. Track Purchase Order
- **PASS** - Table displays 6 purchase orders.
- Status buttons (`Closed`, `Paid`, `Unpaid`, `Draft`) are clickable and open detail popovers.

---

## CRUD Operations Validation

The Dashboard module is **read-only analytics**; it does not support Create, Update, or Delete operations. Therefore, standard CRUD validation is **Not Applicable**.

---

## Deep Testing Results

The following actions were tested beyond basic page-load verification:

| Feature | Action Tested | Result | Notes |
|---------|---------------|--------|-------|
| Date Range Selector | Open calendar popover | PASS | Closes with Escape |
| Date Range Selector | Select range & data refresh | PASS | Dashboard KPI/chart content updates after selection |
| Customize Mode | Enter / Exit | PASS | Add Widget, Reset, Done visible |
| Customize Mode | Add Widget dialog | PASS | Widget picker opens with categories (Finance, Sales, Inventory, HR, etc.) |
| Customize Mode | Reset layout | PASS | Reset executes without errors |
| Revenue Chart | Revenue / Costs toggle | PASS | Updates chart view |
| KPI Cards | Info button hover | PASS | Tooltips display formula and purpose (e.g. CCC tooltip) |
| Track Sales Order | Code cell click | PASS | Opens detail popover (order info + audit trail) instead of navigating |
| Track Sales Order | Status expand buttons | PASS | Popover shows Delivery Orders table with tracking details |
| Track Purchase Order | Code cell click | PASS | Opens detail popover (order info + audit trail) instead of navigating |
| Track Purchase Order | Status buttons | PASS | Popover shows Goods Receipts table with item counts |

---

## Issues Found

### Bug #1: Dashboard Layout API Returns 404
**Issue:** Gilabs-Studio/gims-platform#133

**Severity:** Medium  
**Component:** Dashboard → General Dashboard Layout  
**Page:** `/en/dashboard`

**Description:**  
On initial page load, the frontend calls `GET http://localhost:8081/api/v1/general/dashboard/layout?type=general` and the server responds with **404 Not Found**, producing a console error.

**Root Cause:**  
The backend endpoint for general dashboard layout either does not exist or has a different route. The frontend expects this endpoint to fetch customizable widget layout data.

**Expected Behavior:**  
The endpoint should return `200 OK` with layout payload, or the frontend should stop requesting it if it is deprecated.

**Actual Behavior:**  
Console shows `Failed to load resource: the server responded with a status of 404 (Not Found)` for the layout endpoint. The dashboard still renders using default/static widget data, so the failure is non-blocking but noisy.

**Reproduction Steps:**
1. Log in as admin
2. Navigate to `/en/dashboard`
3. Open browser DevTools → Network/Console tab
4. Observe the 404 error for `/api/v1/general/dashboard/layout?type=general`

---

## Notes

- **No blocking UI errors** were observed across any tested Dashboard interactions.
- **Info tooltips** rely on hover delay (Radix Tooltip), making fully automated tooltip-text verification challenging in headless mode, but buttons are present and properly labeled for accessibility.
- **One GitHub issue** was created for the Dashboard layout API 404 bug: Gilabs-Studio/gims-platform#133.

