# Manual QA Report — Reports & AI Assistant Modules

**Date:** 2026-04-08  
**Tester:** Claude Code (Playwright E2E)  
**Branch:** `fixing-bug`  
**Scope:** Reports (`apps/web/src/features/report`) + AI Assistant (`apps/web/src/features/ai`)

---

## Module Coverage

| Feature | Route | Status |
|---------|-------|--------|
| Sales Overview | `/en/reports/sales-overview` | Tested |
| Top Product | `/en/reports/product-analysis` | Tested |
| Geo Performance | `/en/reports/geo-performance` | Tested |
| Customer Research | `/en/reports/customer-research` | Tested |
| Supplier Research | `/en/reports/supplier-research` | Tested |
| AI Chatbot | `/en/ai-chatbot` | Tested |
| AI Settings | `/en/ai-settings` | Tested |

---

## Summary

- **Total Bugs Found:** 2
- **High Priority:** 1
- **Medium Priority:** 1
- **Frontend Issues:** 1
- **Backend / Missing Route Issues:** 1
- **Fixed:** 0
- **New (Unfixed):** 2

---

## Bug #1 — AI Chatbot fails to send message (503 Service Unavailable)

**Priority:** High  
**Type:** Backend / API  
**Status:** Unfixed

### Description
When typing a message in the AI Chatbot and pressing Enter, the frontend calls `POST http://localhost:8081/api/v1/ai/chat/send`. The server responds with `503 Service Unavailable`, and the UI shows a notification toast: "Failed to send message".

### Steps to Reproduce
1. Navigate to `/en/ai-chatbot`
2. Type any message in the chat input (e.g., "Hello AI")
3. Press Enter
4. Observe the red toast notification "Failed to send message"
5. Open browser DevTools → Network tab
6. Observe `503 Service Unavailable` on `POST /api/v1/ai/chat/send`

### Expected Result
The API should return `200 OK` with an AI response, and the message should appear in the chat history.

### Actual Result
The API returns HTTP 503, no message is sent, and the chat history remains empty.

### Root Cause
The AI chat backend service (or the proxy/route to it) is unavailable or not running on port 8081.

---

## Bug #2 — AI Settings page returns 404 Page Not Found

**Priority:** Medium  
**Type:** Frontend / Route Missing  
**Status:** Unfixed

### Description
Navigating directly to `/en/ai-settings` (which is defined in the navigation configuration as part of the AI Assistant module) renders a 404 "Page Not Found" error instead of a settings page.

### Steps to Reproduce
1. Navigate directly to `/en/ai-settings`
2. Observe the page content

### Expected Result
An AI Assistant settings page should load (e.g., configuration for API keys, model selection, system prompts, etc.).

### Actual Result
The application renders a 404 page with the text "Page Not Found" and "The page you are looking for does not exist or has been moved."

### Root Cause
The Next.js route file for `/ai-settings` does not exist under `apps/web/app/[locale]/(dashboard)/ai-settings/page.tsx` (or equivalent), despite being referenced in the navigation configuration (`apps/web/src/lib/navigation-config.ts`).

---

## Comprehensive Action Tests Performed

### Reports — Sales Overview

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Chart, KPI cards, performance table render correctly |
| Click sales rep name | Pass | Navigates to detail page |
| Detail page — Check-in Locations tab | Pass | Leaflet map renders with 1 location |
| Detail page — Products Sold tab | Pass | Table shows Sample Product, 3 qty, Rp 300.000 |
| Detail page — Customers tab | Pass | Table shows 3 customers |

### Reports — Top Product

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Chart, KPI cards, product table render |
| By Product tab | Pass | Shows Sample Product with View Details button |
| By Category tab | Pass | Shows General category, 1 product, Rp 900.000 |
| By Segment tab | Pass | Empty state loads without error |
| By Type tab | Pass | Empty state loads without error |
| By Packaging tab | Pass | Empty state loads without error |
| By Procurement Type tab | Pass | Shows "Buy", 1 product, Rp 900.000 |
| View Details (product) | Pass | Navigates to product detail page |
| Detail page — Top Customers tab | Pass | Table shows 3 customers |
| Detail page — Top Sales Reps tab | Pass | Table shows 3 sales reps |
| Detail page — Monthly Trend tab | Pass | Chart renders correctly |

### Reports — Geo Performance

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Leaflet map, filters, KPI cards render |
| Default filter state | Pass | Shows "No data available for the selected filters" (expected empty state) |

### Reports — Customer Research

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Charts, KPI cards, Top Customers table render |
| Click customer name | Pass | Navigates to customer detail page |
| Detail page — Products Sold tab | Pass | Table shows Sample Product |
| Detail page — Sales Orders tab | Pass | Table shows SO-20260407-0003 with actions |

### Reports — Supplier Research

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Charts, KPI cards, Top Spenders table render |
| Click supplier name | Pass | Navigates to supplier detail page |
| Detail page — Purchased Products tab | Pass | Table shows Sample Product, 120 qty, Rp 6.000.000 |
| Detail page — Purchase Orders tab | Not Tested | — |

### AI Assistant — Chatbot

| Action | Result | Notes |
|--------|--------|-------|
| View main page | Pass | Chat history sidebar, empty state, input box render |
| Type message | Pass | Send button enables |
| Send message | Fail | 503 Service Unavailable (Bug #1) |

### AI Assistant — Settings

| Action | Result | Notes |
|--------|--------|-------|
| Navigate to `/en/ai-settings` | Fail | 404 Page Not Found (Bug #2) |

---

## Open Items / Not Tested

- **Geo Performance filter interactions** (changing aggregation level, data source, date range) — Not tested due to empty data state.
- **Supplier Research detail page — Purchase Orders tab** — Not tested.
- **AI Chatbot conversation history persistence** — Could not test due to Bug #1 blocking all message sends.
- **AI Settings form interactions** — Could not test due to Bug #2 (page does not exist).

---

## GitHub Issues Created

- Issue #136 — AI Chatbot fails to send message (503 Service Unavailable)
- Issue #137 — AI Settings page returns 404 Page Not Found
