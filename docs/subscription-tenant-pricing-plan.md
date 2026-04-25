# Tenant Subscription, Pricing, and Entitlement Plan

Dokumen ini menjadi working plan untuk menyelesaikan implementasi tenant subscription end-to-end pada GIMS ERP.

Fokus utama:
- pricing dan paket langganan yang tersimpan di database
- coupon yang fleksibel untuk tier tertentu atau general discount
- integrasi payment subscription via Xendit
- seeder auth, permission, dan akses CRUD yang selaras dengan langganan
- sinkronisasi UI register form, master data permission, dan navigasi menu
- strategi jangka panjang untuk SaaS ERP besar yang kompleks

## 1. Tujuan Arsitektur Jangka Panjang

Untuk SaaS ERP yang besar, jangan jadikan permission sebagai satu-satunya mekanisme access control.

Pola yang lebih aman dan tahan lama adalah:

- **Subscription entitlements** = menentukan modul/fitur apa yang dibeli tenant.
- **RBAC permissions** = menentukan aksi apa yang boleh dilakukan user di dalam tenant yang memang punya entitlement itu.
- **Menu visibility** = hanya hasil turunan dari entitlements + permissions, bukan sumber kebenaran.
- **Server-side enforcement** = semua API tetap divalidasi di backend, UI hanya untuk pengalaman pengguna.

Dengan pola ini, plan lock di UI boleh ada, tetapi rule utama tetap di server.

## 2. File yang Perlu Diubah

### A. Backend subscription core

File yang kemungkinan harus diubah atau ditambah:

- `apps/api/internal/tenant/data/models/tenant_subscription.go`
- `apps/api/internal/tenant/data/models/coupon.go`
- `apps/api/internal/tenant/data/repositories/subscription_repository.go`
- `apps/api/internal/tenant/data/repositories/coupon_repository.go`
- `apps/api/internal/tenant/domain/usecase/subscription_usecase.go`
- `apps/api/internal/tenant/domain/usecase/coupon_usecase.go`
- `apps/api/internal/tenant/domain/dto/coupon_subscription_dto.go`
- `apps/api/internal/tenant/presentation/handler/*`
- `apps/api/internal/tenant/presentation/router/system_admin_router.go`
- `apps/api/internal/auth/domain/usecase/auth_usecase.go`
- `apps/api/internal/auth/domain/dto/auth_dto.go`
- `apps/api/internal/auth/presentation/handler/auth_handler.go`
- `apps/api/internal/auth/presentation/handler/xendit_handler.go`
- `apps/api/internal/auth/presentation/router/auth_routers.go`
- `apps/api/internal/core/infrastructure/xendit/client.go`

### B. Backend seeders and migration

- `apps/api/seeders/seed_all.go`
- `apps/api/seeders/permission_seeder.go`
- `apps/api/seeders/menu_seeder.go`
- `apps/api/seeders/organization_seeder.go` if menu entitlements need default org data
- `apps/api/internal/core/infrastructure/database/migrate.go`
- subscription/coupon migration files under `apps/api/migrations/`

### C. Backend module access control

Untuk lock akses paket per modul, file yang perlu ditambahkan atau disesuaikan:

- middleware entitlement guard di `apps/api/internal/core/middleware/`
- subscription entitlement service di `apps/api/internal/tenant/` atau `apps/api/internal/subscription/` bila dipisah
- helper policy untuk mapping plan -> module -> route/permission

### D. Frontend register and subscription UI

- `apps/web/src/features/auth/components/register-form.tsx`
- `apps/web/src/features/auth/services/*`
- `apps/web/src/features/auth/hooks/*`
- `apps/web/src/features/auth/i18n/*`
- `apps/web/src/i18n/request.ts`
- `apps/web/src/lib/navigation-config.ts`
- route pages untuk register success / billing result bila diperlukan

### E. Master data and RBAC screens

Kalau role master data ingin menampilkan permission yang terkunci oleh langganan, perlu touch:

