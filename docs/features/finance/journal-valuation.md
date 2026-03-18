# Journal Valuation

## Ringkasan Fitur
Fitur Journal Valuation digunakan untuk menjalankan proses valuasi sistem secara periodik, seperti valuasi inventaris (FIFO/Average), revaluasi kurs mata uang asing, depresiasi aset, dan penyesuaian biaya (cost adjustment). Fitur ini memastikan nilai aset dan kewajiban dalam General Ledger mencerminkan kondisi ekonomi terkini.

## Fitur Utama
1. **List Valuation Journals**: Menampilkan daftar jurnal yang dihasilkan dari proses valuasi.
2. **Run Valuation Process**: Menjalankan engine valuasi untuk menghitung dan memposting jurnal penyesuaian secara otomatis melalui form interaktif.
3. **Domain Filtering**: Memungkinkan filter jurnal berdasarkan tipe valuasi (Inventory, Currency, Cost, Depreciation).
4. **KPI Dashboard**: Menampilkan summary cards (Total Entries, Total Debit, Total Credit, Run Status).
5. **Run History**: Menampilkan riwayat valuation runs dengan status lifecycle.
6. **Concurrency Lock**: Hanya satu run yang bisa berjalan per tipe+periode.
7. **Idempotency**: Setiap run aman di-trigger berulang kali tanpa duplikasi jurnal.
8. **Permission-Gated Export**: Export data hanya tersedia bagi role yang memiliki hak.

## Business Rules
1. **System Generated**: Jurnal valuasi bersifat *system-generated* dan otomatis *posted*.
2. **Immutable**: Jurnal valuasi yang sudah posted tidak bisa diedit. Koreksi hanya melalui reverse journal.
3. **Idempotency**: Setiap proses valuasi harus idempotent menggunakan `reference_type` dan `reference_id` yang unik untuk setiap "run".
4. **Balanced Double-Entry**: Setiap jurnal valuasi harus memenuhi debit = credit sebelum diposting.
5. **Period Lock**: Tidak bisa post ke periode yang sudah ditutup (Financial Closing).
6. **Concurrency**: Hanya satu `processing` run per `valuation_type` + `period_start` + `period_end`.
7. **Valuation Run Lifecycle**: `requested → processing → completed / no_difference / failed`

## Keputusan Teknis
1. **Strategy Pattern**: Menggunakan `ValuationStrategy` interface untuk berbagai tipe valuasi (inventory, currency, depreciation, cost). Setiap strategy mengembalikan `ValuationResult` yang berisi journal lines dan totals.
2. **Valuation Run Table**: Tabel `valuation_runs` terpisah untuk tracking lifecycle, metadata, dan audit trail.
3. **Journal Entry Extension**: Model `JournalEntry` diperluas dengan `is_valuation`, `valuation_run_id`, dan `source` untuk segregasi yang jelas dari jurnal operasional.
4. **Single Engine**: Menggunakan `PostOrUpdateJournal` untuk memastikan konsistensi aturan akuntansi.

## Database Schema

### Tabel: `valuation_runs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Primary key |
| reference_id | VARCHAR(255) UNIQUE | Idempotency key (e.g. `VAL-RUN-INVENTORY-20260331-1742...`) |
| valuation_type | VARCHAR(50) | `inventory`, `currency`, `depreciation`, `cost` |
| period_start | DATE | Awal periode valuasi |
| period_end | DATE | Akhir periode valuasi |
| status | VARCHAR(20) | `requested`, `processing`, `completed`, `no_difference`, `failed` |
| total_debit | DECIMAL(18,2) | Total debit dari journal yang dihasilkan |
| total_credit | DECIMAL(18,2) | Total credit dari journal yang dihasilkan |
| journal_entry_id | UUID NULL FK | Referensi ke journal_entries.id |
| error_message | TEXT NULL | Error message jika gagal |
| created_by | UUID | User yang menjalankan |
| completed_at | TIMESTAMP NULL | Waktu selesai |

### Kolom Baru di `journal_entries`
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| is_valuation | BOOL | false | Menandai jurnal sebagai output valuasi |
| valuation_run_id | UUID NULL FK | NULL | Referensi ke valuation_runs.id |
| source | VARCHAR(20) | 'OPERATIONAL' | `OPERATIONAL` atau `VALUATION` |

## API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/finance/journal-entries/valuation` | List journals in valuation domain | `journal_valuation.read` |
| POST | `/finance/journal-entries/valuation/run` | Trigger valuation process | `journal_valuation.run` |
| GET | `/finance/journal-entries/valuation/runs` | List valuation runs with KPI meta | `journal_valuation.read` |
| GET | `/finance/journal-entries/valuation/runs/:id` | Get valuation run detail | `journal_valuation.read` |

### Request: POST `/finance/journal-entries/valuation/run`
```json
{
  "valuation_type": "inventory",
  "period_start": "2026-03-01",
  "period_end": "2026-03-31",
  "reference_id": "VAL-RUN-INVENTORY-20260331-001"
}
```

### Response: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "reference_id": "VAL-RUN-INVENTORY-20260331-001",
    "valuation_type": "inventory",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "status": "completed",
    "total_debit": 100.00,
    "total_credit": 100.00,
    "journal_entry_id": "uuid-...",
    "created_at": "2026-03-31T10:00:00+07:00",
    "updated_at": "2026-03-31T10:00:01+07:00",
    "completed_at": "2026-03-31T10:00:01+07:00"
  }
}
```

## RBAC Permissions
| Permission | Description | Roles |
|------------|-------------|-------|
| `journal_valuation.read` | View valuation journals & runs | Finance Manager, Accountant, Auditor |
| `journal_valuation.run` | Trigger valuation process | Finance Manager |
| `journal_valuation.export` | Export valuation data | Finance Manager, Auditor |

## Cara Test Manual
1. Buka menu **Finance > Journal Valuation**.
2. Klik tombol **Run Valuation**.
3. Pilih **Valuation Type** (e.g. Inventory).
4. Isi **Period Start** dan **Period End**.
5. Klik **Continue** → Review parameter → Klik **Confirm**.
6. Verifikasi:
   - Run baru muncul di panel "Recent Valuation Runs" dengan status `Completed`.
   - Jurnal baru muncul di tabel dengan status `Posted` dan reference type `INVENTORY_VALUATION`.
   - KPI cards terupdate (Total Entries, Debit, Credit bertambah).
7. Coba run lagi dengan period yang sama → harus tetap idempotent (tidak ada duplikasi jurnal).
