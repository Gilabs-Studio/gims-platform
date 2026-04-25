# TODO: Subscription Tier Restrictions

**Status:** Planned — implementation deferred to post-trial launch
**Priority:** High (required before public go-live)
**Owner:** Backend team
**Reference:** [`docs/pricing/modular-tier-pricing-onprem-1.2m.md`](../pricing/modular-tier-pricing-onprem-1.2m.md)

---

## Overview

This document defines the endpoint access restrictions per subscription tier.  
During the initial **trial production launch**, all tenants with any valid subscription (including coupon-granted trials) receive **full access** — no endpoint filtering is enforced.

A middleware (`SubscriptionGateMiddleware`) will be introduced to enforce these restrictions once the billing system is live.

---

## Tiers & Plans

### POS Module (`plan: pos_essential | pos_growth | pos_enterprise`)

| Endpoint Group                         | Essential | Growth | Enterprise |
|----------------------------------------|:---------:|:------:|:----------:|
| `/api/v1/pos/terminal`                 | ✅        | ✅     | ✅         |
| `/api/v1/pos/floor-layout`             | ✅        | ✅     | ✅         |
| `/api/v1/sales/orders`                 | ✅        | ✅     | ✅         |
| `/api/v1/sales/invoices`               | ✅        | ✅     | ✅         |
| `/api/v1/sales/payments`               | ✅        | ✅     | ✅         |
| `/api/v1/purchase/purchase-orders`     | ✅        | ✅     | ✅         |
| `/api/v1/purchase/supplier-invoices`   | ✅        | ✅     | ✅         |
| `/api/v1/purchase/payments`            | ✅        | ✅     | ✅         |
| `/api/v1/stock/inventory`              | ✅        | ✅     | ✅         |
| `/api/v1/feedback/*`                   | ❌        | ✅     | ✅         |
| `/api/v1/loyalty/*`                    | ❌        | ✅     | ✅         |
| `/api/v1/stock/movements`              | ❌        | ✅     | ✅         |
| Role granularity & approval flows      | ❌        | ❌     | ✅         |
| API access (external integrations)     | ❌        | ❌     | ✅ (limited)|
| Audit trail priority                   | ❌        | ❌     | ✅         |

### ERP Module (`plan: erp_core | erp_pro | erp_enterprise`)

| Endpoint Group                         | Core | Pro  | Enterprise |
|----------------------------------------|:----:|:----:|:----------:|
| `/api/v1/sales/*`                      | ✅   | ✅   | ✅         |
| `/api/v1/purchase/*`                   | ✅   | ✅   | ✅         |
| `/api/v1/stock/*`                      | ✅   | ✅   | ✅         |
| `/api/v1/finance/chart-of-accounts`    | ❌   | ✅   | ✅         |
| `/api/v1/finance/journal-entries`      | ❌   | ✅   | ✅         |
| `/api/v1/finance/closing`              | ❌   | ✅   | ✅         |
| `/api/v1/finance/reports` (basic)      | ❌   | ✅   | ✅         |
| `/api/v1/finance/reports` (full AR/AP) | ❌   | ❌   | ✅         |
| `/api/v1/finance/aging-reports`        | ❌   | ❌   | ✅         |
| Advanced governance & controls         | ❌   | ❌   | ✅         |

### CRM Module (`plan: crm_basic | crm_growth | crm_enterprise`)

| Endpoint Group                         | Basic | Growth | Enterprise |
|----------------------------------------|:-----:|:------:|:----------:|
| `/api/v1/crm/leads`                    | ✅    | ✅     | ✅         |
| `/api/v1/crm/pipeline` (stages)        | ✅    | ✅     | ✅         |
| `/api/v1/crm/tasks`                    | ✅    | ✅     | ✅         |
| `/api/v1/crm/visit-reports`            | ❌    | ✅     | ✅         |
| `/api/v1/crm/area-mapping`             | ❌    | ✅     | ✅         |
| `/api/v1/crm/sales-targets`            | ❌    | ✅     | ✅         |
| `/api/v1/crm/settings/*` (full)        | ❌    | ❌     | ✅         |
| `/api/v1/crm/activity-types`           | ❌    | ❌     | ✅         |
| `/api/v1/crm/contact-roles`            | ❌    | ❌     | ✅         |

### HR Module (`plan: hr_basic | hr_growth | hr_enterprise`)

