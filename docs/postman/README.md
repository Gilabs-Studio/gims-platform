# Postman Collection - Web Application API

Dokumentasi Postman collection untuk Web Application API.

## Setup

1. **Import Collection**
   - Buka Postman
   - Klik Import
   - Pilih file `postman.json`

2. **Setup Environment Variables**
   - Buat environment baru dengan nama "Web Application - Local"
   - Set variable:
     - `base_url`: `http://localhost:8080`
   - Set variable:
     - `token`: (akan di-set otomatis setelah login)
     - `refresh_token`: (akan di-set otomatis setelah login)
     - `user_id`: (akan di-set otomatis setelah login)

## Usage

### 1. Health Check

- Jalankan request "Health" atau "Ping" untuk memastikan API berjalan

### 2. Get CSRF Token (REQUIRED FIRST!)

**⚠️ IMPORTANT: You MUST call this endpoint FIRST before login!**

- Jalankan request "Get CSRF Token" di folder Auth
- Endpoint: `GET /auth/csrf`
- This will set the `gims_csrf_token` cookie in your browser/Postman
- The token will automatically be extracted and saved to `{{csrf_token}}` environment variable
- **Console akan menampilkan**: `✅ CSRF Token extracted: <token_value>`

### 3. Login

- Setelah mendapatkan CSRF token, jalankan request "Auth Login"
- **Pre-request script** akan otomatis:
  - Mengambil CSRF token dari cookie `gims_csrf_token`
  - Menyimpannya ke environment variable `{{csrf_token}}`
  - Mengirimkannya di header `X-CSRF-Token`
  
- Request body:
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```
- Token akan otomatis disimpan di environment variable setelah login berhasil

**Troubleshooting CSRF Errors:**

If you get `CSRF_INVALID` error:
1. Make sure you called "Get CSRF Token" endpoint first
2. Check Postman cookies (View → Show Cookies) - look for `gims_csrf_token`
3. Check Console tab - should show "CSRF Token extracted from cookie"
4. If cookie exists but still fails, clear all cookies and try again

### 4. Authenticated Requests

- Semua request yang memerlukan authentication akan otomatis menggunakan token dari environment variable
- Token akan di-set di header `Authorization: Bearer {{token}}`

## Collection Structure

### Authentication

- **Login**: POST `/api/v1/auth/login`
- **Refresh Token**: POST `/api/v1/auth/refresh`
- **Logout**: POST `/api/v1/auth/logout`

### Health Check

- **Health**: GET `/health`
- **Ping**: GET `/ping`

## Response Format

Semua response mengikuti format standar:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

## Notes

- Collection ini akan terus diupdate sesuai dengan perkembangan API
- Untuk detail lengkap, lihat dokumentasi di `/docs/api-standart/`
