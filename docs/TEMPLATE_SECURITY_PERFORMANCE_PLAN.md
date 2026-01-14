# Rencana Improvisasi Template (Security & Performance)

Tanggal: 2026-01-04

Dokumen ini adalah backlog/rencana kerja untuk meningkatkan kualitas **security** dan **performance** pada template ini, agar aman dipakai ulang untuk project baru tanpa “bawa utang teknis”.

## 1) Scope & Prinsip

**Target utama**
- Secure-by-default untuk environment production.
- Performance yang “enterprise-ready” (timeouts, pooling, graceful shutdown, dan guardrail DoS).
- Konfigurasi yang konsisten: semua setting kritikal via env, dengan default yang aman.

**Prinsip**
- Jangan jalankan operasi destruktif/berat secara default saat startup production.
- Jangan log data sensitif (token, password, secret, DSN).
- Semua batasan (rate limit, request size limit, timeouts) harus eksplisit dan terdokumentasi.

**Out of scope (kecuali diminta)**
- Menambah fitur produk baru (UI/endpoint baru).
- Perubahan arsitektur besar (misalnya ganti framework) tanpa kebutuhan jelas.

## 2) Temuan Cepat (berdasarkan scanning kode)

**Security**
- Konfigurasi JWT sudah punya proteksi minimal: di production memaksa `JWT_SECRET` terisi dan minimal 32 chars.
- Middleware global sudah memasang CORS, HSTS, CSRF, rate limit, request-id, recovery.
- Namun ada risiko default template:
  - Startup API saat ini menjalankan **AutoMigrate** dan **SeedAll** tanpa gating env/flag di entrypoint.
  - Seeder user menggunakan password default yang sangat lemah (`admin123`). Ini berbahaya jika terbawa ke staging/prod.
  - Rate limit untuk login membaca seluruh request body (`io.ReadAll`) tanpa limit ukuran → potensi memory DoS.

**Performance/Resilience**
- Server dijalankan dengan `gin.Run()` (tanpa `http.Server` timeouts, MaxHeaderBytes, graceful shutdown).
- Database pooling sudah di-set, tetapi belum env-configurable dan logger GORM menggunakan `logger.Info` (biasanya terlalu verbose untuk prod).

## 3) Rencana Kerja (Prioritas)

## Status Implementasi (per 2026-01-05)

✅ **Sudah diimplementasikan**
- P0.1 Gating startup migrate/seed via env (`RUN_MIGRATIONS`, `RUN_SEEDERS`).
- P0.2 Seeder password hardening (tanpa default password; prod wajib `SEED_DEFAULT_PASSWORD`, dev generate random).
- P0.3 Request size limit + hardening pembacaan body untuk rate limit login (mencegah memory DoS) + response 413.
- P1.4 HTTP server hardening (`http.Server` timeouts, `MaxHeaderBytes`).
- P1.5 Graceful shutdown + stop worker refresh-token cleanup.
- P1.6 Reverse-proxy awareness (opt-in `PROXY_HEADERS_ENABLED` + `TRUSTED_PROXIES`, HSTS/secure-cookie aware `X-Forwarded-Proto` hanya saat opt-in).
- P1.7 Cookie/CSRF hardening (secure-cookie detection + perbaikan fail-closed token generation).
- P1.8 JWT hardening: `iss`/issuer validation, split secret access vs refresh, dan rotation support `kid` + key ring (`JWT_*_KEYS`, `JWT_*_KID`).
- P1.9 Baseline security headers middleware.
- P1.10 GitLab CI: `go test`, `govulncheck`, `gosec` + pipeline Node (pnpm/turbo lint/type-check/build).
- P2.11 Tuning DB/GORM: pooling & opsi GORM via env.
- P2.12 Redis tuning via env (timeouts/pool).
- P2.13 Rate limiting Redis atomik (Lua) untuk fixed-window.
- P2.14 Profiling/metrics (non-prod): `/debug/pprof/*` dan `/metrics` via env + token.
- P3.15 Dokumentasi env “wajib vs opsional” (ditambah DB/Redis/observability vars).
- P3.16 Makefile targets explicit: `make migrate`, `make seed`.

