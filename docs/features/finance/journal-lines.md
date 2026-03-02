# Journal Lines (Sub-Ledger View)

Fitur untuk melihat seluruh baris jurnal (journal lines) lintas akun dengan running balance per akun. Menyediakan tampilan sub-ledger yang memungkinkan akuntan menelusuri setiap transaksi per Chart of Account, lengkap dengan filter, pencarian, dan ekspor CSV.

## Fitur Utama

- Daftar seluruh journal lines dengan pagination (max 100 per halaman)
- Filter berdasarkan: COA, Account Type, Journal Status (DRAFT/POSTED), Reference Type, Date Range
- Pencarian teks pada COA code, COA name, dan memo (menggunakan snapshot columns)
- **Running balance** — kalkulasi saldo berjalan per akun (muncul saat filter COA tunggal aktif)
- Debit-normal vs Credit-normal account handling otomatis
- Footer totals per halaman (total debit & credit)
- Ekspor CSV hingga 10.000 baris
- Draft rows ditandai visual (latar kuning)
- Info banner saat running balance aktif

## Business Rules

- Running balance hanya dihitung ketika filter `chart_of_account_id` tunggal aktif
- **Debit-normal accounts**: ASSET, CASH_BANK, CURRENT_ASSET, FIXED_ASSET, EXPENSE, COST_OF_GOODS_SOLD, SALARY_WAGES, OPERATIONAL → balance = debit - credit
- **Credit-normal accounts**: LIABILITY, TRADE_PAYABLE, EQUITY, REVENUE → balance = credit - debit
- Sort order wajib: `entry_date ASC, created_at ASC, jl.id ASC` untuk konsistensi running balance
- Untuk page > 1, opening balance dihitung dari seluruh item sebelum halaman saat ini
- Pencarian menggunakan `_snapshot` columns (`coa_code_snapshot`, `coa_name_snapshot`) — bukan JOIN ke master COA
- Ekspor CSV dibatasi maksimal 10.000 baris sebagai safety limit
- Pagination enforced: max `per_page` = 100, default = 20

## Keputusan Teknis

- **Mengapa menggunakan snapshot columns untuk search**: 
  Snapshot columns (`coa_code_snapshot`, `coa_name_snapshot`) di-copy saat journal entry dibuat. Ini memastikan data historis tetap akurat meskipun master COA berubah. Trade-off: data duplikat, tapi consistency lebih penting untuk accounting.

- **Mengapa running balance hanya untuk single COA filter**:
  Running balance across multiple accounts tidak bermakna secara akuntansi. Trade-off: user harus memilih satu akun untuk melihat saldo berjalan.

- **Mengapa pagination-aware opening balance (bukan cursor-based)**:
  Offset pagination sudah cukup untuk volume data journal lines. Opening balance untuk page N dihitung dari semua item sebelumnya. Trade-off: slight performance cost untuk page besar, tapi acceptable karena max 100 per page.

- **Mengapa reuse `journalRead` permission**:
  Journal lines adalah view read-only dari data journal entries. Tidak perlu permission terpisah. Trade-off: granularity permission lebih rendah, tapi simplifies authorization model.

## Struktur Folder