| Endpoint Group                         | Basic | Growth | Enterprise |
|----------------------------------------|:-----:|:------:|:----------:|
| `/api/v1/hrd/attendance`               | ✅    | ✅     | ✅         |
| `/api/v1/hrd/holidays`                 | ✅    | ✅     | ✅         |
| `/api/v1/hrd/work-schedules`           | ✅    | ✅     | ✅         |
| `/api/v1/hrd/leave-requests`           | ❌    | ✅     | ✅         |
| `/api/v1/hrd/overtime-requests`        | ❌    | ✅     | ✅         |
| `/api/v1/hrd/evaluations`              | ❌    | ❌     | ✅         |
| `/api/v1/hrd/recruitment`              | ❌    | ❌     | ✅         |
| Advanced approval policies             | ❌    | ❌     | ✅         |

### Special Plans

| Plan            | Access Level                   | Notes                                    |
|-----------------|-------------------------------|------------------------------------------|
| `full_access`   | All modules, all endpoints     | Used for coupon-granted trials           |
| `trial`         | All modules (time-limited)     | Status field — not a plan               |

---

## Implementation Plan (Backend)

### 1. SubscriptionGateMiddleware

Create `apps/api/internal/core/middleware/subscription_gate_middleware.go`:

```go
// TODO: Implement SubscriptionGateMiddleware
// 1. Extract tenant_id from JWT context
// 2. Look up active TenantSubscription from cache (Redis TTL 5 min) or DB
// 3. If subscription is expired → return 402 SUBSCRIPTION_EXPIRED
// 4. If subscription plan does not permit the requested endpoint → return 403 PLAN_LIMIT_EXCEEDED
// 5. Pass through if plan = full_access or plan covers the endpoint group
```

### 2. Endpoint Plan Matrix

Define a static map `map[string][]SubscriptionPlan` associating path prefixes with the minimum plan that permits access:

```go
// TODO: Define plan gate map in middleware
var endpointPlanGates = map[string][]models.SubscriptionPlan{
    "/api/v1/feedback":      {PlanPOSGrowth, PlanPOSEnterprise, PlanFullAccess},
    "/api/v1/loyalty":       {PlanPOSGrowth, PlanPOSEnterprise, PlanFullAccess},
    "/api/v1/finance/aging": {PlanERPEnterprise, PlanFullAccess},
    // ... add all from the table above
}
```

### 3. Subscription Cache Layer

```go
// TODO: Add Redis cache for active subscription lookups
// Key: "sub:{tenant_id}", TTL: 5 minutes
// Invalidate on subscription create/expire
```

### 4. Register Middleware

Apply after `AuthMiddleware` on all `/api/v1/*` routes:

```go
// TODO: v1.Use(middleware.SubscriptionGateMiddleware(subRepo, redis))
```

---

## Xendit Payment Integration (TODO)

- **Provider:** Xendit (https://xendit.co)
- **Flow:** Create Invoice → Redirect user → Webhook on payment success → Create TenantSubscription
- **Webhook endpoint:** `POST /api/v1/webhooks/xendit/payment` (to be implemented)
- **Security:** Verify `X-CALLBACK-TOKEN` header against `XENDIT_WEBHOOK_TOKEN` env var
- **Models:** `XenditPaymentID` and `XenditInvoiceID` fields already present on `TenantSubscription`

### Implementation steps:
1. Create Xendit client wrapper: `apps/api/internal/core/xendit/client.go`
2. Create invoice endpoint: `POST /internal/xendit/create-invoice` (system admin or public with rate limit)
3. Create webhook handler: `POST /api/v1/webhooks/xendit/payment`
4. On webhook success: create `TenantSubscription` with the selected plan
5. Update register flow to accept `xendit_invoice_id` instead of coupon

---

## Add-on Modules (TODO)

Add-ons from the pricing document need their own gate entries:

| Add-on            | Gate Condition                                       |
|-------------------|------------------------------------------------------|
| Feedback module   | `plan ∈ {pos_growth, pos_enterprise, full_access}` OR standalone add-on subscription |
| Loyalty module    | Same as Feedback                                     |
| AI Assistant      | Separate `ai_assistant` add-on subscription          |
| Advanced reports  | Separate `advanced_reports` add-on subscription      |
| API pack          | Separate `api_pack` add-on subscription              |

---

## Security Notes

- Never trust the plan from the JWT — always re-check against the DB/cache.
- Subscription checks must happen server-side; the frontend plan indicator is UI-only.
- Rate-limit the coupon validation endpoint (`/api/v1/auth/coupons/validate`) to prevent enumeration.
- Coupon codes are uppercase-normalised at write time; comparison is always `UPPER(code) = ?`.
