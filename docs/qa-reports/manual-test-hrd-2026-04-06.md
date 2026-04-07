# HRD Manual Browser Test Report - 2026-04-06

## Summary
- **Total Actions Tested:** 60+
- **Bugs Found:** 3
- **Status:**
  - Attendance: PASS
  - Holidays: PASS
  - Leave Requests: FAIL (1 bug)
  - Overtime: PASS
  - Evaluation: PASS
  - Recruitment: FAIL (2 bugs)
  - Work Schedule: PASS

---

## Detailed Findings

### 1. Attendance
| Action | Result | Notes |
|--------|--------|-------|
| Open Calendar View | PASS | April 2026 calendar renders correctly with holidays and non-work days. |
| Open List View | PASS | 20 of 35 records loaded. Table has all expected columns. |
| Manual Entry (open form) | PASS | Dialog opens with Employee, Date, Status, Check-In Type, Times, Reason, Notes. |
| Search | PASS | Filtered "Manager" successfully, showing 10 results. |
| Status Filter | PASS | "Late" filter narrows results to 2 records correctly. |
| Pagination | PASS | Page 1 and 2 buttons present; "Next" enabled, "Back" disabled on page 1. |
| View Detail | PASS | Detail dialog shows Working Hours, Overtime, Late minutes, Employee info, Check In/Out details. |
| Edit Record | PASS | Edit dialog opens pre-filled with existing data; Employee and Date fields correctly disabled. |
| Delete Record | PASS | Delete confirmation appears; record removed successfully with toast notification. |
| Self-service Clock In menu | PASS | Header button opens menu with Clock In, Attendance History, Request Leave, My Overtime options. |
| Self-service Attendance History | PASS | Drawer opens showing April 2026 calendar and attendance legend. Loads correctly. |

### 2. Holidays
| Action | Result | Notes |
|--------|--------|-------|
| Calendar View | PASS | Full-year 2026 calendar displays all 20 holidays across months. |
| List View | PASS | 10 of 20 results loaded with pagination. |
| Create (open form) | PASS | Add Holiday dialog opens with Date, Name, Description, Type, Collective Leave toggle. |
| Edit | PASS | Edit dialog opens pre-filled for "Tahun Baru Masehi". |
| Search | PASS | Searched "Natal" -> returned 2 correct results ("Tahun Baru Masehi" and "Hari Raya Natal"). |
| Delete | PASS | Deleted "Tahun Baru Masehi"; count reduced from 20 to 19. Toast "Holiday deleted successfully" appeared. |
| Year filter | PASS | Combobox shows "2026" and filters correctly. |
| Type filter | PASS | "Company Holiday" filter shows exactly 1 result ("Hari Ulang Tahun Perusahaan"). |

### 3. Leave Requests
| Action | Result | Notes |
|--------|--------|-------|
| List loading | PASS | 8 records loaded immediately. |
| Create | PASS | New Leave Request dialog opens with Employee, Leave Type, Date Range, Half Day, Reason. Form submits successfully; new record appears in list with toast "Leave request submitted successfully". |
| Delete | PASS | Delete confirmation appears; newly created record removed successfully with toast "Leave request deleted successfully". Count returns from 9 to 8. |
| Approve from View | PASS | Clicked Approve on a Pending leave request; status changed to Approved with toast "Leave request approved successfully". |
| Reject from View | PASS | Clicked Reject on a Pending leave request; status changed to Rejected with toast "Leave request rejected successfully". |
| Cancel from View | **FAIL** | Clicked Cancel on a Pending leave request; confirmation dialog appeared but API returned 500 Internal Server Error. Toast showed "Failed to cancel leave request". Status remained Pending. |
| Search | PASS | Searched "Manager" -> returned 2 correct results (Manager User records). |
| Status filter | PASS | "Pending" filter correctly shows 2 records. |

### 4. Overtime
| Action | Result | Notes |
|--------|--------|-------|
| List loading | PASS | List view loads. April shows 0 records; switching to January shows 1 record ("System maintenance work"). |
| Calendar View | PASS | Calendar renders without errors. |
| Status filter | PASS | Month/Year filters work correctly. |
| Create | N/A | No "Create" button visible; module appears read-only from this view. |

