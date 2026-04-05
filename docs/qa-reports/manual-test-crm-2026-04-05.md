# Manual QA Test Report - CRM Module
**Date:** 2026-04-05  
**Tester:** Claude Code (Playwright Browser Testing)  
**Environment:** localhost:3000 (Next.js frontend), localhost:8081 (Go backend)  
**Login:** admin@example.com  

---

## Summary

Comprehensive manual browser testing of the entire CRM module using Playwright. Testing covered all CRM sub-features: Leads (list, create, table actions, detail), Pipeline (board view, deal actions, convert to quotation, deal detail), Tasks, Visit Reports, Area Mapping, Sales Target, and CRM Settings.

---

## Critical / High Priority Bugs

### CRM Bug #1: Add Deal Wizard Lacks Client-Side Validation on "Next"
- **Module:** CRM > Pipeline
- **Page:** `/en/crm/pipeline`
- **Action:** Click "Add Deal", leave required fields (Deal Title, Pipeline Stage) empty, then click "Next"
- **Expected:** Validation errors prevent advancing to the "Products & BANT" tab
- **Actual:** The wizard proceeds to the next tab without validating required fields. Users only discover the missing data later or on Save.
- **Impact:** HIGH - Users can proceed with incomplete deal data
- **Root Cause:** The "Next" button handler does not trigger `trigger()` for the current tab's required fields before switching tabs.
- **Status:** **OPEN**

### CRM Bug #2: Visit Reports Page Shows Raw Translation Key `crmVisitReport.metrics.withOutcome`
- **Module:** CRM > Visit Reports
- **Page:** `/en/crm/visits`
- **Action:** Load the Visit Reports list page
- **Expected:** Metric cards render with human-readable labels
- **Actual:** One metric card displays the raw key `crmVisitReport.metrics.withOutcome`. Console throws repeated `IntlError: MISSING_MESSAGE: Could not resolve crmVisitReport.metrics.withOutcome in messages for locale en.`
- **Impact:** MEDIUM - Unprofessional UI and missing localization
- **Root Cause:** Translation key `crmVisitReport.metrics.withOutcome` is used in `VisitReportList` component but missing from both `src/i18n/messages/en.json` and `src/i18n/messages/id.json` (or feature-level i18n files).
- **Status:** **OPEN**

### CRM Bug #3: "Convert to Quotation" Backend Returns 500 Internal Server Error
- **Module:** CRM > Pipeline
- **Page:** `/en/crm/pipeline`
- **Action:** Click "Convert to Quotation" on a Closed Won deal card, confirm in dialog
- **Expected:** Deal is converted to a Sales Quotation successfully
- **Actual:** `POST /api/v1/crm/deals/{id}/convert-to-quotation` returns `500 (Internal Server Error)`. Frontend now surfaces the error toast after a prior fix, but the backend conversion still fails.
- **Impact:** HIGH - Users cannot convert won deals to quotations
- **Root Cause:** Backend conversion endpoint fails (likely missing customer/company association or related data integrity issue in the usecase/handler).
- **Status:** **OPEN** (frontend event bubbling fixed; backend 500 remains)

### CRM Bug #4: Sales Target "Add Target" Wizard Lacks Client-Side Validation on "Next"
- **Module:** CRM > Sales Target
- **Page:** `/en/crm/targets`
- **Action:** Click "Add Target", leave the "Area" dropdown empty, then click "Next"
- **Expected:** Validation error prevents advancing to the "Monthly Breakdown" tab
- **Actual:** The wizard proceeds to the Monthly Breakdown tab without validating the required Area field. Clicking "Save" then fails with a generic "An error occurred" toast.
- **Impact:** HIGH - Users can proceed with incomplete target configuration
- **Root Cause:** The "Next" button handler does not validate required fields on the first tab before switching.
- **Status:** **OPEN**

### CRM Bug #5: Sales Target List Endpoint Returns 400 Bad Request
- **Module:** CRM > Sales Target
- **Page:** `/en/crm/targets`
- **Action:** Load the Sales Target page
- **Expected:** Sales target list and related data load successfully
- **Actual:** Network request to `GET /api/v1/sales/yearly-targets` returns `400 (Bad Request)`. The page may show limited or no data.
- **Impact:** HIGH - Sales Target feature cannot retrieve its primary data
- **Root Cause:** Backend endpoint expects a required query parameter (e.g., `year`, `area_id`, or `employee_id`) that the frontend is not sending, or the request is malformed.
- **Status:** **OPEN**

---

## Module: CRM - Leads (`/en/crm/leads`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | 7 seed leads visible |
| Stats cards render | PASS | Total Leads: 7, Conversion Rate: 28.6%, Average Score: 57, By Status: 5 |
| Status breakdown | PASS | New(1), Contacted(1), Qualified(2), Converted(2), Lost(1) |
| Source breakdown | PASS | Website(2), Referral(1), Cold Call(2), Exhibition(1), Social Media(1) |
| Table columns | PASS | Code, Name, Company, Source, Status, Score, Est. Value, Assigned To, Created, Actions |
| Pagination | PASS | "1 - 7 of 7 Results" |
| Search/filter | PASS | Search box and status/source filters present |
| Console errors | PASS | No JS errors on load |

### CREATE
| Test Case | Result | Notes |
|-----------|--------|-------|
| Open Add Lead dialog | PASS | Dialog opens with Basic and BANT & Scoring tabs |
| Empty required field | PASS | "First name is required" inline error + toast "Please check the form for errors" |
| Valid data | PASS | Lead created successfully, appears in list |
| Console errors | PASS | No JS errors |

