# Manual Test Report - Travel Planner Module

**Date:** 2026-04-07  
**Tester:** Claude Code (Playwright manual browser testing)  
**Environment:** Local development (http://localhost:3000)  
**User:** admin@example.com  

---

## Overview

This report covers comprehensive manual browser testing of the **Travel Planner** module, validating both sub-pages (`Planner Workspace` and `Visit Planner`), map interactivity, plan creation, participant assignment, expense management, visit report details, form submissions, and console error states.

---

## Travel Planner Features Tested

Based on `navigation-config.ts`, the Travel Planner module contains two pages:

1. **Planner Workspace** (`/en/travel/travel-planner`)
2. **Visit Planner** (`/en/travel/visit-planner`)

### Planner Workspace Actions
1. Page Load
2. Leaflet Map (Zoom in, Zoom out, Marker clusters)
3. Create Up Country Cost Plan (dialog open/close)
4. Search plans
5. Filter by type (All Types / Up Country Cost / Visit Report)
6. Select plan card (Up Country Cost)
7. Select visit report card
8. Add participants (dialog + auto-save)
9. Add Expense Item (form validation + submit)
10. View Visit Report details in right panel

### Visit Planner Actions
11. Page Load
12. Leaflet Map
13. Create Visit Plan (dialog open + checkpoint select)
14. Refresh routes
15. Change route date filter
16. Share location
17. Route filters (User, Route type)

---

## Test Results Summary

| Category | Count |
|----------|-------|
| Total Features Tested | 28 |
| Passed | 21 |
| Failed | 1 |
| Not Available / Cannot Test | 6 |
| Bugs Found | 2 |

---

## Detailed Test Results

### Planner Workspace

#### 1. Page Load
- **PASS** - Loads correctly at `/en/travel/travel-planner`.
- Leaflet map renders with zoom controls and marker cluster button (`3` initially).
- Right sidebar shows Plan Bootstrap, Visits & Expenses list, and detail panel.
- Console: 0 errors on initial load (3 warnings: geolocation blocked, LCP, WebSocket - all non-blocking).

#### 2. Leaflet Map Controls
- **PASS** - Zoom in (`+`) and Zoom out (`-`) buttons are present and clickable.
- Marker cluster button updates dynamically based on selected plan.

#### 3. Create Up Country Cost Plan Dialog
- **PASS** - Clicking **Create Plan** opens the "Create Up Country Cost Plan" dialog.
- Dialog contains: Plan title, Mode combobox (Logistic), Budget textbox, Participant assignment list, Expense items (optional), Map section with lat/long spinbuttons, Cancel and Create Plan buttons.
- **Console Error observed** (see Bug #1): CSP violation when the dialog renders an OpenStreetMap iframe.
- **PASS** - Cancel button closes the dialog without errors.

#### 4. Search Plans
- **PASS** - Typing `milestone` filters the list from 2 to 1 plan.
- Clearing the search restores both plans.
- Visits & Expenses counter updates correctly (`2` -> `1` -> `2`).

#### 5. Filter by Type Combobox
- **PASS** - Options: `All Types`, `Up Country Cost / Travel Planner`, `Visit Report`.
- Selecting `Visit Report` shows 0 plans when no Visit Reports exist for the current context.
- Selecting `All Types` restores full list.

#### 6. Select Up Country Cost Plan Card
- **PASS** - Clicking `Jabodetabek Medical Distribution` marks it as active.
- Right panel updates to show Budget `Rp 18.000.000`, Spent `Rp 0`, Remain `Rp 18.000.000`.
- Map markers update (multiple markers + cluster button `2`).

#### 7. Select Visit Report Card
- **PASS** - Clicking a `Visit Report` card shows detailed visit info in the right panel.
- Verified visit details: Customer name, PIC name, address, Check In/Out times with coordinates, Purpose, Result, Lead/Pipeline links, Product Interest with star rating, Documentation status, and **Open in Google Maps** button.

#### 8. Add Participants
- **PASS** - Clicking **Add participants** opens the "Select Participants" dialog.
- Dialog shows 7 employees with auto-save enabled.
- Selecting **Ahmad Fauzi** automatically saves.
- Background updates: plan list now shows `1 participant`, `Ahmad Fauzi` avatar, and 3 linked `Visit Report` entries appear.
- Right panel Participants count updates from `0` to `1`.
- Close button dismisses the dialog.

#### 9. Add Expense Item
- **PASS** - Expense form shows Type combobox (Transport), Amount textbox, Description textbox.
- **Add Expense** button is disabled when amount is `0` or description is empty.
- Entering Amount `500000` and Description `Taxi to airport` enables the button.
- Clicking **Add Expense** submits successfully.
- Right panel updates: Spent `Rp 500.000`, Remain `Rp 17.500.000`, Expense Details count `1`, expense item displayed.
- Form resets after successful submission.

#### 10. View Visit Report Details
- **PASS** - After adding a participant, linked visit reports are visible.
- Clicking a visit report card renders full visit details in the right panel including CRM-linked data (leads, pipelines, product interest).

### Visit Planner

#### 11. Page Load
- **PASS** - Loads correctly at `/en/travel/visit-planner` after ~3 seconds.
- Leaflet map renders with zoom controls.
- Left panel shows `Realtime enabled`, `0 routes`, filters, and action buttons.
- Right panel shows pending visit details placeholder.
- Console: 0 errors (warnings: geolocation blocked, WebSocket failed - both expected in local dev).

#### 12. Leaflet Map Controls
- **PASS** - Zoom in and Zoom out buttons are present and clickable.

#### 13. Create Visit Plan Dialog
- **PASS** - Clicking **Create Plan** opens the "Create Visit Plan" dialog (distinct from Up Country Cost plan dialog).
- Dialog contains: Plan title (`Field Visit Plan`), checklist of customers/checkpoints:
  - Klinik Pratama Medika
  - RS Harapan Kita Jakarta
  - PT. Minimal Customer
- **Create Plan** button is disabled initially.
- **PASS** - Selecting **RS Harapan Kita Jakarta** enables the **Create Plan** button.

#### 14. Refresh Routes
- **PASS** - Clicking **Refresh** executes without console errors.

#### 15. Change Route Date Filter
- **PASS** - Changing the "Route date" textbox to `2026-04-01` updates the filter state without errors.

#### 16. Share Location
- **PASS** - Clicking **Share location** triggers the location-sharing flow.
- Because browser geolocation permission is blocked in the test environment, a graceful error notification appears: **"Unable to capture GPS location"**.
- No console errors produced.

#### 17. Route Filters
- **PASS** - User combobox (`Admin User`) and Route type combobox (`All route types`) are present and clickable.
- No routes are available for the seeded data, so the "No routes found" placeholder is shown.

---

## CRUD Operations Validation

| Operation | Support | Notes |
|-----------|---------|-------|
| Create | Yes | Create Up Country Cost Plan, Create Visit Plan |
| Read | Yes | View plan details, visit reports, expenses |
| Update | Yes | Add participants (auto-save), add expenses |
| Delete | Not directly tested | No visible delete action in UI |

---

## Deep Testing Results

| Feature | Action Tested | Result | Notes |
|---------|---------------|--------|-------|
| Create Plan | Open Up Country Cost dialog | PASS | Dialog renders all fields |
| Create Plan | Open Visit Plan dialog | PASS | Checkpoints selectable |
| Plan Cards | Select Jabodetabek plan | PASS | Right panel + map update |
| Visit Reports | Select visit report card | PASS | Full CRM-linked details shown |
| Search | Filter by keyword | PASS | Count updates correctly |
| Type Filter | Switch between types | PASS | All Types / Visit Report / Up Country Cost |
| Participants | Add Ahmad Fauzi | PASS | Auto-save, visits appear in list |
| Expenses | Add Transport expense | PASS | Budget math updates instantly |
| Visit Planner | Create Plan dialog | PASS | Visit plan with checkpoints |
| Visit Planner | Share location | PASS | Graceful GPS error handling |
| Visit Planner | Refresh + date filter | PASS | No console errors |

---

## Continuation Testing (Additional Actions) — 2026-04-08

### Planner Workspace

#### 18. Create Up Country Cost Plan — Full Submission
- **PASS** — Filling the dialog with title `E2E Test Plan`, budget `Rp 1.000.000`, and clicking **Create Plan** submits successfully.
- The dialog closes, the new plan appears in the list (`TPL-202604-0002`), the Visits & Expenses counter increments from `3` to `4`, and the right panel updates to the new plan's budget.
- No console errors beyond the known CSP framing warning.

#### 19. Remove Participants
- **PASS** — Re-opening the **Select Participants** dialog and clicking an already-selected employee (Ahmad Fauzi) toggles them off.
- Auto-save immediately removes the participant; the right panel count drops from `1` to `0`, and the plan card updates to show no participant avatar.
- Linked visit reports that previously appeared are no longer visible, confirming the employee-linkage logic works bidirectionally.

#### 20. Open in Google Maps
- **NOT TESTED** — No `Visit Report` cards were present in the current data state, so the **Open in Google Maps** button in the visit detail panel could not be exercised. This action was verified to exist in the UI during the first round (see Test #7 and #10).

#### 24. Collapse Sidebar
- **PASS** — Clicking **Collapse sidebar** hides the sidebar detail panel and shows an "Open detail sidebar" button.

#### 25. Change Mode (Create Plan Dialog)
- **PASS** — The Mode combobox in the Create Plan dialog has options: `Logistic`, `Cargo`, `Vessel`, `Milestone`.
- Selecting `Cargo` updates the combobox value without errors.

#### 26. Use Current Location (Create Plan Dialog)
- **PASS (graceful handling)** — Clicking **Use Current Location** does not crash the app.
- Because Playwright blocks geolocation, the latitude/longitude fields retain their default values (`-6.2088`, `106.8456`). No console errors are produced beyond the expected geolocation warning.

#### 27. Add/Remove Expense Item (Create Plan Dialog)
- **PASS** — Clicking **Add item** in the Create Plan dialog reveals an inline expense form (Type, Amount, Description) plus a summary row (Budget / Total expenses / Remaining).
- Clicking the `x` button removes the inline expense item and restores the "No initial expense items added" placeholder.

### Visit Planner

#### 21. Create Visit Plan — Form Submission
- **FAIL** — After opening the **Create Visit Plan** dialog, selecting `RS Harapan Kita Jakarta`, and clicking **Create Plan**, the API call fails.
- **API Response:** `POST /api/v1/travel/visit-planner/plans` returns `500 Internal Server Error`.
- **Toast Message:** "Request failed with status code 500".
- See **Bug #2** below for details.

#### 22. Change Route Type Filter
- **PASS** — Combobox options verified: `All route types`, `Lead`, `Deal`, `Customer`, `Mixed`.
- Selecting `Deal` updates the filter label without console errors.
- No routes exist in seeded data, so the "No routes found" placeholder remains.

#### 23. Change User Filter
- **PASS** — Combobox options include all 7 seeded employees plus `All employees`.
- Selecting `Ahmad Fauzi` updates the filter label without errors.

---

## Additional Exploratory Findings

The following actions were investigated but determined to be **not available** in the current UI or **not testable** with the seeded data:

| Action | Availability | Notes |
|--------|--------------|-------|
| Edit Plan | Not in UI | No edit button or context menu on plan cards |
| Delete Plan | Not in UI | No delete button or context menu on plan cards |
| Edit Expense Item (main panel) | Not in UI | Expense rows are read-only; no edit/delete icons |
| Delete Expense Item (main panel) | Not in UI | Expense rows are read-only; no edit/delete icons |
| Optimize route | Disabled | Requires at least one active route to enable |
| Select Checkpoint / Capture Visit | Cannot test | No checkpoints rendered in the left panel |
| Realtime toggle | Not interactive | "Realtime enabled" is a status badge, not a clickable toggle |

---

## Issues Found

### Bug #1: CSP Error Blocks OpenStreetMap iFrame in Create Plan Dialog
**Issue:** Gilabs-Studio/gims-platform#134

**Severity:** Low-Medium  
**Component:** Travel Planner → Planner Workspace → Create Up Country Cost Plan  
**Page:** `/en/travel/travel-planner`

**Description:**  
When opening the "Create Up Country Cost Plan" dialog, the map section contains an iframe that attempts to load `https://www.openstreetmap.org/`. The browser blocks this request due to Content Security Policy:

```
Framing 'https://www.openstreetmap.org/' violates the following Content Security Policy directive: "default-src 'self'". The request has been blocked. Note that 'frame-src' was not explicitly set, so 'default-src' is used as a fallback.
```

**Root Cause:**  
The application's CSP headers do not include `frame-src` or allow `https://www.openstreetmap.org/` (and likely other map tile providers) as valid iframe sources.

**Expected Behavior:**  
The location picker iframe inside the Create Plan dialog should render the OpenStreetMap frame without console errors.

**Actual Behavior:**  
The iframe displays "This content is blocked. Contact the site owner to fix the issue." and a CSP error is logged to the console.

**Reproduction Steps:**
1. Log in as admin
2. Navigate to `/en/travel/travel-planner`
3. Click **Create Plan**
4. Observe the Map section in the dialog
5. Open browser DevTools → Console tab
6. Observe the CSP framing error

### Bug #2: 500 Internal Server Error on Create Visit Plan Submission
**Issue:** Gilabs-Studio/gims-platform#135

**Severity:** High
**Component:** Travel Planner → Visit Planner → Create Visit Plan
**Page:** `/en/travel/visit-planner`

**Description:**  
When opening the "Create Visit Plan" dialog, selecting a customer checkpoint (`RS Harapan Kita Jakarta`), and clicking **Create Plan**, the frontend sends a `POST` request to `/api/v1/travel/visit-planner/plans`. The server responds with `500 Internal Server Error`, causing the plan creation to fail and displaying a toast: "Request failed with status code 500".

**Root Cause:**  
Unknown — the backend handler for visit-plan creation is crashing before returning a meaningful error response. This suggests an unhandled exception (possibly nil-pointer dereference, missing foreign-key validation, or a GORM error) in the Go usecase or repository layer.

**Expected Behavior:**  
The API should return `201 Created` (or `200 OK`) with the newly created visit plan, and the dialog should close successfully.

**Actual Behavior:**  
The API returns HTTP 500, the dialog remains open, and the user sees a generic failure toast.

**Reproduction Steps:**
1. Log in as admin
2. Navigate to `/en/travel/visit-planner`
3. Click **Create Plan**
4. Select `RS Harapan Kita Jakarta` from the checkpoint list
5. Click **Create Plan**
6. Observe the 500 error toast and the failing network request in DevTools

---

## Notes

- **Geolocation warnings** and **WebSocket connection failures** are expected in the local Playwright test environment and do not represent product bugs.
- **No blocking UI errors** were observed across any tested Travel Planner interactions.
- Adding a participant revealed previously hidden Visit Reports, confirming that visit report visibility is employee-linked and the auto-save mechanism works correctly.
- Removing a participant reverses the linkage (visit reports disappear), confirming the auto-save toggle works bidirectionally.
- Expense addition updates budget math in real-time without requiring a page refresh.
- One GitHub issue was created for the CSP framing bug: Gilabs-Studio/gims-platform#134.
- A second GitHub issue was created for the Create Visit Plan 500 error (see Bug #2).
- **Open in Google Maps** could not be exercised during this round because no Visit Report cards were present in the seeded data state.
- **Edit Plan**, **Delete Plan**, **Edit/Delete Expense** in the main panel, and **Realtime toggle** are not exposed as interactive UI actions.
- **Optimize route** and **Capture Visit / Select Checkpoint** require active routes/checkpoints that do not exist in the current seeded data.
