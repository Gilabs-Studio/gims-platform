# Manual QA Report - Stock Module

**Date:** 2026-04-06  
**Tester:** Claude Code (Playwright)  
**Scope:** Inventory, Stock Movement, Stock Opname

---

## Summary

| Metric | Value |
|--------|-------|
| Total Actions Tested | 22 |
| Bugs Found | 6 |
| GitHub Issues Created | 6 |

---

## Actions Tested

### Inventory

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 1 | View Inventory List | PASS | 1 result displayed correctly |
| 2 | Switch Tree/List View | PASS | Tree view auto-expanded due to single warehouse |
| 3 | Click Metric Filter Cards (Healthy Stock) | PASS | Filters applied, results updated |
| 4 | Click Metric Filter Cards (Low Stock) | PASS | Filters applied, shows 0 results |
| 5 | Clear Filters | PASS | Filter chips removed, all data restored |
| 6 | Expand Product Row (batch details) | PASS | Batch details visible in Tree view |
| 7 | Open Inventory Details Dialog | PASS | Dialog shows product, warehouse, on hand, reserved, available, batch info |

### Stock Movement

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 8 | View Stock Movement List | PASS | 6 movements displayed |
| 9 | Open Movement Detail Dialog | PASS | Dialog shows reference info, movement info, qty details |
| 10 | Create Stock Out Movement | PASS | Form submits successfully, redirects to list with success toast |
| 11 | Switch Movement Type (Transfer/Stock In/Stock Out) | PASS | Warehouse fields update correctly |
| 12 | Export Button | NOT TESTED | UI present |
| 13 | Filter by Warehouse/Product/Type/Date | NOT TESTED | UI present |

### Stock Opname

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 14 | View Stock Opname List | PASS | 2 seeded + 1 created opnames displayed |
| 15 | View Opname Detail | PASS | Dialog opens with items and information tabs |
| 16 | Edit Opname Header | PASS | Date and description editable |
| 17 | Edit Opname Item | PASS | Physical qty and notes editable |
| 18 | Add Item (duplicate prevention) | PASS | Toast: "Product already exists in list. Edit it instead." |
| 19 | Create Opname Wizard | PASS | 2-step wizard works, warehouse validation enforced |
| 20 | Submit Draft Opname | PASS | Status changes Draft Pending |
| 21 | Approve Pending Opname | PASS | Status changes Pending Approved |
| 22 | Post Approved Opname | PASS | Status changes Approved Posted |
| 23 | Delete Confirmation Dialog | PASS | Dialog appears with warning |
| 24 | Row Actions Menu (View/Edit/Submit/Delete) | PASS | Dropdown menu works for Draft opnames |

---

## Bugs Found

### BUG-1: Stock Movement IN type missing supplier name in Source column

**Severity:** Medium  
**Module:** Stock Movement  
**Labels:** `bug`, `frontend`, `backend`, `medium-priority`

**Description:**
In the Stock Movement list, rows with Type "IN" display "Supplier:" in the Source column but the actual supplier name is missing. This appears for GR-001 and all GR-INT reference numbers.

**Expected:** Source column should show "Supplier: Supplier Name"  
**Actual:** Source column shows "Supplier:" with no name  

**Screenshot Evidence:** Stock Movement table row: `01 Apr 2026 IN GR-001 Supplier: +10 - 7 Rp 50.000`

---

### BUG-2: Stock Opname detail dialog has incorrect title "Create Stock Opname"

**Severity:** Medium  
**Module:** Stock Opname  
**Labels:** `bug`, `frontend`, `medium-priority`

**Description:**
When clicking on an existing opname row to view/edit it, the dialog title reads "Create Stock Opname" instead of something appropriate like "Stock Opname Details" or "Edit Stock Opname".

**Expected:** Dialog title should reflect the view/edit action for an existing record  
**Actual:** Dialog title is "Create Stock Opname" for all existing opnames  

---

### BUG-3: Stock Opname Information tab shows empty Warehouse value

**Severity:** Medium  
**Module:** Stock Opname  
**Labels:** `bug`, `frontend`, `medium-priority`

**Description:**
In the Stock Opname detail dialog, the Information tab has a "Warehouse Information" section with a "Warehouse" label but no value displayed below it.

**Expected:** Warehouse name should be shown  
**Actual:** Only the label "Warehouse" is visible with no value  

---

### BUG-4: Stock Opname detail header displays raw UUID instead of meaningful text

**Severity:** High  
**Module:** Stock Opname  
**Labels:** `bug`, `frontend`, `backend`, `high-priority`

**Description:**
In the Stock Opname detail dialog header, below the date, a raw UUID string is displayed (e.g., `ee0b14e0-c651-4814-a5a2-e7398f81dcf4`). This appears to be a warehouse ID or user ID that is not being resolved to a human-readable name.

**Expected:** Should display the warehouse name or user name  
**Actual:** Raw UUID string is shown to the user  

---

### BUG-5: Create Stock Movement form missing space between qty and unit

**Severity:** Low  
**Module:** Stock Movement  
**Labels:** `bug`, `frontend`, `medium-priority`

**Description:**
On the Create Stock Movement page, in the product selection list, the available quantity text is rendered as "182.5Piece" instead of "182.5 Piece" (missing space between number and unit).

**Expected:** "Available 182.5 Piece"  
**Actual:** "Available 182.5Piece"  

---

### BUG-6: Stock Opname Add Item dialog shows System Qty = 0

**Severity:** Medium  
**Module:** Stock Opname  
**Labels:** `bug`, `frontend`, `backend`, `medium-priority`

**Description:**
When opening the "Add Item" dialog in a Stock Opname and selecting a product, the "System Qty" field remains at "0" instead of reflecting the actual current system quantity for that product in the selected warehouse.

**Expected:** System Qty should populate with the actual inventory quantity  
**Actual:** System Qty stays at 0 after product selection  

---

## GitHub Issues

All bugs have been created as GitHub issues with appropriate labels:

1. **Issue #122** - Stock Movement IN type missing supplier name in Source column
2. **Issue #123** - Stock Opname detail dialog has incorrect title "Create Stock Opname"
3. **Issue #124** - Stock Opname Information tab shows empty Warehouse value
4. **Issue #125** - Stock Opname detail header displays raw UUID instead of meaningful text
5. **Issue #126** - Create Stock Movement form missing space between qty and unit
6. **Issue #127** - Stock Opname Add Item dialog shows System Qty = 0