### 5. Evaluation
| Action | Result | Notes |
|--------|--------|-------|
| List loading | PASS | Evaluations tab shows 3 records with scores. |
| Create evaluation | PASS | Add Evaluation dialog opens with all required fields. |
| Edit | PASS | Edit dialog opens; Employee and Evaluation Group are correctly disabled. |
| Delete | PASS | Delete confirmation appears; record removed successfully with toast "Evaluation deleted successfully". Count reduced from 3 to 2. |
| Search | PASS | Searched "Leadership" -> returned 1 correct result (Leadership Competency). |
| Evaluation Groups tab - Search | PASS | Searched "Leadership" -> returned 1 correct result. |
| Evaluation Groups tab - Create | PASS | Created "Test Evaluation Group"; appeared in list with toast "Evaluation group created successfully". Count increased from 3 to 4. |
| Evaluation Groups tab - Edit | PASS | Edited "Test Evaluation Group" description; updated in list with toast "Evaluation group updated successfully". |
| Evaluation Groups tab - Delete | PASS | Deleted "Test Evaluation Group"; removed from list with toast "Evaluation group deleted successfully". Count reduced from 4 to 3. |

### 6. Recruitment
| Action | Result | Notes |
|--------|--------|-------|
| List loading (Card) | PASS | 5 cards loaded with correct status, priority, progress bars. |
| List loading (List) | PASS | 5 rows in table view with all columns. |
| Create request (open form) | PASS | Add Request dialog opens with Division, Position, Required Count, Employment Type, Expected Start Date, Priority, Salary range. |
| View detail | PASS | Detail page opens with full job description, qualifications, and Applicants kanban board (New, Screening, Interview, Offer, Hired, Rejected). |
| Edit | PASS | Edit dialog opens pre-filled for "RR-202602-0005". |
| Approve from List | **FAIL** | Clicking "Approve" on Pending request `RR-202602-0004` results in 404 API error (`/status`). Status does not change. |
| Reject from List | **FAIL** | Clicking "Reject" on same Pending request also results in 404 API error (`/status`). Status does not change. |
| Cancel from List | **FAIL** | Clicking "Cancel Request" on Pending request `RR-202602-0004` results in 404 API error (`/status`). Status does not change. |
| Close from List | **FAIL** | Clicking "Close" on Open request `RR-202602-0003` results in 404 API error (`/status`). Status does not change. |
| Open for Hiring from List | **FAIL** | Clicking "Open for Hiring" on Approved request `RR-202602-0002` results in 404 API error (`/status`). Status does not change. |
| Add Applicant | PASS | Add Applicant dialog opens and saves correctly. |
| Move Applicant Stage (Edit dialog) | **FAIL** | Editing an applicant's Stage dropdown and clicking Update does not trigger a backend call. Dialog stays open; change does not persist after refresh. |
| Move Applicant Stage (Drag & Drop) | **FAIL** | Dragging applicant card between kanban columns registers the drop event visually but no backend API call is made. Change reverts on refresh. |
| Applicants tab | PASS | Visible on detail page with 6 stages and "Add Applicant" buttons. |
| Status filter dropdown | PASS | Options render correctly (Draft, Pending, Approved, Rejected, Open, Closed, Cancelled). |

### 7. Work Schedule
| Action | Result | Notes |
|--------|--------|-------|
| List loading | PASS | 2 schedules loaded. |
| Create schedule (open form) | PASS | Add Work Schedule dialog opens with all sections: Name, Description, Division, Work Hours, Break Times, Working Days, Tolerance, GPS Settings. Division dropdown populated correctly. |
| Edit | PASS | Edit dialog opens pre-filled with existing schedule data. |
| Delete | PASS | Deleted "Flexible Hours"; count reduced from 2 to 1. Toast "Work schedule deleted successfully" appeared. |
| Set default | PASS | Clicked "Set as Default" on "Flexible Hours" -> badge moved to Flexible Hours. Clicked again on "Standard Office Hours" -> badge moved back. API returned 200 OK. |
| Form data loading | PASS | Division combobox shows all divisions (All Divisions, IT & Technology, Human Resources, Finance & Accounting, Operations, Sales & Marketing). |
| Active filter | PASS | "Active" filter shows 2 results correctly. |

---

## Console Errors Found
1. **Dialog Accessibility Warnings** (Multiple pages):
   - `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}.`
   - Appears on Attendance, Holidays, Leave Requests, Evaluation, Recruitment, Work Schedule whenever a dialog opens.
   - **Severity: Low** - does not break functionality but affects a11y.

