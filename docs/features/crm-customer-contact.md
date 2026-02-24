# CRM Customer Contact Management

Fitur untuk mengelola kontak person yang terkait dengan Customer. Contact diakses melalui tab "Contacts" di Customer side panel, bukan sebagai halaman terpisah. Memungkinkan user mencatat nama, role, position, phone, email, dan catatan untuk setiap kontak di customer.

## Fitur Utama

- CRUD kontak per customer (create, read, update, soft delete)
- Relasi ke `crm_contact_roles` (Decision Maker, Technical Contact, Billing Contact, dll.)
- Tab "Contacts" di dalam Customer side panel (view mode)
- Quick-add contact langsung dari Customer tab
- Search kontak berdasarkan nama, email, phone, position
- Filter berdasarkan `customer_id` dan `contact_role_id`
- Form data endpoint untuk dropdown customer + contact roles
- Permission-based access control (RBAC)

## Business Rules

- Setiap Contact **wajib** memiliki `customer_id` yang valid (FK ke `customers`)
- Nama contact harus **unik per customer** (tidak boleh ada 2 contact dengan nama sama di 1 customer)
- `contact_role_id` bersifat opsional (FK ke `crm_contact_roles`)
- Default `is_active = true` saat create jika tidak diisi
- Soft delete (data tetap ada di database untuk audit trail)
- Partial update — hanya field yang dikirim yang diubah

## Keputusan Teknis

- **Contact diakses via Customer tab, bukan halaman terpisah:**
  Contact adalah child entity dari Customer. Mengakses via tab di side panel lebih intuitif dan mengurangi navigasi. Tidak ada route `/crm/contacts`.

- **Menggunakan CRM contacts endpoint dengan filter, bukan customer endpoint:**
  Sprint spec awalnya meminta `GET /api/v1/customers/:id/contacts`, tetapi implementasi menggunakan `GET /api/v1/crm/contacts?customer_id=xxx` untuk menghindari cross-domain coupling antara customer module dan CRM module. Trade-off: satu endpoint saja yang perlu di-maintain.

- **Contact roles menggunakan `crm_contact_roles` yang sudah ada:**
  Reuse tabel yang dibuat di Sprint 17 (CRM Settings). Tidak perlu tabel baru.

- **Customer side panel menggunakan CSS hidden untuk tab switching:**
  Form fields tetap rendered saat contacts tab aktif (hidden via CSS class). Ini menghindari duplikasi JSX yang sangat panjang (800+ lines).

## Struktur Folder

```
# Backend
apps/api/internal/crm/
├── data/
│   ├── models/
│   │   └── contact.go              # GORM entity
│   └── repositories/
│       └── contact_repository.go   # Data access layer
├── domain/
│   ├── dto/
│   │   └── contact_dto.go          # Request/Response DTOs
│   ├── mapper/
│   │   └── contact_mapper.go       # Model <-> DTO conversion
│   └── usecase/
│       └── contact_usecase.go      # Business logic
└── presentation/
    ├── handler/
    │   └── contact_handler.go      # HTTP handlers
    ├── router/
    │   └── contact_router.go       # Route definitions
    └── routers.go                  # Domain aggregator (updated)

# Frontend
apps/web/src/features/crm/contact/
├── types/
│   └── index.d.ts                  # TypeScript interfaces
├── services/
│   └── contact-service.ts          # API client
├── hooks/
│   ├── use-contact.ts              # TanStack Query hooks
│   └── use-contact-form.ts         # Zod schema + form hook
├── components/
│   ├── contact-side-panel.tsx      # Drawer form (create/edit/view)
│   └── customer-contacts-tab.tsx   # Embeddable contacts list
└── i18n/
    ├── en.ts                       # English translations
    └── id.ts                       # Indonesian translations

# Integration point
apps/web/src/features/master-data/customer/components/customer/customer-side-panel.tsx
  # Updated: added Tabs (Details | Contacts) in view mode
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/crm/contacts` | crm_contact.read | List contacts (paginated, filterable) |
| GET | `/api/v1/crm/contacts/form-data` | crm_contact.read | Form data: customers + contact roles |
| GET | `/api/v1/crm/contacts/:id` | crm_contact.read | Get contact detail |
| POST | `/api/v1/crm/contacts` | crm_contact.create | Create contact |
| PUT | `/api/v1/crm/contacts/:id` | crm_contact.update | Update contact (partial) |
| DELETE | `/api/v1/crm/contacts/:id` | crm_contact.delete | Soft delete contact |

### Query Parameters (GET list)

| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| per_page | int | Items per page (default: 20, max: 100) |
| search | string | Search name, email, phone, position |
| customer_id | uuid | Filter by customer |
| contact_role_id | uuid | Filter by contact role |

## Manual Testing

1. Login sebagai admin
2. Navigate ke `/master-data/customers`
3. Click salah satu customer untuk buka side panel (view mode)
4. Pastikan ada 2 tab: "View Details" dan "Contacts"
5. Click tab "Contacts" — list contacts untuk customer tersebut muncul
6. Click "Add Contact" — side panel form terbuka
7. Isi form: nama, role, phone, email → Submit
8. Contact baru muncul di list
9. Click contact → side panel terbuka (view/edit mode)
10. Edit contact → Save → perubahan tersimpan
11. Click delete → konfirmasi → contact terhapus dari list

## Automated Testing

- **Backend unit tests**: `apps/api/internal/crm/domain/usecase/contact_usecase_test.go` (belum dibuat)
- **Integration tests**: `apps/api/test/crm/contact_integration_test.go` (belum dibuat)

**Run Tests:**
```bash
# Backend
cd apps/api && go test ./internal/crm/...

# Frontend
cd apps/web && npx pnpm test contact
```

## Dependencies

- **Backend**: GORM (models), Gin (HTTP), UUID (google/uuid)
- **Frontend**: TanStack Query (data fetching), Zod (validation), react-hook-form, shadcn/ui Drawer
- **Integration**: Customer module (import customer models for FK), CRM Contact Roles (Sprint 17)

## Notes & Improvements

- **Known Limitation**: Contact hanya bisa diakses dari Customer side panel. Belum bisa diakses dari Lead, Deal, atau Visit (fitur tersebut belum ada, akan ditambahkan di sprint mendatang).
- **Not Implemented**: Customer detail response belum include contacts count.
- **Future Improvement**:
  - Add contacts count ke customer list/detail response
  - Support akses contact dari Lead, Deal, Visit side panels
  - Bulk import contacts dari CSV/Excel
  - Contact activity history/timeline