- `apps/web/src/features/master-data/**`
- `apps/web/src/features/system-admin/**` atau halaman admin subscription/coupon bila ada
- backend role/permission endpoints yang dipakai screen tersebut

## 3. Scope Implementasi per Fase

### Fase 1. Data model dan seed baseline

Target:
- data langganan tidak hardcoded di UI
- paket dan harga bisa diubah dari DB
- permission seed mengikuti menu yang tersedia

Pekerjaan:
- simpan bundle dan modular plan di database
- tambahkan metadata paket: nama, slug, kategori, billing type, harga, status aktif, feature list, dependency list
- siapkan cache read-through untuk membaca pricing dan entitlements
- update seeder permission agar mencakup menu akses lengkap sesuai navigation config
- update seeder auth agar role dasar cocok dengan paket minimum tenant

### Fase 2. Coupon engine yang fleksibel

Target:
- coupon bisa general discount atau tier-specific discount
- coupon bisa berlaku untuk subset package tertentu
- register form menyesuaikan bila coupon khusus tier membuat satu plan jadi satu-satunya pilihan valid

Pekerjaan:
- ubah model coupon agar mendukung scope discount, target plan, target module, amount/percent, validity window, max usage, tenant limit, email limit
- simpan redemption history yang aman untuk audit
- validasi coupon di backend sebelum register finalize
- tampilkan informasi coupon yang sesuai di register form

### Fase 3. Xendit subscription flow

Target:
- checkout subscription menggunakan Xendit
- webhook mengaktifkan tenant subscription secara idempotent
- status pembayaran dan subscription sinkron

Pekerjaan:
- tambah subscription checkout object dan invoice/subscription mapping
- simpan external ID, payment ID, invoice ID, status, next billing date, renewal state
- buat webhook handler yang idempotent
- siapkan retry-safe update untuk provisioning tenant

Rujukan teknis:
- `https://docs.xendit.co/docs/subscriptions-overview`
- `https://docs.xendit.co/docs/subscriptions-features`

### Fase 4. Entitlement gating untuk menu dan API

Target:
- tenant yang tidak berlangganan modul tertentu tidak bisa mengakses menu dan API modul itu
- role permission di UI ikut terkunci, tetapi enforcement tetap di backend

Pekerjaan:
- buat mapping plan -> module access -> route groups -> permission groups
- implement middleware entitlement check
- UI menu hide/disable berdasarkan hasil entitlement profile tenant
- master data role editor menampilkan permission yang locked bila module belum aktif

### Fase 5. POS package rollout

Target:
- paket POS mengikuti scope bisnis yang telah disepakati
- dependency module otomatis ikut aktif jika paket POS aktif

Scope POS:
- `pos/terminal`
- `pos/live-table`
- `pos/floor-layout`
- `pos/loyalty`
- `pos/feedback`

Dependency data yang harus diperhitungkan:
- products
- inventory
- outlets
- users/employees
- feedback forms/responses
- loyalty programs/members

## 4. Mapping Paket yang Disarankan

### A. Growth Suite

Sasaran paket:
- POS
- ERP inti: sales, purchase, stock, finance pendukung
- CRM inti

Saran akses minimum:
- POS: terminal, floor layout, live table bila F&B, loyalty, feedback
- Sales: sales orders, customer invoices, payments
- Purchase: purchase orders, supplier invoices, payments
- Stock: inventory, movements
- Finance pendukung: journals purchase/sales, bank accounts, fiscal years
- CRM: leads, pipeline, tasks, visit reports, sales target

### B. Ultimate Suite

Sasaran paket:
- seluruh menu yang ada

### C. POS Growth

Sasaran paket:
- POS front-of-house dan fitur operasional outlet

### D. ERP Pro

Sasaran paket:
- Sales, Purchase, Stock, Finance pendukung
- tanpa full POS atau HRD kecuali add-on

### E. CRM Growth

Sasaran paket:
- CRM lead-to-opportunity-to-order flow

### F. HR Growth

Sasaran paket:
- attendance, leave, overtime, evaluation, recruitment, work schedule, holidays

## 5. Menyesuaikan Register Form