2. **Geolocation Permission Blocked** (All HRD pages):
   - `Geolocation permission has been blocked as the user has ignored the permission prompt several times.`
   - **Severity: Low** - expected in automated testing environment.

3. **WebSocket HMR Errors** (All pages):
   - `WebSocket connection to ws://localhost:3000/_next/webpack-hmr ... failed: ERR_CONNECTION_REFUSED`
   - **Severity: Low** - development-only, does not affect app behavior.

---

## API Errors Found
1. **500 Internal Server Error - Leave Request Cancel**
   - **Endpoint:** `POST /api/v1/hrd/leave-requests/{id}/cancel`
   - **Status:** 500
   - **Context:** Triggered when clicking "Cancel" on a Pending leave request from the View dialog.
   - **Impact:** User cannot cancel a pending leave request.

2. **404 Not Found - Recruitment Workflow Actions**
   - **Endpoint:** `POST /api/v1/hrd/recruitment-requests/{id}/status`
   - **Status:** 404
   - **Context:** Triggered when clicking any workflow action on a recruitment request from the List View action menu:
     - "Approve" on Pending (`RR-202602-0004`)
     - "Reject" on Pending (`RR-202602-0004`)
     - "Cancel Request" on Pending (`RR-202602-0004`)
     - "Close" on Open (`RR-202602-0003`)
     - "Open for Hiring" on Approved (`RR-202602-0002`)
   - **Impact:** User cannot change the status of any recruitment request from the list view.

2. **Missing Backend Call - Applicant Stage Movement**
   - **Context:** Both editing an applicant's Stage via the Edit dialog and drag-and-drop between kanban columns fail to trigger a backend API call.
   - **Impact:** Applicant stage changes appear visually but do not persist after refresh.

---

## Critical Bugs to Fix
1. **[Recruitment] All workflow actions return 404 Not Found**
   - **Steps to Reproduce:**
     1. Navigate to `/en/hrd/recruitment`
     2. Switch to "List" view
     3. Find any request and open the row action menu (three dots)
     4. Click "Approve", "Reject", "Cancel Request", "Close", or "Open for Hiring"
   - **Expected:** A confirmation dialog appears, and upon confirming, the request status changes accordingly.
   - **Actual:** Console shows `404 (Not Found)` on `POST /api/v1/hrd/recruitment-requests/<id>/status`. The status remains unchanged.
   - **Affected Actions:** Approve, Reject, Cancel Request, Close, Open for Hiring.
   - **Possible Root Cause:** The frontend is calling a generic `/status` endpoint that does not exist. The backend router defines specific endpoints: `POST /:id/approve`, `POST /:id/reject`, `POST /:id/cancel`, `POST /:id/close`, and `POST /:id/open`.

2. **[Recruitment] Applicant stage movement does not persist**
   - **Steps to Reproduce:**
     1. Navigate to `/en/hrd/recruitment`
     2. Click on any request to open the detail page
     3. Go to the "Applicants" tab
     4. Method A: Click an applicant's action menu → Edit → change the "Stage" dropdown → click Update
     5. Method B: Drag an applicant card from one kanban column to another
   - **Expected:** The applicant's stage is updated and persists after refresh.
   - **Actual:**
     - Method A: The Edit dialog stays open; no backend API call is triggered.
     - Method B: The card moves visually, but no backend API call is triggered; the change reverts on refresh.
   - **Possible Root Cause:** The frontend UI handles the interaction but fails to invoke the API mutation to persist the stage change.

3. **[Leave Requests] Cancel action returns 500 Internal Server Error**
   - **Steps to Reproduce:**
     1. Navigate to `/en/hrd/leave-requests`
     2. Create a new leave request (or find an existing Pending one)
     3. Open the row action menu and click "View"
     4. In the View dialog, click "Cancel"
     5. In the confirmation dialog, click "Cancel Request"
   - **Expected:** The leave request status changes to "Cancelled" and a success toast appears.
   - **Actual:** Console shows `500 (Internal Server Error)` on `POST /api/v1/hrd/leave-requests/<id>/cancel`. Toast shows "Failed to cancel leave request". The status remains "Pending".
   - **Possible Root Cause:** Backend error in the cancel handler for leave requests.
