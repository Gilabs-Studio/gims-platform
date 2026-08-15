# API Configuration & Seed Data Standards

## Purpose

Runtime API code must not own business seed data, display defaults, or environment-specific policy. API code should read configuration and persisted reference data; seeders should create demo/default data.

---

## Configuration Rules

### Do

- Put runtime policy in `internal/core/infrastructure/config`.
- Put reusable formatting helpers in `internal/core/utils`.
- Read values through config/helper functions instead of literal strings in handlers/usecases/repositories.
- Use `apptime.Now()` for application timestamps.
- Use `utils.NormalizePagination()` for all paginated queries.
- Use `utils.FormatMoney()` and `utils.DefaultCurrency()` for currency formatting/defaulting.
- Put reusable business constants in a named constants/config module when they are not environment-specific.
- Use typed config values for timeout, retry, pagination, storage, CORS, rate limit, token, and external service settings.

### Do Not

- Do not hardcode business values in usecases, handlers, or repositories.
- Do not hardcode URLs, credentials, API keys, storage buckets, role names, status values, timeout durations, retry counts, CORS origins, pagination caps, or tenant policy in request-path code.
- Do not seed or auto-create business data inside request paths.
- Do not use bare `time.Now()` outside `internal/core/apptime`.
- Do not introduce endpoint-specific pagination caps.
- Do not use `limit` as a public query parameter for page size; use `per_page`.
- Do not read tenant/company identifiers from request body/query params when an authenticated context is available.

---

## Seed Data Ownership

Seed/demo/reference data belongs in `apps/api/seeders`.

Examples:

- Subscription plans and prices.
- Demo suppliers/products.
- Demo RFQ bids.
- Demo content/articles.
- Initial admin accounts.

Usecases may read this data from repositories, but must not create it automatically.

---

## Pagination Standard

Public list endpoints use:

```text
page
per_page
```

Rules:

- Default `per_page`: `PAGINATION_DEFAULT_PER_PAGE`, fallback `20`.
- Maximum `per_page`: `PAGINATION_MAX_PER_PAGE`, fallback `20`.
- All handlers/usecases/repositories must normalize through `utils.NormalizePagination()`.
- Deprecated aliases such as `limit` must not be introduced.

---

## Date & Time Standard

- Application timestamps: `apptime.Now()`.
- Company-specific timestamps: `apptime.NowForCompany(companyID)`.
- Employee-specific timestamps: `apptime.NowForEmployee(employeeID)`.
- Date display formatting should use named helpers/constants in `core/utils`, not inline layouts in business usecases.

---

## Currency Standard

- Currency codes must come from request data, persisted data, or `utils.DefaultCurrency()`.
- Money display strings must use `utils.FormatMoney(amount, currency)`.
- Database model hooks can default empty currency values through `utils.DefaultCurrency()`.
- Do not add static DB defaults like `default:'IDR'` when the value is configurable.

---

## Hardcode & Security Checklist

Apply this checklist to every new feature, bug fix, and review:

- [ ] Runtime values come from config/env/helpers, not inline literals.
- [ ] Business states/roles/permissions come from constants, authz catalog, or reference data.
- [ ] Time uses `apptime`, not bare `time.Now()`.
- [ ] Request DTO does not accept trusted context such as tenant/company/user ownership.
- [ ] Repository/usecase receives tenant/company scope from authenticated context where applicable.
- [ ] Logs do not print credentials, tokens, raw payloads, or cross-tenant identifiers.
- [ ] External service URLs and credentials are loaded from config and validated at startup.
- [ ] Error messages returned to client use standard codes/keys and do not expose internals.
