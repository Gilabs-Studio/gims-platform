**Reminder Untuk Perubahan Seeder / Model / Relasi**

Dokumen ini ditujukan sebagai pengingat untuk developer dan AI agent saat melakukan perubahan pada seeder, model, atau menambahkan relasi. Poin utama: jangan mengubah nama kolom yang sudah ada pada environment production karena sudah ada data klien aktif.

**Aturan Utama**
- **Jangan Ubah Nama Kolom**: Hindari mengganti nama kolom yang sudah ada pada tabel di production. Perubahan nama kolom akan memutus referensi data dan menimbulkan downtime atau kehilangan data.
- **Tambah Kolom Baru, Jangan Ganti**: Untuk perubahan skema, tambahkan kolom baru (prefer `NULL` default atau default value yang aman), kemudian lakukan backfill terpisah jika perlu.
- **Rollback & Idempotency**: Setiap migration SQL harus memiliki cara rollback yang jelas. Migration harus idempotent bila mungkin (cek keberadaan kolom/tabel sebelum membuat).
- **Jalankan Migrasi di Staging Terlebih Dahulu**: Selalu verifikasi migrasi di environment staging yang mereplikasi data produksi sebelum deploy ke production.

**Konvensi Penempatan File SQL Migration**
- Semua file migration SQL harus diletakkan di `@file:migrations` dengan struktur folder per model. Contoh struktur:

  migrations/
  - users/
    - 20260517_add_user_bio.sql
  - orders/
    - 20260517_add_order_status.sql

- Nama folder: gunakan nama model atau nama domain (lowercase, underscore jika perlu).
- Nama file: awali dengan timestamp `YYYYMMDD` lalu deskripsi singkat, berekstensi `.sql`.
- Di dalam file `.sql` sertakan comment header yang menjelaskan tujuan, author, dan langkah rollback.

**Checklist Untuk Developer / AI Agent Saat Mengubah Seeder / Model / Relasi**
- **Review Impact**: Identifikasi tabel/kolom yang terpengaruh dan apakah data production akan dipengaruhi.
- **Schema Change Pattern**:
  - Tambah kolom nullable terlebih dahulu.
  - Deploy code yang menulis ke kolom baru (toleran ketika kolom kosong).
  - Backfill data secara terpisah (batch job) jika perlu.
  - Setelah backfill selesai dan stabil, ubah kolom ke NOT NULL jika memang diperlukan (dengan migrasi terpisah).
- **Seeder Changes**:
  - Seeder harus idempotent atau memiliki guard (cek apakah record sudah ada) agar aman dijalankan ulang.
  - Jangan menghapus atau merubah ID/primary key dari data production di seeder.
- **Relasi Baru**:
  - Tambah foreign key secara bertahap: buat kolom FK nullable dulu, backfill, lalu tambahkan constraint apabila semua baris valid.
  - Periksa cascading effects (ON DELETE/UPDATE) dan pastikan sesuai kebijakan bisnis.
- **Feature Flags / Release Toggle**: Untuk perubahan yang membutuhkan roll-out bertahap, gunakan feature flag agar frontend/backend dapat mengaktifkan fitur setelah semua migrasi selesai.
- **Migration Size & Locking**: Hindari migrasi yang mengunci tabel besar pada waktu lama. Jika perlu, gunakan teknik online-migration (contoh: menambahkan kolom tanpa index, buat index secara terpisah, migrasi batch untuk update nilai).

**Langkah PR / Code Review**
- Sertakan file SQL migration di PR bersama kode yang memerlukan skema baru.
- Tulis penjelasan di deskripsi PR: apa yang berubah, risiko, langkah backfill, roll sback plan, dan testing steps.
- Tandai reviewer DB/ops jika perubahan mempengaruhi tabel besar atau sensitif.

**Testing & Verifikasi**
- Jalankan migrasi di local + staging yang mereplikasi struktur dan data sampel produksi.
- Verifikasi seeder berjalan idempotent di environment non-prod.
- Siapkan query verifikasi (contoh: count rows with new column IS NULL) dan sertakan di PR.

**Deployment Notes**
- Rilis migrasi sebelum rilis kode yang mengandalkan perubahan yang merusak. Jika rilis berurutan diperlukan, dokumentasikan urutan deploy.
- Monitor DB metrics (locks, long queries) saat menjalankan migrasi di production.
- Siapkan runbook singkat untuk rollback dan point-of-contact (ops/DBA).

**Contoh Header di File Migration SQL**
-- Migration: 20260517_add_user_bio.sql
-- Author: nama_developer
-- Purpose: menambahkan kolom `bio` pada tabel `users` sebagai nullable
-- Rollback: ALTER TABLE users DROP COLUMN IF EXISTS bio;

**Analisis Ketentuan Lain untuk Mempermudah Deployment**
- Gunakan migration kecil dan terpisah alih-alih perubahan besar dalam satu migration.
- Hindari mengubah tipe kolom jika tidak perlu; jika harus, lakukan dengan strategi: tambah kolom baru, backfill, swap column names via view atau aplikasi, lalu hapus kolom lama setelah cutover.
- Dokumentasikan semua perubahan skema di changelog atau di PR template (tanggal, author, risiko, rollback).
- Pastikan backup DB tersedia sebelum menjalankan migrasi kritis.
- Untuk data sensitif, periksa compliance sebelum memodifikasi schema atau seed data.

---
Jika Anda ingin, saya bisa:
- menambahkan contoh folder `migrations/` berisi subfolder per model dan contoh `.sql` file,
- atau membuat checklist PR template yang bisa dimasukkan ke `.github/PULL_REQUEST_TEMPLATE.md`.

Catatan: jangan lupa untuk mengupdate `apps/api/internal/core/infrastructure/database/migrate.go` jika proyek Anda mendaftarkan model baru di sana.
