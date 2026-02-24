# CRM Deal Integration (Sprint 21)

Fitur integrasi CRM Deal dengan modul ERP — memungkinkan konversi Deal yang sudah Won menjadi Sales Quotation, pengecekan ketersediaan stok per produk item, migrasi data Sales Estimation ke CRM Deal, dan deprecation Sales Estimation module.

## Fitur Utama

- Konversi Deal → Sales Quotation (otomatis dari deal data)
- Stock availability check per product item pada deal
- Back-link dari Sales Quotation ke originating Deal (`source_deal_id`)
- Migration script untuk konversi data Sales Estimation → CRM Deal
- Deprecation Sales Estimation menu dan endpoint (redirect ke CRM Pipeline)
- Frontend redirect `/sales/estimations` → `/crm/pipeline`

## Business Rules

- Deal **harus berstatus `won`** sebelum bisa di-convert ke Sales Quotation
- Deal hanya bisa di-convert **satu kali** (idempotent check via `ConvertedToQuotationID`)
- Deal harus memiliki **minimal satu product item** untuk konversi
- Deal harus memiliki **customer** sebelum konversi
- Stock check membandingkan `requested_quantity` (dari deal items) vs `available_stock` (dari `inventory_batches`)
- Sales Quotation yang dibuat dari deal memiliki `source_deal_id` untuk traceability
- Quotation code di-generate otomatis dengan format `QUO-YYYYMM-XXXXX`
- Tax (PPN 11%) dihitung otomatis saat konversi

### Migration Rules (Sales Estimation → CRM Deal)

- Status mapping:
  - `draft` → Pipeline Stage: Qualification, Deal Status: open
  - `submitted` → Pipeline Stage: Proposal, Deal Status: open
  - `approved` → Pipeline Stage: Negotiation, Deal Status: open
  - `rejected` → Pipeline Stage: Closed Lost, Deal Status: lost
  - `converted` → Pipeline Stage: Closed Won, Deal Status: won
- Idempotent: skip estimations yang sudah pernah di-migrate (cek notes `[Migrated from Estimation: CODE]`)
- Estimasi yang sudah di-migrate ditandai dengan `[MIGRATED TO CRM DEAL]` di notes (soft archive)
- Preserve `ConvertedToQuotationID` linkage dari estimation yang status `converted`

## Keputusan Teknis

- **Menggunakan `source_deal_id` di SalesQuotation, bukan join table:**
  Relasi 1:1 sederhana (satu deal → satu quotation). Foreign key langsung lebih efisien dan mudah di-query. Trade-off: field nullable karena tidak semua quotation berasal dari deal.

- **Migration script sebagai standalone tool (`cmd/tools/`), bukan auto-migration:**
  Data migration adalah operasi one-time yang perlu kontrol manual. Menempatkan di `cmd/tools/migrate-estimations/` mengikuti pattern existing (`backfill-snapshots`). Trade-off: perlu dijalankan manual oleh admin.

- **Redirect API endpoint yang mengembalikan 301 + JSON error body:**
  API client mendapat informasi redirect yang machine-readable (`redirect_to`, `api_endpoint`) sekaligus HTTP 301 yang browser-friendly. Trade-off: non-standard JSON response untuk 301.

- **Frontend redirect menggunakan Next.js server-side `redirect()`:**
  Instant redirect tanpa client-side rendering. User yang bookmark `/sales/estimations` langsung diarahkan ke `/crm/pipeline`. Trade-off: tidak ada informational page yang menjelaskan deprecation.

- **Menu deprecation via `UpdateMenuStructure()` di seeder:**
  Mengikuti pattern existing untuk menu migration. Set `status = "inactive"` alih-alih delete untuk audit trail. Trade-off: menu tetap ada di database tapi tidak ditampilkan.

## Struktur Folder