⏳ **Belum / opsional (backlog)**
- (Jika diperlukan) metrics yang kompatibel Prometheus/OpenTelemetry (saat ini basic JSON).

### P0 — Guardrails “Template Safety” (wajib)
**Tujuan:** memastikan template tidak bisa “kebetulan” insecure saat dipakai project baru.

1) **Gating operasi startup (migrate/seed) dengan flag**
- Ubah entrypoint agar **default production tidak menjalankan**:
  - `database.AutoMigrate()`
  - `seeders.SeedAll()`
- Tambahkan env flags yang eksplisit:
  - `RUN_MIGRATIONS=true|false`
  - `RUN_SEEDERS=true|false`
- Acceptance criteria:
  - Prod: default `false` untuk keduanya.
  - Dev: boleh `true` by default atau via Makefile.
  - Status: ✅ sudah diimplementasikan.

2) **Hapus password default seeder / buat aman**
- Ganti seeding user agar tidak hardcode `admin123`.
- Opsi yang aman:
  - Wajibkan env `SEED_DEFAULT_PASSWORD` (jika kosong → error), ATAU
  - Generate random password saat dev dan print sekali (dev-only).
- Acceptance criteria:
  - Tidak ada password default di repo.
  - Seeder tidak berjalan di prod kecuali explicit flag.
  - Status: ✅ sudah diimplementasikan.

3) **Request size limit untuk endpoint sensitif**
- Tambahkan guardrail ukuran body (mis. 1MB) khusus endpoint login/refresh/upload.
- Perbaiki rate-limit login agar tidak `io.ReadAll` tanpa limit.
- Acceptance criteria:
  - Request body di atas limit → 413.
  - RateLimit login tetap bisa baca email untuk Level-2 limit.
  - Status: ✅ sudah diimplementasikan.


### P1 — Hardening Security (wajib untuk template)

4) **HTTP server hardening (timeouts & header limits)**
- Ganti `r.Run()` menjadi `http.Server` dengan:
  - `ReadHeaderTimeout`
  - `ReadTimeout`
  - `WriteTimeout`
  - `IdleTimeout`
  - `MaxHeaderBytes`
- Acceptance criteria:
  - Slowloris protection aktif.
  - Nilai default aman dan bisa override via env.
  - Status: ✅ sudah diimplementasikan.

5) **Graceful shutdown**
- Tangani SIGTERM/SIGINT.
- Pastikan background worker (refresh token cleanup) bisa stop dengan rapi.
- Acceptance criteria:
  - Tidak ada goroutine yang “tertinggal” saat shutdown.
  - Status: ✅ sudah diimplementasikan.

6) **Reverse-proxy awareness (TLS termination)**
- HSTS saat ini hanya aktif ketika request dianggap HTTPS.
- Saat behind load balancer, perlu deteksi `X-Forwarded-Proto` dan konfigurasi trusted proxies.
- Acceptance criteria:
  - Saat deploy behind proxy (HTTPS externally), HSTS dan secure-cookie tetap benar.
  - Status: ✅ sudah diimplementasikan.

7) **Cookie security standardisasi (jika auth via cookie dipakai)**
- Pastikan cookie `access_token`/`refresh_token` (jika ada) memenuhi:
  - `HttpOnly=true`, `Secure=true` (prod), `SameSite` sesuai arsitektur (Lax/Strict/None)
- Pastikan `CSRF` cookie diset dengan `SameSite` yang konsisten dan urutan set-cookie benar.
- Acceptance criteria:
  - Tidak ada cookie auth yang bisa dibaca JS.
  - Status: ✅ sudah diimplementasikan (untuk cookie yang dibuat oleh service ini).

8) **JWT hardening**
- Tambahkan claim `iss` (issuer) dan validasi.
- Pertimbangkan pemisahan secret access vs refresh.
- Tambahkan opsi rotation plan (kid) untuk template enterprise.
- Acceptance criteria:
  - Validasi token menolak issuer yang salah.
  - Status: ✅ sudah diimplementasikan (issuer, split secret, rotation `kid`).

