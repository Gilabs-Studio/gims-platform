# API Security Standards

This document outlines the security standards and best practices implemented in the API.

## 1. Authentication

### 1.1 Token Storage
- **Access Tokens** and **Refresh Tokens** MUST be stored in **HttpOnly, Secure, SameSite=Strict** cookies.
- Tokens MUST NOT be exposed in JSON response bodies to prevent XSS attacks.
- The `Authorization` header is NOT used for client-server communication in browser environments; the server reads directly from cookies.

### 1.2 Token Rotation
- Refresh tokens are rotated on every use.
- The old refresh token is revoked immediately.
- **Row-Level Locking (`FOR UPDATE`)** is used during rotation to prevent race conditions where a reused token could spawn multiple valid chains.

## 2. CSRF Protection

### 2.1 Double-Submit Cookie Pattern
- The API implements the Double-Submit Cookie pattern.
- A non-HttpOnly cookie `csrf_token` is set by the server.
- All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) MUST include an `X-CSRF-Token` header matching the cookie value.
- The server validates this header in the `CSRF` middleware.

## 3. Rate Limiting

### 3.1 Redis-Backed Limiter
- Rate limiting is implemented using **Redis** (Fixed Window algorithm) for distributed tracking.
- For production/multi-instance environments, limiter failure policy MUST be explicit:
	- Critical public/auth endpoints: prefer fail-closed to avoid distributed bypass during incidents.
	- Non-critical internal endpoints: controlled fail-open allowed only with alerting.

### 3.2 Limit Levels
- **Global Login Limit**: Per-IP limit on login attempts to prevent DOS.
- **Email-Based Limit**: Limits login attempts per email address to prevent brute-force attacks on specific accounts.
- **General Limit**: Default limit for all authenticated endpoints.

### 3.3 Retry Storm Prevention
- The API MUST protect against retry storms and burst abuse:
	- Return `429 Too Many Requests` with `Retry-After` when limits are exceeded.
	- Avoid expensive work before limiter checks (fail fast).
	- Enforce tighter limits on authentication, upload, and expensive report endpoints.

### 3.4 Idempotency and Safe Retries
- Non-idempotent endpoints (create/charge/submit) MUST NOT be blindly retried by clients.
- If retries are required for non-idempotent operations, endpoint MUST support idempotency key.
- Duplicate request handling MUST be deterministic to prevent double processing.

## 3.5 Dependency Degradation Safety
- All dependency calls (DB/Redis/external API) MUST use timeout-bound contexts.
- On dependency timeout/failure, API MUST return controlled error responses (no panic, no process crash).
- Background workers MUST stop gracefully during shutdown before resource teardown.

## 4. Input Validation & Data Integrity

### 4.1 Strict Validation
- All request bodies MUST be bound using `ShouldBindJSON` with strict structure definitions.
- `binding` tags (e.g., `required`, `email`, `min=8`) MUST be present on all DTO fields.

### 4.2 Transactional Integrity
- Critical flows (Login, Token Refresh, Logout) MUST be wrapped in database transactions (`db.Transaction`) to ensure atomicity.

## 5. Permissions-Policy (Feature Policy)

The `Permissions-Policy` HTTP header controls which browser features the application is allowed to use, configured in `apps/web/next.config.ts`.

### 5.1 Current Policy

| Feature        | Policy   | Reason                                                   |
| -------------- | -------- | -------------------------------------------------------- |
| `geolocation`  | `(self)` | Required for GPS-based attendance clock-in/out           |
| `camera`       | `(self)` | Required for WFH photo proof during clock-in             |
| `microphone`   | `()`     | Not used — blocked entirely                              |
| `fullscreen`   | `(self)` | Allowed for the app's own origin                         |
| `payment`      | `()`     | Not used — blocked entirely                              |
| `usb`          | `()`     | Not used — blocked entirely                              |

> **⚠️ CRITICAL:** `geolocation` and `camera` MUST be set to `(self)`, NOT `()`.
> Setting `()` completely blocks the API at the HTTP level — the browser will silently deny all `getCurrentPosition()` and `getUserMedia()` calls regardless of user permission settings.
> This was the root cause of a bug where location always showed as "denied" even after the user granted permission in Chrome's padlock menu.
