# API Response & DTO Standards

## Purpose

Setiap endpoint harus mengembalikan data yang diminta secara eksplisit oleh usecase. Response tidak boleh membawa field internal, field sensitif, relasi besar yang tidak diminta, atau data "cadangan" yang tidak dipakai client.

Standar ini mengikuti wrapper di `internal/core/response`:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "timestamp": "2026-04-19T10:00:00+07:00",
  "request_id": "req_..."
}
```

## DTO Boundary

Gunakan DTO berbeda untuk setiap arah data:

- `Request` DTO: hanya field yang boleh diterima dari client.
- `Response` DTO: hanya field yang boleh dikirim kembali ke client.
- `ListRequest` / `QueryRequest`: hanya filter, sort, pagination, dan include yang valid.
- Model database tidak boleh dikirim langsung sebagai response.
- Mapper wajib menjadi satu-satunya tempat transformasi model ke response DTO.

Contoh:

```go
type ProductResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	SKU   string `json:"sku"`
	Price int64  `json:"price"`
}
```

Jangan mengirim field seperti password hash, token, internal note, deleted marker, audit blob, atau relasi yang tidak diminta.

## No Trash Data Rule

Sebelum membuat atau mengubah endpoint, jawab kontrak berikut:

- Data apa yang benar-benar diminta user/client?
- Field mana yang wajib, opsional, sensitif, atau internal?
- Apakah response list membutuhkan versi ringkas dan detail membutuhkan versi lengkap?
- Apakah relasi harus diminta lewat `include`, bukan otomatis dikirim?
- Apakah metadata cukup di `meta`, bukan dicampur ke `data`?

Aturan wajib:

- List endpoint mengembalikan DTO ringkas.
- Detail endpoint boleh mengembalikan DTO lebih lengkap, tetapi tetap tanpa field internal.
- Relasi besar menggunakan `include` yang di-whitelist.
- Jangan mengirim map bebas seperti `gin.H` untuk response bisnis kecuali payload sangat kecil dan tidak menjadi kontrak publik.
- Jangan mengembalikan entity GORM langsung dari handler/usecase.
- Error response harus memakai code/key standar, bukan stack trace atau raw database error.

## Request Binding

- Handler memakai `ShouldBindJSON`, `ShouldBindQuery`, atau binder yang sesuai method.
- Semua field request diberi `binding` tag sesuai kebutuhan.
- Field yang tidak boleh diubah user tidak boleh ada di request DTO.
- Tenant/company/user context diambil dari auth context terpercaya, bukan body/query params.

## Pagination Meta

Collection response wajib memakai `meta.pagination` dari `core/response.Meta`:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

Gunakan `page` dan `per_page`. Jangan memperkenalkan `limit` sebagai public page-size parameter.

## Error Response

Error response wajib mengikuti `internal/core/response.APIError`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "validation.error.invalid_request",
    "field_errors": []
  },
  "timestamp": "2026-04-19T10:00:00+07:00",
  "request_id": "req_..."
}
```

Production tidak boleh mengirim stack trace, SQL detail, token, credential, atau data tenant lain. `message` harus berupa translation key/stable key yang dapat diterjemahkan client, bukan raw internal error.

## Review Checklist

- [ ] Request DTO hanya menerima field yang valid untuk action tersebut
- [ ] Response DTO hanya mengirim field yang dibutuhkan client
- [ ] Tidak ada model database yang dikirim langsung
- [ ] Tidak ada password/token/secret/internal note di response
- [ ] List response ringkas dan paginated
- [ ] Relasi besar hanya lewat `include` whitelist
- [ ] Error memakai code/key standar dan tidak membocorkan detail internal