9) **Security headers baseline (selain HSTS)**
- Tambahkan header aman yang umum untuk API:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `X-Frame-Options: DENY` (opsional untuk API)
- Acceptance criteria:
  - Selalu terpasang (minimal prod).
  - Status: ✅ sudah diimplementasikan.

10) **SAST/dependency scanning di CI**
- Tambahkan:
  - `gosec`
  - `govulncheck`
- Acceptance criteria:
  - Pipeline fail kalau ada severity tinggi.
  - Status: ✅ sudah diimplementasikan.

**Status update (sudah dikerjakan)**
- JWT issuer sudah ditambahkan via `JWT_ISSUER` dan divalidasi.
- JWT rotation sudah ditambahkan via `kid` + key ring (`JWT_ACCESS_KEYS`/`JWT_REFRESH_KEYS`) untuk memudahkan rotasi secret tanpa downtime.
- GitLab CI pipeline sudah ditambahkan untuk `go test`, `govulncheck`, dan `gosec` (high/high).


### P2 — Performance & Observability (recommended)

11) **Tuning GORM & DB untuk production**
- Logger level berdasarkan env (prod: warn/error).
- Pertimbangkan:
  - `PrepareStmt` untuk query yang sering
  - `SkipDefaultTransaction` untuk write-heavy service
- Pastikan pool sizes via env.
- Acceptance criteria:
  - Prod logs tidak spam query.
  - Pool sizes bisa di-set dari env.

12) **Redis client tuning via env**
- Buat opsi env untuk `PoolSize`, `MinIdleConns`, timeout.

13) **Rate limiting atomik di Redis (opsional)**
- Jika mau fixed-window yang lebih robust, gunakan Lua script agar atomic (INCR+EXPIRE+TTL).

14) **Profiling & metrics (non-prod)**
- Tambahkan pprof endpoint di dev/staging (terproteksi).
- Tambahkan metrics dasar (latency, status codes, DB/redis errors).


### P3 — Template Polish (documentation & DX)

15) **Dokumentasi env var “wajib vs opsional”**
- Update `apps/api/SETUP.md` / README:
  - daftar env wajib untuk prod
  - contoh aman

16) **Makefile targets / task runner**
- Tambah target:
  - `make migrate`
  - `make seed`
  - `make run`
- Tujuannya: migrate/seed tidak dilakukan diam-diam.

## 4) File/Area yang Paling Terdampak

- `apps/api/cmd/api/main.go` (gating migrate/seed, http.Server, graceful shutdown)
- `apps/api/internal/core/infrastructure/config/config.go` (env flags untuk server/db/redis/timeouts)
- `apps/api/internal/core/infrastructure/router/router.go` (trusted proxies, middleware order)
- `apps/api/internal/core/middleware/rate_limit.go` (limit body read, hardening)
- `apps/api/internal/core/middleware/csrf.go` (cookie attributes, SameSite/Secure behind proxy)
- `apps/api/seeders/*` (hapus default password, gating)
- CI config (jika ada) untuk `gosec` + `govulncheck`

## 5) Urutan Eksekusi yang Saya Rekomendasikan

1) P0.1 + P0.2 (startup gating + seeder aman)
2) P0.3 (request size limit + perbaikan rate-limit login)
3) P1.4 + P1.5 (http.Server timeouts + graceful shutdown)
4) P1.6 + P1.7 (proxy awareness + cookie hardening)
5) P1.8 + P1.10 (JWT issuer + vuln scanning)
6) P2 (perf tuning + observability)

## 6) Catatan Risiko / Keputusan yang Perlu Anda Konfirmasi

- Apakah template ini akan memakai auth berbasis **cookie** (web) atau **Authorization Bearer** saja (mobile/service-to-service)?
  - Jika Bearer-only, CSRF middleware global biasanya tidak diperlukan dan bisa jadi false-positive blocker.
  - Jika cookie-based, CSRF + SameSite + secure-cookie harus dipastikan kompatibel dengan domain/subdomain deployment.

- Apakah environment production deploy di belakang reverse proxy / load balancer TLS termination?
  - Jika ya, kita perlu policy trusted proxies dan deteksi scheme untuk HSTS/cookie.