`apps/web/src/features/auth/components/register-form.tsx` saat ini masih membawa paket hardcoded.

Rencana perbaikannya:

- ambil pricing dan package metadata dari API
- render bundle dan modular plan dari response backend
- jika coupon hanya valid untuk tier tertentu, UI harus mengunci pilihan plan lain
- jika coupon mengganti price/discount untuk satu plan saja, register form harus menampilkan satu pilihan paket aktif
- perhitungan total invoice harus mengikuti response server, bukan hanya kalkulasi frontend

Prinsip penting:
- frontend boleh menampilkan estimasi
- backend tetap menjadi sumber kebenaran harga akhir

## 6. Update Permission dan RBAC

Untuk pertanyaan apakah akses terbaik direstrict lewat permission di role master data users:

Jawaban pendek: **ya, tetapi hanya sebagai lapisan kedua**.

Rekomendasi yang lebih tepat:

- **Layer 1: Subscription entitlement**
  - menentukan module/page bisa tampil atau tidak
  - menentukan permission mana yang aktif atau locked

- **Layer 2: RBAC permission**
  - menentukan apakah user di tenant itu boleh create/read/update/delete

Artinya, role master data users boleh menampilkan permission yang locked jika modul belum dibeli, tetapi penyebab lock-nya harus berasal dari entitlement tenant, bukan dari role logic semata.

Kenapa model ini lebih baik:

- mudah diskalakan untuk modul baru
- tidak perlu membuat banyak role custom per paket
- tetap aman karena backend menolak request yang tidak punya entitlement
- mudah di-cache karena entitlement per tenant jarang berubah

## 7. Teknik Terbaik untuk Jangka Panjang

Teknik yang saya rekomendasikan untuk SaaS ERP besar:

1. **Plan data driven**
   - simpan paket di database
   - versi paket bisa berubah tanpa hardcode release frontend

2. **Entitlement matrix**
   - plan -> modules -> features -> routes -> permissions
   - ini jadi satu sumber referensi akses

3. **Cache read-only config**
   - pricing, plan metadata, dan entitlement profile dibaca via cache
   - invalidasi cache saat admin mengubah package

4. **Webhook idempotent**
   - semua event pembayaran dan subscription harus aman diulang

5. **Feature gating server-side**
   - UI hanya mengikuti hasil server
   - API tetap memeriksa entitlement setiap request sensitif

6. **Separate config from behavior**
   - price dan package bisa diubah di DB
   - business flow dan data integrity tetap di code

7. **Package dependency graph**
   - POS, Sales, Purchase, Stock, Finance, HRD, CRM, Master Data punya dependency eksplisit
   - ini mencegah paket aktif tetapi menu pendukung kosong

## 8. Urutan Eksekusi yang Disarankan

1. Kunci model subscription, coupon, dan entitlement data.
2. Pindahkan bundle pricing dari hardcode ke DB + cache.
3. Lengkapi flow register dengan Xendit subscription.
4. Ubah coupon agar scoped per tier/module.
5. Update permission seeder dan menu seeder berdasarkan navigation config.
6. Implement entitlement guard di backend.
7. Sinkronkan register form dan role UI dengan hasil entitlement server.
8. Tambahkan POS seeder dan dependency menu access.

## 9. Catatan Implementasi

- Jangan memindahkan seluruh logika pricing ke frontend.
- Jangan mengandalkan hidden menu sebagai security boundary.
- Jangan membuat role per paket secara manual bila entitlement matrix bisa dipakai.
- Jangan menambah banyak tabel tanpa alasan; mulai dari model inti yang stabil dulu.

## 10. Output yang Diinginkan Setelah Fase Ini

- register form membaca paket dari backend
- coupon bisa general atau spesifik tier
- pricing bundle tersimpan di DB dan di-cache
- Xendit subscription siap untuk checkout dan webhook
- permission seed selaras dengan menu dan paket
- POS package bisa diaktifkan atau dimatikan berdasarkan subscription
- master data role screen menampilkan permission locked dengan alasan yang jelas
