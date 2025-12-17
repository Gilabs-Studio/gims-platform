# API Error Codes Reference

## GiPos SaaS Platform - Complete Error Code List

**Versi**: 1.0  
**Status**: Draft  
**Last Updated**: 2025

---

---

## 📋 Kategori Error Codes

1. [Validation Errors](#validation-errors)
2. [Authentication & Authorization](#authentication--authorization)
3. [Resource Errors](#resource-errors)
4. [Business Logic Errors](#business-logic-errors)
5. [Payment Errors](#payment-errors)
6. [System Errors](#system-errors)
7. [Integration Errors](#integration-errors)

---

## Validation Errors

### Field Validation

| Code              | HTTP Status | Description                 | Example                                        |
| ----------------- | ----------- | --------------------------- | ---------------------------------------------- |
| `REQUIRED`        | 400         | Field wajib diisi           | `name` field tidak boleh kosong                |
| `INVALID_TYPE`    | 400         | Tipe data tidak valid       | `price` harus berupa angka                     |
| `INVALID_FORMAT`  | 400         | Format tidak valid          | Format email tidak valid                       |
| `INVALID_LENGTH`  | 400         | Panjang tidak valid         | Nama minimal 3 karakter                        |
| `MIN_VALUE`       | 400         | Nilai kurang dari minimum   | Stok tidak boleh kurang dari 0                 |
| `MAX_VALUE`       | 400         | Nilai lebih dari maksimum   | Harga tidak boleh lebih dari 1M                |
| `INVALID_ENUM`    | 400         | Nilai tidak ada di enum     | Status harus `active` atau `inactive`          |
| `INVALID_DATE`    | 400         | Format tanggal tidak valid  | Format tanggal harus YYYY-MM-DD                |
| `INVALID_TIME`    | 400         | Format waktu tidak valid    | Format waktu harus HH:mm:ss                    |
| `INVALID_PHONE`   | 400         | Format nomor HP tidak valid | Nomor HP harus 10-13 digit                     |
| `INVALID_EMAIL`   | 400         | Format email tidak valid    | Format email tidak valid                       |
| `INVALID_URL`     | 400         | Format URL tidak valid      | URL harus dimulai dengan http:// atau https:// |
| `INVALID_JSON`    | 400         | Format JSON tidak valid     | Request body bukan JSON valid                  |
| `DUPLICATE_VALUE` | 409         | Nilai duplikat              | SKU sudah digunakan                            |

### Request Validation

| Code                     | HTTP Status | Description                   |
| ------------------------ | ----------- | ----------------------------- |
| `VALIDATION_ERROR`       | 400         | Data yang dikirim tidak valid |
| `MISSING_REQUIRED_FIELD` | 400         | Field wajib tidak ada         |
| `INVALID_REQUEST_BODY`   | 400         | Request body tidak valid      |
| `INVALID_QUERY_PARAM`    | 400         | Query parameter tidak valid   |
| `INVALID_PATH_PARAM`     | 400         | Path parameter tidak valid    |
| `UNSUPPORTED_MEDIA_TYPE` | 415         | Content-Type tidak didukung   |

---

## Authentication & Authorization

### Authentication

| Code                    | HTTP Status | Description                                          |
| ----------------------- | ----------- | ---------------------------------------------------- |
| `UNAUTHORIZED`          | 401         | Token autentikasi tidak valid atau telah kedaluwarsa |
| `TOKEN_EXPIRED`         | 401         | Token telah kedaluwarsa                              |
| `TOKEN_INVALID`         | 401         | Token tidak valid                                    |
| `TOKEN_MISSING`         | 401         | Token tidak ditemukan di header                      |
| `INVALID_CREDENTIALS`   | 401         | Email atau password salah                            |
| `ACCOUNT_DISABLED`      | 401         | Akun dinonaktifkan                                   |
| `ACCOUNT_LOCKED`        | 401         | Akun terkunci (terlalu banyak percobaan login)       |
| `SESSION_EXPIRED`       | 401         | Session telah kedaluwarsa                            |
| `REFRESH_TOKEN_INVALID` | 401         | Refresh token tidak valid                            |
| `REFRESH_TOKEN_EXPIRED` | 401         | Refresh token telah kedaluwarsa                      |

### Authorization

| Code                          | HTTP Status | Description                                      |
| ----------------------------- | ----------- | ------------------------------------------------ |
| `FORBIDDEN`                   | 403         | Tidak memiliki izin untuk mengakses resource ini |
| `PERMISSION_DENIED`           | 403         | Permission tidak cukup                           |
| `ROLE_INSUFFICIENT`           | 403         | Role tidak memiliki akses                        |
| `OUTLET_ACCESS_DENIED`        | 403         | Tidak memiliki akses ke outlet ini               |
| `RESOURCE_OWNERSHIP_REQUIRED` | 403         | Hanya pemilik resource yang bisa mengakses       |

---

## Resource Errors

| Code                      | HTTP Status | Description                                  |
| ------------------------- | ----------- | -------------------------------------------- |
| `NOT_FOUND`               | 404         | Resource tidak ditemukan                     |
| `PRODUCT_NOT_FOUND`       | 404         | Produk tidak ditemukan                       |
| `CUSTOMER_NOT_FOUND`      | 404         | Pelanggan tidak ditemukan                    |
| `SALE_NOT_FOUND`          | 404         | Transaksi tidak ditemukan                    |
| `USER_NOT_FOUND`          | 404         | User tidak ditemukan                         |
| `OUTLET_NOT_FOUND`        | 404         | Outlet tidak ditemukan                       |
| `CATEGORY_NOT_FOUND`      | 404         | Kategori tidak ditemukan                     |
| `WAREHOUSE_NOT_FOUND`     | 404         | Gudang tidak ditemukan                       |
| `SHIFT_NOT_FOUND`         | 404         | Shift tidak ditemukan                        |
| `CONFLICT`                | 409         | Konflik dengan state saat ini                |
| `RESOURCE_ALREADY_EXISTS` | 409         | Resource sudah ada                           |
| `RESOURCE_IN_USE`         | 409         | Resource sedang digunakan                    |
| `CANNOT_DELETE`           | 409         | Resource tidak bisa dihapus (ada dependency) |

---

## Business Logic Errors

### Stock & Inventory

| Code                     | HTTP Status | Description                        |
| ------------------------ | ----------- | ---------------------------------- |
| `INSUFFICIENT_STOCK`     | 422         | Stok produk tidak mencukupi        |
| `STOCK_NEGATIVE`         | 422         | Stok tidak boleh negatif           |
| `STOCK_LOCKED`           | 409         | Stok sedang dikunci (stock opname) |
| `WAREHOUSE_MISMATCH`     | 422         | Gudang tidak sesuai                |
| `STOCK_TRANSFER_INVALID` | 422         | Transfer stok tidak valid          |

### Sales & Transactions

| Code                         | HTTP Status | Description                            |
| ---------------------------- | ----------- | -------------------------------------- |
| `CART_EMPTY`                 | 422         | Keranjang kosong                       |
| `SALE_ALREADY_COMPLETED`     | 409         | Transaksi sudah selesai                |
| `SALE_ALREADY_REFUNDED`      | 409         | Transaksi sudah direfund               |
| `SALE_CANNOT_REFUND`         | 422         | Transaksi tidak bisa direfund          |
| `REFUND_AMOUNT_EXCEEDED`     | 422         | Jumlah refund melebihi total transaksi |
| `DISCOUNT_EXCEEDED_LIMIT`    | 422         | Diskon melebihi batas maksimum         |
| `DISCOUNT_REQUIRES_APPROVAL` | 422         | Diskon besar memerlukan approval       |
| `VOID_NOT_ALLOWED`           | 422         | Void tidak diizinkan (sudah dibayar)   |

### Shift Management

| Code                      | HTTP Status | Description                                      |
| ------------------------- | ----------- | ------------------------------------------------ |
| `SHIFT_NOT_OPEN`          | 422         | Shift belum dibuka                               |
| `SHIFT_ALREADY_OPEN`      | 409         | Shift sudah dibuka                               |
| `SHIFT_ALREADY_CLOSED`    | 409         | Shift sudah ditutup                              |
| `SHIFT_CANNOT_CLOSE`      | 422         | Shift tidak bisa ditutup (ada transaksi pending) |
| `SHIFT_BALANCE_MISMATCH`  | 422         | Saldo shift tidak sesuai                         |
| `SHIFT_REQUIRES_APPROVAL` | 422         | Tutup shift memerlukan approval                  |

### Customer & Loyalty

| Code                      | HTTP Status | Description                |
| ------------------------- | ----------- | -------------------------- |
| `CUSTOMER_ALREADY_EXISTS` | 409         | Pelanggan sudah terdaftar  |
| `INSUFFICIENT_POINTS`     | 422         | Poin tidak mencukupi       |
| `POINTS_EXPIRED`          | 422         | Poin telah kedaluwarsa     |
| `LOYALTY_RULE_INVALID`    | 422         | Aturan loyalty tidak valid |

### Multi-Outlet

| Code                              | HTTP Status | Description                   |
| --------------------------------- | ----------- | ----------------------------- |
| `OUTLET_NOT_ACCESSIBLE`           | 403         | Outlet tidak dapat diakses    |
| `STOCK_TRANSFER_PENDING`          | 409         | Transfer stok masih pending   |
| `STOCK_TRANSFER_ALREADY_APPROVED` | 409         | Transfer stok sudah disetujui |
| `STOCK_TRANSFER_ALREADY_REJECTED` | 409         | Transfer stok sudah ditolak   |

---

## Payment Errors

| Code                           | HTTP Status | Description                      |
| ------------------------------ | ----------- | -------------------------------- |
| `PAYMENT_FAILED`               | 422         | Pembayaran gagal                 |
| `PAYMENT_TIMEOUT`              | 408         | Pembayaran timeout               |
| `PAYMENT_CANCELLED`            | 422         | Pembayaran dibatalkan            |
| `PAYMENT_ALREADY_PROCESSED`    | 409         | Pembayaran sudah diproses        |
| `PAYMENT_METHOD_NOT_AVAILABLE` | 422         | Metode pembayaran tidak tersedia |
| `PAYMENT_GATEWAY_ERROR`        | 502         | Error dari payment gateway       |
| `INSUFFICIENT_BALANCE`         | 422         | Saldo tidak mencukupi            |
| `INVALID_PAYMENT_AMOUNT`       | 422         | Jumlah pembayaran tidak valid    |
| `QRIS_EXPIRED`                 | 422         | QRIS code telah kedaluwarsa      |
| `QRIS_ALREADY_USED`            | 409         | QRIS code sudah digunakan        |

---

## System Errors

| Code                    | HTTP Status | Description                      |
| ----------------------- | ----------- | -------------------------------- |
| `INTERNAL_SERVER_ERROR` | 500         | Terjadi kesalahan pada server    |
| `SERVICE_UNAVAILABLE`   | 503         | Layanan sedang dalam maintenance |
| `DATABASE_ERROR`        | 500         | Error pada database              |
| `CACHE_ERROR`           | 500         | Error pada cache                 |
| `STORAGE_ERROR`         | 500         | Error pada storage               |
| `QUEUE_ERROR`           | 500         | Error pada message queue         |
| `TIMEOUT`               | 504         | Request timeout                  |
| `RATE_LIMIT_EXCEEDED`   | 429         | Terlalu banyak request           |
| `MAINTENANCE_MODE`      | 503         | Sistem sedang maintenance        |

---

## Integration Errors

### Payment Gateway

| Code                          | HTTP Status | Description                    |
| ----------------------------- | ----------- | ------------------------------ |
| `XENDIT_ERROR`                | 502         | Error dari Xendit API          |
| `MIDTRANS_ERROR`              | 502         | Error dari Midtrans API        |
| `PAYMENT_GATEWAY_TIMEOUT`     | 504         | Timeout dari payment gateway   |
| `PAYMENT_GATEWAY_UNAVAILABLE` | 503         | Payment gateway tidak tersedia |

### WhatsApp

| Code                   | HTTP Status | Description                     |
| ---------------------- | ----------- | ------------------------------- |
| `WHATSAPP_ERROR`       | 502         | Error dari WhatsApp API         |
| `WHATSAPP_RATE_LIMIT`  | 429         | Rate limit WhatsApp API         |
| `WHATSAPP_UNAVAILABLE` | 503         | WhatsApp service tidak tersedia |

### Marketplace

| Code                      | HTTP Status | Description                   |
| ------------------------- | ----------- | ----------------------------- |
| `MARKETPLACE_ERROR`       | 502         | Error dari marketplace API    |
| `MARKETPLACE_SYNC_FAILED` | 422         | Sync ke marketplace gagal     |
| `MARKETPLACE_AUTH_FAILED` | 401         | Autentikasi marketplace gagal |

### Hardware

| Code                    | HTTP Status | Description                |
| ----------------------- | ----------- | -------------------------- |
| `PRINTER_ERROR`         | 500         | Error pada printer         |
| `PRINTER_NOT_CONNECTED` | 503         | Printer tidak terhubung    |
| `SCANNER_ERROR`         | 500         | Error pada barcode scanner |
| `SCANNER_NOT_CONNECTED` | 503         | Scanner tidak terhubung    |

---

## Error Response Format

### Single Error

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stok produk tidak mencukupi",
    "details": {
      "product_id": "prod_abc123",
      "product_name": "Produk A",
      "requested_quantity": 10,
      "available_stock": 5
    }
  }
}
```

### Multiple Field Errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "field_errors": [
      {
        "field": "name",
        "code": "REQUIRED",
        "message": "Product name is required"
      },
      {
        "field": "price",
        "code": "INVALID_TYPE",
        "message": "Price must be a number"
      },
      {
        "field": "stock",
        "code": "MIN_VALUE",
        "message": "Stock cannot be less than 0",
        "constraint": {
          "min": 0
        }
      }
    ]
  }
}
```

### Error with Retry Info

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_GATEWAY_ERROR",
    "message": "Error dari payment gateway",
    "details": {
      "gateway": "xendit",
      "error_id": "xendit_err_123"
    },
    "retry": {
      "retryable": true,
      "retry_after": 5,
      "max_retries": 3
    }
  }
}
```

---

## Error Code Mapping (Go Implementation)

```go
var ErrorCodeMap = map[string]ErrorInfo{
    // Validation
    "REQUIRED": {
        HTTPStatus: http.StatusBadRequest,
        Message:    "Field wajib diisi",
    },
    "INVALID_TYPE": {
        HTTPStatus: http.StatusBadRequest,
        Message:    "Tipe data tidak valid",
    },
    "INSUFFICIENT_STOCK": {
        HTTPStatus: http.StatusUnprocessableEntity,
        Message:    "Stok produk tidak mencukupi",
    },
    // Authentication
    "UNAUTHORIZED": {
        HTTPStatus: http.StatusUnauthorized,
        Message:    "Token autentikasi tidak valid atau telah kedaluwarsa",
    },
    "FORBIDDEN": {
        HTTPStatus: http.StatusForbidden,
        Message:    "Tidak memiliki izin untuk mengakses resource ini",
    },
    // Resource
    "NOT_FOUND": {
        HTTPStatus: http.StatusNotFound,
        Message:    "Resource tidak ditemukan",
    },
    "CONFLICT": {
        HTTPStatus: http.StatusConflict,
        Message:    "Konflik dengan state saat ini",
    },
    // System
    "INTERNAL_SERVER_ERROR": {
        HTTPStatus: http.StatusInternalServerError,
        Message:    "Terjadi kesalahan pada server",
    },
    "RATE_LIMIT_EXCEEDED": {
        HTTPStatus: http.StatusTooManyRequests,
        Message:    "Terlalu banyak request. Silakan coba lagi nanti",
    },
}
```

---

**Dokumen ini akan diupdate sesuai dengan perkembangan API dan penambahan error codes baru.**
