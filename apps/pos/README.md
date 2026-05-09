# GIMS POS Mobile

Flutter mobile client for the GIMS POS module.

## Backend Contract Notes

- Auth uses `POST /api/v1/auth/login`; API sets `gims_access_token` and `gims_refresh_token` HttpOnly cookies.
- Native mobile stores API cookies locally and sends them as `Cookie` headers. Flutter Web uses Dio `withCredentials` so the browser owns the HttpOnly cookies.
- CSRF follows the web client: bootstrap with `GET /api/v1/auth/csrf`, then send `X-CSRF-Token` for `POST`, `PUT`, `PATCH`, and `DELETE`.
- POS protected routes require backend middleware `AuthMiddleware`, `ScopeMiddleware`, and permissions such as:
  - `pos.order.create`, `pos.order.read`
  - `pos.layout.read`, `pos.layout.create`, `pos.layout.update`, `pos.layout.delete`
  - `pos.payment.manage` for Xendit configuration management
  - `loyalty.*` and `feedback.*` for the related modules
- Live table behavior mirrors web: published floor layout + active orders. Tables become occupied for `PAID`, `PARTIAL_SERVED`, and `SERVED`; wait warning starts after 30 minutes.

## Implemented Mobile Surface

- Login with username and password only. Configure API origin via `--dart-define=GIMS_API_URL=...` when needed.
- Outlet-scoped POS terminal:
  - catalog from `/pos/catalog/outlet/:outletID`
  - create/confirm orders
  - cash and Xendit digital payment
  - receipt URL from `/pos/orders/:id/receipt`
  - WhatsApp receipt share using POS receipt template placeholders
- Live table:
  - reads published `/pos/floor-plans`
  - renders the same `layout_data` object schema used by web
  - shows wait duration, seated/served/partial/warning states, and order actions
- Floor editor:
  - mobile canvas editing for tables, chairs, walls, and cashier object
  - saves `layout_data` through `/pos/floor-plans/:id/layout`
  - publishes via `/pos/floor-plans/:id/publish`
- Loyalty:
  - member lookup and enrollment
  - reward list display from lookup response
- Feedback:
  - list outlet forms
  - create a quick active rating/text form

## Commands

```bash
cd apps/pos
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=GIMS_API_URL=http://localhost:8087
```

For Android builds on this machine, use the JDK that has `javac`:

```bash
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 flutter build apk --debug
```
