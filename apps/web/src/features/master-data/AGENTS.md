# Master Data Feature Knowledge Base

**Location:** `apps/web/src/features/master-data/`
**Files:** ~310 TS/TSX files
**Sub-features:** Currencies, Customers, Employees, Geographic, Organizations, Products, Suppliers, Warehouses, etc.

## Structure

Each sub-feature follows the standard feature structure:

```
master-data/<sub-feature>/
├── types/           # `.d.ts` declarations
├── schemas/         # Zod validation schemas
├── hooks/           # TanStack Query hooks
├── services/        # API calls
├── components/      # List, form, detail components
└── i18n/            # `en.ts`, `id.ts`
```

## Patterns

### CRUD Standard

Master data features are predominantly CRUD. Standard pattern:

1. **List page**: Table with search, pagination, create/edit/delete actions
2. **Form modal**: Create/edit in modal (not separate page)
3. **Detail drawer**: Side panel for read-only detail view

### Cross-Module Selectors

Master data provides reference data used across modules:

```tsx
// Use server-side search + pagination
const { options, isLoading, hasMore, onLoadMore } = usePaginatedComboboxOptions({
  service: customerService.search,
  perPage: 20,
});
```

- Always use `per_page: 20` for selectors (not 100)
- Preserve selected values with pinned options in edit mode
- Debounce search with `searchDebounceMs={300}`

### FormData Endpoints

Master data forms often need reference data. Backend provides `GET /<entity>/form-data`:
- Countries, provinces for geographic selectors
- Parent categories for hierarchical data
- Status/type enum options

## Where to Look

| Sub-feature | Location |
|-------------|----------|
| Employee | `master-data/employee/` |
| Customer | `master-data/customer/` |
| Product | `master-data/product/` |
| Organization | `master-data/organization/` |
| Geographic | `master-data/geographic/` |
| Currency | `master-data/currencies/` |
| Warehouse | `master-data/warehouse/` |

## Anti-Patterns

- Using `per_page: 100` for selector dropdowns
- Missing `loading.tsx` for master data routes
- Duplicating form schemas across similar master data entities
- Not handling empty states in list views