```
# Backend
apps/api/internal/finance/
├── data/
│   ├── models/journal_entry.go          # JournalEntry + JournalLine models
│   └── repositories/
│       ├── journal_entry_repository.go   # Existing
│       └── journal_line_repository.go    # NEW - List + SumBeforeDate
├── domain/
│   ├── dto/journal_entry_dto.go          # Extended with JournalLine DTOs
│   ├── mapper/journal_entry_mapper.go    # Updated with new fields
│   └── usecase/
│       ├── journal_entry_usecase.go      # Existing
│       └── journal_line_usecase.go       # NEW - ListLines + ExportCSV
└── presentation/
    ├── handler/
    │   ├── journal_entry_handler.go      # Existing
    │   └── journal_line_handler.go       # NEW
    ├── router/
    │   ├── journal_entry_routers.go      # Existing
    │   └── journal_line_routers.go       # NEW
    └── routes.go                         # Updated wiring

# Frontend
apps/web/src/features/finance/journal-lines/
├── types/index.d.ts
├── schemas/journal-lines.schema.ts
├── services/journal-lines-service.ts
├── hooks/use-journal-lines.ts
├── components/
│   ├── index.tsx                    # Container with dynamic import
│   └── journal-lines-list.tsx       # Main list component
└── i18n/
    ├── en.ts
    └── id.ts

# Route
apps/web/app/[locale]/(dashboard)/finance/journal-lines/
├── page.tsx
└── loading.tsx
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/finance/journal-lines` | `journal.read` | List journal lines with filters, pagination, running balance |
| GET | `/api/v1/finance/journal-lines/export` | `journal.read` | Export journal lines as CSV (max 10K rows) |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Search COA code, name, or memo |
| `chart_of_account_id` | uuid | - | Filter by COA (enables running balance) |
| `account_type` | string | - | Filter by account type |
| `journal_status` | string | - | DRAFT or POSTED |
| `reference_type` | string | - | GENERAL, SALES, PURCHASE, PAYMENT, RECEIPT, ADJUSTMENT |
| `date_from` | date | - | Start date (YYYY-MM-DD) |
| `date_to` | date | - | End date (YYYY-MM-DD) |
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |

### Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "journal_entry_id": "uuid",
      "journal_number": "JE-2025-0001",
      "entry_date": "2025-01-15",
      "reference_type": "GENERAL",
      "status": "POSTED",
      "chart_of_account_id": "uuid",
      "coa_code_snapshot": "1-1100",
      "coa_name_snapshot": "Kas",
      "debit": 5000000,
      "credit": 0,
      "memo": "Pembayaran invoice",
      "running_balance": 5000000,
      "created_at": "2025-01-15T10:30:00+07:00"
    }
  ],
  "meta": {
    "pagination": {
      "total": 150,
      "page": 1,
      "per_page": 20,
      "total_pages": 8
    }
  }
}
```

## Cara Test Manual

1. Login sebagai user dengan permission `journal.read`
2. Navigate ke `/finance/journal-lines`
3. Verifikasi tabel muncul dengan semua journal lines
4. Test pencarian: ketik kode COA (misal "1-1100") → data terfilter
5. Pilih satu COA dari dropdown → running balance column muncul, info banner aktif
6. Verifikasi running balance: debit-normal account → balance = debit - credit
7. Test filter Account Type = ASSET → hanya akun aset yang muncul
8. Test filter Status = DRAFT → hanya draft entries, rows berwarna kuning
9. Test date range filter → data terfilter sesuai tanggal
10. Klik "Reset Filters" → semua filter kembali default
11. Klik "Export CSV" → file CSV terdownload
12. Test pagination: navigasi halaman, verifikasi running balance konsisten antar halaman
13. Verifikasi footer totals menampilkan total debit & credit per halaman

## Automated Testing

```bash
# Backend
cd apps/api && go test ./internal/finance/domain/usecase/... -v -run TestJournalLine
cd apps/api && go test ./internal/finance/data/repositories/... -v -run TestJournalLine

# Frontend
cd apps/web && npx pnpm test journal-lines
```

## Dependencies

- **Backend**: GORM (models), `security.ApplyScopeFilter` (row-level access), `helpers.NormalizePagination`, `helpers.ParseDateOptional`
- **Frontend**: TanStack Query (data fetching), Zod (filter validation), `useFinanceCoaTree` (COA dropdown), Framer Motion (page transition), `DataTablePagination` (pagination)
- **Integration**: Journal Entries module (data source), Chart of Accounts module (COA dropdown + account types)

## Notes & Improvements

- **Known Limitation**: Running balance pagination menggunakan offset-based calculation — untuk dataset sangat besar (>100K lines per akun), bisa jadi lambat di halaman terakhir
- **Future Improvement**:
  - Add cursor-based pagination untuk performa running balance yang lebih baik
  - Add column sorting (saat ini fixed ASC untuk konsistensi balance)
  - Add date-range presets (This Month, Last Month, This Quarter, This Year)
  - Add print view / PDF export
  - Add drill-down ke journal entry detail saat klik baris
- **Bug Fix Applied**: `IsSystemGenerated` dan `SourceDocumentURL` fields ditambahkan ke model `journal_entry.go` — sebelumnya missing tapi sudah direferensikan oleh usecase (compile error)