```
# Backend — Deal Conversion & Stock Check
apps/api/internal/crm/
├── domain/
│   ├── dto/
│   │   └── deal_dto.go                    # ConvertToQuotationRequest/Response, StockCheckResponse
│   └── usecase/
│       └── deal_usecase.go                # ConvertToQuotation(), StockCheck() business logic
├── presentation/
│   ├── handler/
│   │   └── deal_handler.go                # ConvertToQuotation(), StockCheck() handlers
│   └── router/
│       └── deal_router.go                 # POST /:id/convert-to-quotation, GET /:id/stock-check

# Backend — Sales Quotation backlink
apps/api/internal/sales/
├── data/models/
│   └── sales_quotation.go                 # Added SourceDealID field
├── domain/
│   ├── dto/
│   │   └── sales_quotation_dto.go         # Added SourceDealID to response
│   └── mapper/
│       └── sales_quotation_mapper.go      # Added SourceDealID mapping

# Backend — Migration & Deprecation
apps/api/cmd/tools/
│   └── migrate-estimations/
│       └── main.go                        # Migration script: SalesEstimation → Deal
apps/api/internal/sales/presentation/
│   └── routers.go                         # GET /estimations → 301 redirect
apps/api/seeders/
│   └── menu_seeder.go                     # Deprecate Sales Estimation menu

# Frontend — Redirect
apps/web/app/[locale]/(dashboard)/sales/estimations/
│   └── page.tsx                           # Server-side redirect to /crm/pipeline
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/crm/deals/:id/convert-to-quotation` | crm_deal.convert_quotation | Convert won deal to Sales Quotation |
| GET | `/crm/deals/:id/stock-check` | crm_deal.read | Check stock availability per product item |
| GET | `/sales/estimations` | - | Deprecated: returns 301 redirect to `/crm/pipeline` |

### Error Codes

| Code | HTTP | Condition |
|------|------|-----------|
| `DEAL_NOT_WON` | 422 | Attempt to convert non-won deal |
| `DEAL_ALREADY_CONVERTED` | 409 | Deal already converted to quotation |
| `DEAL_NO_ITEMS` | 422 | Deal has no product items for quotation |
| `DEAL_CUSTOMER_REQUIRED` | 422 | Deal must have customer before conversion |
| `STOCK_CHECK_FAILED` | 500 | Failed to query inventory |
| `RESOURCE_DEPRECATED` | 301 | Sales Estimation endpoint deprecated |

## Cara Test Manual

### Konversi Deal → Quotation
1. Login sebagai user dengan permission `crm_deal.convert_quotation`
2. Navigate ke `/crm/pipeline`
3. Open deal dengan status "Won"
4. Click "Convert to Quotation" button
5. Optionally set payment terms, business unit, business type overrides
6. Submit → should show success with quotation code
7. Navigate ke Sales Quotation → verify quotation created with correct items, prices, customer
8. Check quotation detail → `source_deal_id` should reference original deal

### Stock Check
1. Open deal detail page
2. Click "Check Stock" button
3. Verify each product item shows available stock vs requested quantity
4. Green badge = sufficient, Red badge = insufficient

### Sales Estimation Redirect
1. Navigate ke `/sales/estimations` → should redirect to `/crm/pipeline`
2. Call `GET /api/v1/sales/estimations` → should return 301 with redirect info
3. Verify Sales Estimation menu is hidden in sidebar

### Migration Script
```bash
cd apps/api
go run ./cmd/tools/migrate-estimations/main.go
# Verify deals created from estimations in CRM Pipeline
# Verify estimations archived with [MIGRATED TO CRM DEAL] note
```

## Automated Testing

- **Backend**: `go test ./internal/crm/domain/usecase/... -run TestConvertToQuotation`
- **Backend**: `go test ./internal/crm/domain/usecase/... -run TestStockCheck`

## Dependencies

- **Backend**: GORM (models), Sales module (SalesQuotation, SalesQuotationItem), Inventory module (InventoryBatch), Product module (pricing)
- **Frontend**: TanStack Query (mutations), next-intl (locale routing), next/navigation (redirect)
- **Integration**: CRM Deal → Sales Quotation → Sales Order pipeline

## Related Links

- Sprint Planning: `docs/crm-integration-sprint-planning.md` (Sprint 21)
- Sales Quotation model: `apps/api/internal/sales/data/models/sales_quotation.go`
- Deal usecase: `apps/api/internal/crm/domain/usecase/deal_usecase.go`

## Notes & Improvements

- **Known Limitation**: Migration script does not handle SalesEstimation items with `EstimatedPrice = 0` gracefully
- **Future Improvement**:
  - Add notification when deal is converted to quotation
  - Add bulk conversion for multiple won deals
  - Add conversion undo (delete quotation, reset deal conversion status)
- **Performance**: Stock check queries `inventory_batches` per product — for deals with many items, consider batch query optimization
