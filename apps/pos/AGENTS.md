# POS Mobile (Flutter) — Architecture & Conventions

**Stack:** Flutter 3.27+ / Dart 3.7+ · Riverpod · Isar · GoRouter (planned)
**Target:** Android tablet, iPad, mobile (offline-first POS terminal)

## Folder Structure

```
lib/src/
├── app/             # MaterialApp, routing, top-level providers
├── core/
│   ├── network/     # ApiClient, ApiException, Dio adapters
│   ├── database/    # Isar initialization & providers
│   ├── sync/        # Sync engine, queue, status enums
│   ├── offline/     # Connectivity provider
│   ├── theme/       # GimsColors, buildGimsTheme()
│   └── utils/       # Formatters, URL utils, error utils
├── shared/
│   ├── widgets/     # EmptyState, LoadingOverlay
│   ├── models/      # ApiList, UserSession, json helpers
│   └── extensions/  # Iterable extensions
└── features/
    ├── auth/
    │   ├── data/            # AuthService
    │   ├── domain/          # (future: providers)
    │   └── presentation/    # AuthGate, LoginScreen
    ├── terminal/
    │   ├── data/            # TerminalService
    │   ├── domain/models/   # CatalogItem, CartLine, PosOrder, PosConfig
    │   ├── presentation/    # TerminalScreen, UnifiedTerminalFlow
    │   │   └── widgets/     # CatalogPanel, CartPanel, CheckoutFlowSheet
    │   └── offline/         # OrderCache (future)
    ├── floor_layout/
    │   ├── data/            # FloorService
    │   ├── domain/models/   # FloorPlan, LayoutObject
    │   ├── presentation/    # LiveTableScreen, FloorEditorScreen
    │   │   └── widgets/     # FloorCanvas, StatusLegend
    │   └── offline/         # FloorCache (future)
    ├── loyalty/
    │   ├── data/            # LoyaltyService
    │   ├── domain/models/   # LoyaltyMemberLookup, LoyaltyReward
    │   └── presentation/    # LoyaltyScreen
    ├── feedback/
    │   ├── data/            # FeedbackService
    │   ├── domain/models/   # FeedbackForm
    │   └── presentation/    # FeedbackScreen
    └── outlet/
        ├── data/            # OutletService
        ├── domain/models/   # Outlet
        └── presentation/    # PosShell
            └── widgets/     # HomeGrid
```

## Critical Rules

### 1. Feature Isolation
- **NEVER** import across features at the `data/` or `domain/` level.
- Cross-feature communication only through shared models or the `app/` layer.
- Exception: `terminal/domain/models/` may be imported by `floor_layout/` for `PosOrder` in live table context.

### 2. Service Layer
- All network calls live in `data/<feature>_service.dart`.
- Services accept `ApiClient` and return typed domain models.
- **NO** UI imports in services.
- Handle response unwrapping (`data['data']`) in services, not in UI.

### 3. State Management (Current → Target)
- **Current:** `ServiceLocator` singleton pattern (temporary bridge)
- **Target:** Riverpod providers for all services, state, and computed values
- When migrating: replace `ServiceLocator.instance.xxxService` → `ref.watch/read`

### 4. Offline-First Pipeline (Target)
```
UI Event → Riverpod Notifier → Isar Write → UI Update
                                    ↓
                              Sync Queue → API POST
                                    ↓
                              Server ACK → Update Isar sync_status
```

### 5. Model Conventions
- Use `factory Model.fromJson(Map<String, dynamic> json)` for deserialization.
- Use `asDouble()` from `shared/models/json_helpers.dart` for safe numeric parsing.
- Nullable fields use `String?`, never empty string defaults.
- Enums use `const EnumType(this.value)` with `static fromValue()` factory.

### 6. Error Handling
- Use `showError(context, error)` from `core/utils/error_utils.dart`.
- Use `isAuthError(error)` to detect 401/token issues and trigger logout.
- Always guard async operations with `if (mounted)` before `setState`.
- Wrap API calls in try/catch/finally with loading state management.

### 7. UI Patterns
- Use `Card` as the primary container with `Padding(padding: EdgeInsets.all(12))`.
- Use `EmptyState` widget for zero-data screens.
- Loading: `CircularProgressIndicator` centered.
- Use `LayoutBuilder` for responsive layouts (wide ≥ 760px).
- Tables/grids: `FloorCanvas` with `InteractiveViewer` for pan/zoom.

### 8. Performance
- Use `Timer.periodic` for polling live data (15s default).
- Cancel timers in `dispose()`.
- Use `Future.wait()` for parallel API calls.
- Use `const` constructors wherever possible.

### 9. Security
- CSRF tokens auto-managed by `ApiClient` interceptors.
- Cookies stored in SharedPreferences (encrypted on device).
- Clear session on logout via `ApiClient.clearSession()`.

## Commands

```bash
cd apps/pos
flutter pub get
flutter run -d <device>
flutter analyze
flutter test
```
