# Core - Local Development Setup (Air Hot Reload)

> **Module:** Core Infrastructure / Developer Experience  
> **Status:** ✅ Complete  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Ringkasan](#ringkasan)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Cara Menjalankan](#cara-menjalankan)
5. [Konfigurasi](#konfigurasi)
6. [Keputusan Teknis & Trade-offs](#keputusan-teknis--trade-offs)
7. [Troubleshooting](#troubleshooting)
8. [Related Docs](#related-docs)

---

## Ringkasan

Backend GIMS Platform mendukung **dua mode development**:

| Mode | Command | Use Case |
|------|---------|----------|
| **Full Docker** | `pnpm dev:api` | CI/CD, production-like testing, first-time setup |
| **Local Go + Air** | `pnpm dev:api:local` | Daily development, hot reload on code changes |

Mode **Full Docker** me-rebuild seluruh container setiap kali dijalankan (`docker compose down -v && docker compose up -d --build`), sehingga lambat untuk iterasi development. Mode **Local Go + Air** menjalankan Go binary secara native di mesin developer dengan hot reload — hanya PostgreSQL dan Redis yang tetap berjalan di Docker.

## Prerequisites

- **Go 1.25+** terinstall dan ada di `PATH`
- **Docker** (untuk PostgreSQL dan Redis)
- **Air** — Go hot reload tool

Install Air:

```bash
go install github.com/air-verse/air@latest
```

Pastikan `$GOPATH/bin` (Windows: `%USERPROFILE%\go\bin`) ada di `PATH`.

## Setup

### 1. Environment Variables

File `apps/api/.env` memiliki section `LOCAL_GO_MODE`. Pastikan variabel berikut **tidak di-comment**:

```env
# LOCAL_GO_MODE - For local Go development (with air)
DB_HOST=localhost
DB_PORT=5434
REDIS_HOST=localhost
```

> **Catatan:** Port `5434` bukan typo — Docker Compose mem-mapping port PostgreSQL internal (5432) ke external `5434` untuk menghindari konflik dengan PostgreSQL lokal yang mungkin sudah berjalan di port 5432.

### 2. Air Configuration

Konfigurasi air ada di `apps/api/.air.toml`. File ini sudah di-setup untuk Windows:

- Binary output: `tmp/main.exe`
- CGO disabled (lihat [WebP Build Tags](./webp-build-tags.md))
- Watch directories: `cmd/`, `internal/`, `pkg/`, `seeders/`
- Watch extensions: `.go`, `.toml`, `.yaml`, `.yml`
- Delay: 1 detik setelah file change sebelum rebuild
- Auto-clean `tmp/` directory on exit

### 3. Gitignore

`tmp/` directory (output air) sudah ditambahkan ke `apps/api/.gitignore`.

## Cara Menjalankan

### Step 1: Start Docker Services (DB + Redis saja)

```bash
cd apps/api
docker compose up -d postgres redis
```

### Step 2: Run Go dengan Hot Reload

Pilih salah satu:

```bash
# Dari root monorepo
pnpm dev:api:local

# Dari apps/api/
air

# Dari apps/api/ via Makefile
make dev
```

### Step 3: Develop

Edit file `.go` mana saja di `cmd/`, `internal/`, `pkg/`, atau `seeders/` — air otomatis rebuild dan restart server.

### Beralih Kembali ke Full Docker

Jika perlu kembali ke mode Docker penuh:

1. Comment kembali `LOCAL_GO_MODE` di `.env`:
   ```env
   # DB_HOST=localhost
   # DB_PORT=5434
   # REDIS_HOST=localhost
   ```
2. Jalankan: `pnpm dev:api`

## Konfigurasi

### Port Mapping (Docker Compose)

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| PostgreSQL | 5432 | **5434** |
| Redis | 6379 | **6378** |
| API (Docker mode) | 8081 | 8080 |

### Air Config (`apps/api/.air.toml`)

| Setting | Value | Keterangan |
|---------|-------|------------|
| `bin` | `tmp\main.exe` | Output binary (Windows) |
| `cmd` | `$env:CGO_ENABLED='0'; go build ...` | CGO off untuk Windows |
| `include_dir` | `cmd, internal, pkg, seeders` | Directories yang di-watch |
| `delay` | `1000` (ms) | Debounce sebelum rebuild |
| `clean_on_exit` | `true` | Hapus `tmp/` saat air berhenti |

## Keputusan Teknis & Trade-offs

### Mengapa Air, bukan Docker Volume Mount + Restart?

Docker volume mount pada Windows (via WSL2) memiliki **file system notification latency** yang tinggi (~2-5 detik) dan rebuild container tetap lambat. Air running natively memberikan feedback ~1-2 detik setelah save.

**Trade-off:** Environment lokal tidak identik dengan Docker production (misalnya CGO/WebP tidak tersedia). Untuk testing production-like, tetap gunakan `pnpm dev:api`.

### Mengapa CGO_ENABLED=0 di Air?

Library `kolesa-team/go-webp` membutuhkan CGO + libwebp C library. Di Docker (production), libwebp terinstall via `apk add libwebp-dev`. Di Windows, tidak ada C compiler/library secara default.

Solusi: Build tags memisahkan kode CGO dan non-CGO. Lihat [WebP Build Tags](./webp-build-tags.md) untuk detail arsitektur.

**Trade-off:** Image upload di local dev menyimpan format original (JPEG/PNG) tanpa konversi ke WebP. Fungsionalitas upload tetap berjalan, hanya optimasi format yang dilewati.

## Troubleshooting

### `air: command not found`

```bash
go install github.com/air-verse/air@latest
```

Pastikan `%USERPROFILE%\go\bin` ada di system PATH. Restart terminal setelah menambahkan.

### `connection refused` ke PostgreSQL/Redis

Docker services belum berjalan:

```bash
cd apps/api
docker compose up -d postgres redis
```

### Build error: `go-webp build constraints exclude all Go files`

CGO tidak disabled. Pastikan `.air.toml` build command mengandung `$env:CGO_ENABLED='0'`.

### PowerShell syntax error `&&`

Air di Windows menggunakan PowerShell. Gunakan syntax PowerShell:

```toml
# ✅ PowerShell
cmd = "$env:CGO_ENABLED='0'; go build -o tmp/main.exe ./cmd/api/main.go"

# ❌ cmd.exe (tidak work di PowerShell)
cmd = "set CGO_ENABLED=0&& go build -o tmp/main.exe ./cmd/api/main.go"
```

## Related Docs

- [WebP Build Tags](./webp-build-tags.md) — Arsitektur CGO conditional compilation untuk image upload
- [apptime Timezone Support](./apptime-timezone-support.md) — Timezone handling (berlaku di kedua mode)
- `apps/api/docker-compose.yml` — Docker services configuration
- `apps/api/.air.toml` — Air hot reload configuration
