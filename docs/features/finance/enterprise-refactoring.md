# Finance Enterprise Refactoring

## 1. Ringkasan Fitur
Refactoring modul Finance pada GIMS Platform untuk menyelaraskan dengan standar enterprise. Fokus utama adalah pada sentralisasi *Accounting Engine*, eliminasi *hardcoded logic* melalui *System Settings*, standardisasi *Reference Types*, dan perkuatan struktur *RBAC* dengan pendekatan arsitektur berlapis (Clean Architecture) yang telah ada.

## 2. Fitur Utama
- **Centralized Accounting Engine**: Pemisahan logika pembuatan jurnal (sisi debit, kredit, memo) ke dalam satu modul `AccountingEngine` berdasarkan `PostingProfile`.
- **System Settings Configuration**: Konfigurasi COA dan pengaturan dinamis disimpan di database melalui mekanisme `FinanceSetting`, menggantikan konstanta *hardcode*.
- **Reference Type & Action Standardization**: Menggunakan registri `reference.go` yang terpusat untuk *human-readable codes*, status, dan manajemen *permission* RBAC (gabungan *RefType* + *Action*).
- **Enhanced Audit Trail**: Mendukung *field-level changes tracking* menggunakan utilitas `audit_diff.go` pada *service implementation*.
- **Repository Optimization**: Perubahan *raw SQL queries* ke implementasi *repository layer* menggunakan GORM (contoh: Pembangunan ref codes dokumen jurnal).

## 3. Business Rules
- Pembuatan jurnal untuk transaksi *Cash Bank*, *Payment*, *Non-Trade Payable*, dan *Up-Country Cost* kini diwajibkan melewati `AccountingEngine` via `GenerateJournal`.
- Kode akun (COA) untuk jurnal standar (Hutang Biaya, Beban Perjalanan, Laba Ditahan) kini dibaca secara dinamis dari tabel `finance_settings` dan dapat disesuaikan per perusahaan.
- Izin akses pengguna (RBAC) pada *router* tidak lagi menggunakan teks statis tetapi digenerate dinamis, misal `reference.PermissionKey(reference.RefTypePayment, reference.ActionApprove)`.

## 4. Keputusan Teknis
- Mempertahankan stuktur *vertical slice* Golang (`models`, `repositories`, `dto`, `mapper`, `usecase`, `presentation`).
- Membuat entitas `FinanceSetting` dan implementasi `SettingsService` yang dapat diinjeksi ke modul mana saja yang membutuhkan konfigurasi dinamis.
- Mengunggah fungsi penyelesaian *Reference Codes* (untuk nomor dokumen di UI) menggunakan `BatchResolveJournalReferenceCodes` ke layer *repository*, menggantikan *db.Raw*.
	- Mengimplementasikan `FinanceSettingsSeeder` yang ditambahkan langsung ke inisialisasi awal program (`seed_all.go`) guna memastikan default settings selalu tersedia.
	- Mengganti COA *hardcode* (`21000`, `21100`, `11800`, dsb.) pada modul `Purchase` (Supplier Invoice, PO Payment, DP) dengan mekanisme `SettingsService`.

## 5. API Endpoints
Endpoints tidak mengalami perubahan URL, namun standarisasi Middleware RBAC telah diperbarui ke implementasi baru.

| Endpoint | Method | Permission Key Format | Deskripsi |
|---|---|---|---|
| `/finance/payments` | `GET/POST/PUT/DELETE` | `<refType>.<action>` | Standard CRUD dengan enforced access |
| `/finance/non-trade-payables` | `GET/POST/PUT/DELETE` | `<refType>.<action>` | Standard CRUD dengan enforced access |
| `/finance/up-country-costs` | `GET/POST/PUT/DELETE` | `<refType>.<action>` | Standard CRUD dengan enforced access |

## 6. Configuration Cleanup & Obsolete Files Removal
Pembersihan konfigurasi lama dalam rangka transisi ke arsitektur *config-driven database*:
1. **Auto Init / Bootstrap Dihapus**: Aplikasi (backend/main.go) tidak lagi menjalankan *auto-migration* dan *auto-seed* otomatis saat start default di produksi. Diubah menjadi proses manual/script (*RunMigrations* dan *RunSeeders* default dimatikan/diarahkan ke manual invocation).
2. **Hardcoded Finance Seeders Dinonaktifkan**: `SeedFinanceSprint12()`, `SeedPurchaseFinanceE2E()`, dan `SeedIntegrationFlow()` yang sebelumnya men-*seed* data transaksi dan master *finance* menggunakan COA *hardcode* telah dinonaktifkan di `seed_all.go`.
3. **Pembersihan Docker Configuration**: Environment variables *useless/obsolete* yang terkait seeder (seperti `SEED_ONLY_MASTER_DATA`, `SEED_MINIMAL_DATA`, `SEED_ONCE`, `MIGRATE_ONCE`, `VALIDATE_FINANCE_START`) di `docker-compose.yml` telah dihapus sepenuhnya guna simplifikasi dev ops.
4. **Ad-hoc Scripts Dipertahankan Sebagai Manual Script**: Script perbaikan COA di `cmd/fix_journals/main.go` tetap ada namun nilai konstanta COA telah disejajarkan dengan `finance_settings` terbaru sebagai perbaikan manual apabila diperlukan oleh tim operasi.

## 7. Cara Test Manual
1. Pastikan *database* di-seed ulang dengan minimal *Master Data* di-load. `pnpm dev` di *backend* (menggunakan `DROP_ALL_TABLES=true`).
2. Masukkan data transaksi simulasi (contoh pembuatan *Up-Country Cost* atau *Non-Trade Payable* maupun *Supplier Invoice*) lalu *Approve*.
3. Verifikasi ketersediaan catatan jurnal yang kini mengacu pada pengaturan `finance_settings`.
4. Periksa tabel `audit_logs` untuk transaksinya, pastikan string JSON `changes` mencatat apa saja yang berubah.
5. Verifikasi fungsionalitas menu `Finance` terender secara akurat bagi pengguna yang sesuai dengan `PermissionKeys` termutakhir.

