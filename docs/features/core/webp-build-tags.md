# Core - WebP Build Tags (CGO Conditional Compilation)

> **Module:** Core Infrastructure / File Upload  
> **Status:** ✅ Complete  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Ringkasan](#ringkasan)
2. [Masalah](#masalah)
3. [Solusi: Build Tags](#solusi-build-tags)
4. [Struktur File](#struktur-file)
5. [Cara Kerja](#cara-kerja)
6. [Business Rules](#business-rules)
7. [Keputusan Teknis & Trade-offs](#keputusan-teknis--trade-offs)
8. [Cara Test Manual](#cara-test-manual)
9. [Dependencies](#dependencies)
10. [Notes & Improvements](#notes--improvements)

---

## Ringkasan

Image upload di GIMS Platform menggunakan library `kolesa-team/go-webp` untuk konversi gambar ke format WebP (optimasi ukuran file). Library ini membutuhkan **CGO** dan **libwebp** C library yang hanya tersedia di environment Docker/Linux.

Untuk mendukung **local development di Windows** tanpa C compiler, digunakan **Go build tags** (`//go:build cgo` / `//go:build !cgo`) agar konversi WebP hanya aktif saat CGO tersedia. Di environment tanpa CGO, gambar disimpan dalam format asli (JPEG/PNG).

## Masalah

```
github.com/kolesa-team/go-webp/decoder: build constraints exclude all Go files
github.com/kolesa-team/go-webp/encoder: build constraints exclude all Go files
```

Error ini terjadi saat build Go di Windows karena:

1. `go-webp` memiliki `//go:build cgo` tag di semua file-nya
2. Windows developer umumnya tidak memiliki C compiler (GCC/MinGW) + libwebp
3. `CGO_ENABLED=0` diperlukan untuk build, tapi itu membuat `go-webp` tidak bisa di-compile

## Solusi: Build Tags

Fungsi `ConvertToWebP` dipecah menjadi dua file dengan build tags berbeda:

```
internal/core/utils/
├── file_upload.go                  # Main file — platform-agnostic
├── file_upload_webp_cgo.go         # //go:build cgo    → Real WebP conversion
└── file_upload_webp_nocgo.go       # //go:build !cgo   → Passthrough (no conversion)
```

Go compiler secara otomatis memilih file yang sesuai berdasarkan apakah CGO enabled atau tidak.

## Struktur File

### `file_upload.go` (Main — tanpa build tag)

File utama yang berisi:
- `ValidateImageFile()` — validasi MIME type, ukuran, extension
- `SaveUploadedFile()` — orchestrator: validate → convert → save
- `DeleteFile()` — hapus file dengan path traversal protection
- Fungsi document upload (`ValidateDocumentFile`, `SaveDocumentFile`)

File ini menggunakan dua symbol dari build-tagged files:
- `ConvertToWebP(file) ([]byte, error)` — fungsi konversi
- `WebPEnabled` (bool const) — flag untuk menentukan extension dan MIME type

### `file_upload_webp_cgo.go` (CGO — Docker/Production)

```go
//go:build cgo

// ConvertToWebP converts image to WebP using libwebp via CGO.
// WebPEnabled = true → file disimpan sebagai .webp
```

- Decode image menggunakan `image.Decode`
- Encode ke WebP menggunakan `kolesa-team/go-webp/encoder` (quality 85, PresetDefault)
- Digunakan di: Docker build, Linux server, any environment dengan CGO + libwebp

### `file_upload_webp_nocgo.go` (No CGO — Windows Local Dev)

```go
//go:build !cgo

// ConvertToWebP is a no-op — returns original file bytes.
// WebPEnabled = false → file disimpan dengan extension asli (.jpg, .png)
```

- `io.ReadAll` file bytes tanpa konversi
- Log warning saat startup: `[WARN] WebP conversion disabled (CGO not available)`
- Digunakan di: Windows local development dengan `CGO_ENABLED=0`

## Cara Kerja

### SaveUploadedFile Flow

```
SaveUploadedFile(file, header, config)
    │
    ├── ValidateImageFile()          # Validate MIME, size, extension
    │
    ├── ConvertToWebP(file)          # Build-tag dependent
    │   ├── [CGO]    → encode to WebP, return .webp bytes
    │   └── [!CGO]   → io.ReadAll, return original bytes
    │
    ├── Generate filename
    │   ├── [WebPEnabled=true]  → uuid.webp
    │   └── [WebPEnabled=false] → uuid.jpg / uuid.png (original ext)
    │
    └── Write file to disk
```

### Environment → Build Tag Mapping

| Environment | CGO_ENABLED | File Selected | WebP? | Image Format |
|-------------|-------------|---------------|-------|--------------|
| Docker (Dockerfile) | 1 (default) | `_cgo.go` | ✅ Yes | `.webp` |
| Linux server | 1 (if libwebp installed) | `_cgo.go` | ✅ Yes | `.webp` |
| Windows + Air | 0 (explicit) | `_nocgo.go` | ❌ No | Original (`.jpg`, `.png`) |
| CI/CD (tanpa CGO) | 0 | `_nocgo.go` | ❌ No | Original |

## Business Rules

1. **Image upload selalu berhasil** di kedua environment — hanya format output yang berbeda
2. **Validasi file** (MIME type, ukuran, extension) tetap berjalan di kedua mode
3. **Security measures** (UUID filename, path traversal protection, magic bytes validation) tidak terpengaruh oleh build tag
4. Di production (Docker), **semua gambar dikonversi ke WebP** untuk optimasi bandwidth
5. Di local dev, gambar disimpan **as-is** — acceptable karena hanya untuk development

## Keputusan Teknis & Trade-offs

### Mengapa Build Tags, bukan Library Replacement?

**Alternatif yang dipertimbangkan:**

| Opsi | Pro | Kontra |
|------|-----|--------|
| **Build tags** (dipilih) | Zero behavior change di production, minimal code change | Perlu maintain 2 file |
| Pure Go WebP library | Tidak perlu CGO sama sekali | Tidak ada pure Go WebP *encoder* yang mature. `golang.org/x/image/webp` hanya decoder |
| Install MinGW + libwebp di Windows | Full parity | Complex setup, setiap developer harus install, fragile |
| Disable WebP entirely | Simplest | Regresi di production, file size naik |

**Trade-off yang diterima:**
- Image upload di local dev menghasilkan format berbeda (JPEG/PNG vs WebP)
- Developer perlu test WebP conversion via Docker jika ada perubahan di `file_upload_webp_cgo.go`

### Mengapa `WebPEnabled` const, bukan runtime check?

Compiler mengeliminasi dead code saat const bernilai `false`. Tidak ada overhead runtime.

## Cara Test Manual

### Test Local Dev (No CGO)

1. Jalankan dengan air: `pnpm dev:api:local`
2. Perhatikan log: `[WARN] WebP conversion disabled (CGO not available)`
3. Upload gambar via API
4. Cek file yang tersimpan di `uploads/` — harus berformat asli (`.jpg` atau `.png`)

### Test Docker (CGO)

1. Jalankan dengan Docker: `pnpm dev:api`
2. Upload gambar via API
3. Cek file yang tersimpan — harus berformat `.webp`

### Test Build Parity

```bash
cd apps/api

# Build tanpa CGO (simulates Windows)
CGO_ENABLED=0 go build ./cmd/api/main.go   # Linux/Mac
$env:CGO_ENABLED='0'; go build ./cmd/api/main.go   # Windows PowerShell

# Build dengan CGO (simulates Docker)
CGO_ENABLED=1 go build ./cmd/api/main.go   # Requires libwebp
```

## Dependencies

- **Backend (CGO mode):** `kolesa-team/go-webp` v1.0.5, libwebp C library
- **Backend (no-CGO mode):** Standard library only (`io`, `log`)
- **Build tool:** Air v1.65+ (`apps/api/.air.toml` sets `CGO_ENABLED=0`)
- **Docker:** Dockerfile installs `libwebp-dev` via Alpine apk

## Notes & Improvements

- **Known Limitation:** Tidak ada WebP conversion di Windows local dev. Ini acceptable karena:
  - Upload flow tetap berfungsi penuh
  - Hanya format output yang berbeda
  - Production selalu melalui Docker dengan CGO enabled
- **Future Improvement:**
  - Monitor pure Go WebP encoder projects — jika ada yang mature, bisa menggantikan CGO dependency entirely
  - Pertimbangkan `chai2010/webp` jika CGO acceptable di semua platform
  - Add unit test yang memverifikasi kedua build tags menghasilkan valid output