### UPDATE (Table Row Actions)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Change Status submenu | PASS | Opens correctly; options: New, Contacted, Qualified, Lost |
| Edit action | PASS | Opens edit dialog, changes persisted |

### DELETE / OTHER ACTIONS
| Test Case | Result | Notes |
|-----------|--------|-------|
| Convert to Pipeline | PASS | Lead successfully converted to pipeline deal |
| Lead Detail | PASS | Navigates to lead detail page correctly |

---

## Module: CRM - Pipeline (`/en/crm/pipeline`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Kanban board renders | PASS | All stages visible: Qualification, Needs Analysis, Demo, Proposal, Negotiation, Closed Won, Closed Lost |
| Deal cards render | PASS | Each card shows title, lead code, customer, contact, value, probability, expected close, stage, and assigned user |
| Pipeline Summary tab | PASS | Renders summary view correctly |
| Breadcrumb navigation | PASS | Dashboard > CRM > Pipeline links work correctly (Bug #6 from previous report already fixed) |
| Console errors | PASS | No JS errors on load |

### CREATE
| Test Case | Result | Notes |
|-----------|--------|-------|
| Open Add Deal dialog | PASS | Dialog opens with "Deal Info" and "Products & BANT" tabs |
| Empty required field on "Next" | **BUG** | Wizard proceeds without validating Deal Title and Pipeline Stage. See CRM Bug #1. |

### UPDATE / ACTIONS
| Test Case | Result | Notes |
|-----------|--------|-------|
| Deal card click | PASS | Navigates to deal detail page |
| Move Stage button | PASS | Available on deal detail page |
| Edit button | PASS | Available on deal detail page |
| Convert to Quotation | **BUG** | Backend returns 500. See CRM Bug #3. |

### Deal Detail Page (`/en/crm/pipeline/[id]`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Page load | PASS | Deal info renders correctly (value, probability, stage, BANT qualification) |
| Description section | PASS | Description text visible |
| Notes section | PASS | Notes text visible |
| Activities tab | PASS | 3 activities listed with timestamps and user avatars |
| Tasks tab | PASS | Tab present |
| Product Items tab | PASS | Tab shows count "2" |
| Information tab | PASS | Tab present with customer, contact, location, assigned to, BANT, lead, dates |
| Console errors | PASS | No JS errors |

---

## Module: CRM - Tasks (`/en/crm/tasks`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | Task list renders |
| Filter tabs | PASS | My Tasks, Team Tasks, Overdue, Completed tabs present |

### CREATE
| Test Case | Result | Notes |
|-----------|--------|-------|
| Open Add Task dialog | PASS | Dialog opens with form fields |
| Valid data | PASS | Task created successfully |
| Schedule auto-creation | PASS | Related schedule item is automatically created upon task creation |
| Console errors | PASS | No JS errors |

---

## Module: CRM - Visit Reports (`/en/crm/visits`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | Visit report list renders |
| Metric cards | **BUG** | Raw translation key `crmVisitReport.metrics.withOutcome` displayed. See CRM Bug #2. |
| Console errors | **BUG** | `IntlError: MISSING_MESSAGE` repeated in console. See CRM Bug #2. |

---

## Module: CRM - Area Mapping (`/en/crm/area-mapping`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | Area mapping list/map view renders |
| Console errors | PASS | No JS errors |

---

## Module: CRM - Sales Target (`/en/crm/targets`)

### READ
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | Page skeleton renders |
| Network errors | **BUG** | `GET /api/v1/sales/yearly-targets` returns 400. See CRM Bug #5. |

### CREATE
| Test Case | Result | Notes |
|-----------|--------|-------|
| Open Add Target dialog | PASS | Wizard opens with "Target Details" and "Monthly Breakdown" tabs |
| Empty required field on "Next" | **BUG** | Wizard proceeds without validating required Area field. See CRM Bug #4. |

---

## Module: CRM - Settings

### Pipeline Stages (`/en/crm/settings/pipeline-stages`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | List of pipeline stages renders |
| Console errors | PASS | No JS errors |

### Lead Sources (`/en/crm/settings/lead-sources`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | List of lead sources renders |
| Console errors | PASS | No JS errors |

### Lead Statuses (`/en/crm/settings/lead-statuses`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | List of lead statuses renders |
| Console errors | PASS | No JS errors |

### Contact Roles (`/en/crm/settings/contact-roles`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | List of contact roles renders |
| Console errors | PASS | No JS errors |

### Activity Types (`/en/crm/settings/activity-types`)
| Test Case | Result | Notes |
|-----------|--------|-------|
| Load page | PASS | List of activity types renders |
| Console errors | PASS | No JS errors |

---

## Network Errors (4xx/5xx)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/v1/crm/deals/{id}/convert-to-quotation` | 500 | Backend failure. See CRM Bug #3. |
| `GET /api/v1/sales/yearly-targets` | 400 | Missing/invalid query params. See CRM Bug #5. |

---

## Recommendations

| Priority | Item |
|----------|------|
| P0 | Fix Add Deal wizard "Next" button to validate required fields before tab switch |
| P0 | Fix Add Target wizard "Next" button to validate required Area field |
| P0 | Fix `convert-to-quotation` backend 500 error |
| P0 | Fix `GET /api/v1/sales/yearly-targets` 400 Bad Request |
| P1 | Add missing `crmVisitReport.metrics.withOutcome` translation keys to `en` and `id` i18n files |

---

*Report compiled from Playwright browser observations and console/network monitoring.*
