# API Response Standards
## GiPos SaaS Platform - Backend API

**Versi**: 1.0  
**Status**: Draft  
**Last Updated**: 2025

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Base Response Structure](#base-response-structure)
3. [Success Response](#success-response)
4. [Error Response](#error-response)
5. [Pagination](#pagination)
6. [List Sorting Standard](#list-sorting-standard)
7. [Date & Time Format](#date--time-format)
8. [Data Types & Validation](#data-types--validation)
9. [HTTP Status Codes](#http-status-codes)
10. [Response Examples](#response-examples)
11. [Best Practices](#best-practices)

---

## Overview

Semua API response mengikuti format standar yang konsisten untuk memastikan:
- **Konsistensi**: Format sama di semua endpoint
- **Predictability**: Developer tahu apa yang diharapkan
- **Error Handling**: Error handling yang jelas dan actionable
- **Type Safety**: Struktur yang jelas untuk frontend typing

---

## Base Response Structure

### Standard Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "field_errors": []
  },
  "meta": {},
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

---

## Success Response

### Single Resource Response

**GET /api/v1/products/{id}**

```json
{
  "success": true,
  "data": {
    "id": "prod_abc123",
    "name": "Produk A",
    "sku": "SKU-001",
    "barcode": "1234567890123",
    "price": 50000,
    "cost": 30000,
    "stock": 100,
    "category": {
      "id": "cat_xyz789",
      "name": "Kategori A"
    },
    "images": [
      {
        "id": "img_001",
        "url": "https://cdn.gipos.id/products/abc123.jpg",
        "thumbnail_url": "https://cdn.gipos.id/products/abc123_thumb.jpg",
        "order": 1
      }
    ],
    "status": "active",
    "taxable": true,
    "created_at": "2024-01-10T08:00:00+07:00",
    "updated_at": "2024-01-15T10:30:45+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Collection Response (with Pagination)

**GET /api/v1/products**

```json
{
  "success": true,
  "data": [
    {
      "id": "prod_abc123",
      "name": "Produk A",
      "sku": "SKU-001",
      "price": 50000,
      "stock": 100,
      "status": "active",
      "created_at": "2024-01-10T08:00:00+07:00"
    },
    {
      "id": "prod_def456",
      "name": "Produk B",
      "sku": "SKU-002",
      "price": 75000,
      "stock": 50,
      "status": "active",
      "created_at": "2024-01-11T09:15:30+07:00"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    },
    "filters": {
      "status": "active",
      "category_id": "cat_xyz789"
    },
    "sort": {
      "field": "updated_at",
      "order": "desc"
    },
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Create Resource Response

**POST /api/v1/products**

```json
{
  "success": true,
  "data": {
    "id": "prod_new789",
    "name": "Produk Baru",
    "sku": "SKU-003",
    "barcode": "9876543210987",
    "price": 60000,
    "cost": 35000,
    "stock": 0,
    "category": {
      "id": "cat_xyz789",
      "name": "Kategori A"
    },
    "images": [],
    "status": "active",
    "taxable": true,
    "created_at": "2024-01-15T10:30:45+07:00",
    "updated_at": "2024-01-15T10:30:45+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "created_by": "user_789"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Update Resource Response

**PUT /api/v1/products/{id}**

```json
{
  "success": true,
  "data": {
    "id": "prod_abc123",
    "name": "Produk A Updated",
    "sku": "SKU-001",
    "price": 55000,
    "stock": 95,
    "updated_at": "2024-01-15T10:35:20+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "updated_by": "user_789",
    "changes": {
      "price": {
        "old": 50000,
        "new": 55000
      },
      "stock": {
        "old": 100,
        "new": 95
      }
    }
  },
  "timestamp": "2024-01-15T10:35:20+07:00",
  "request_id": "req_abc123xyz"
}
```

### Delete Resource Response

**DELETE /api/v1/products/{id}**

```json
{
  "success": true,
  "data": {
    "id": "prod_abc123",
    "deleted": true,
    "deleted_at": "2024-01-15T10:40:00+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "deleted_by": "user_789"
  },
  "timestamp": "2024-01-15T10:40:00+07:00",
  "request_id": "req_abc123xyz"
}
```

### Action Response (Non-CRUD)

**POST /api/v1/sales/{id}/refund**

```json
{
  "success": true,
  "data": {
    "refund_id": "refund_xyz789",
    "sale_id": "sale_abc123",
    "amount": 50000,
    "reason": "Produk rusak",
    "status": "approved",
    "refunded_at": "2024-01-15T10:45:00+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "refunded_by": "user_789",
    "approved_by": "user_456"
  },
  "timestamp": "2024-01-15T10:45:00+07:00",
  "request_id": "req_abc123xyz"
}
```

---

## Error Response

### Standard Error Structure

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "additional_info": "value"
    },
    "field_errors": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Invalid email format"
      }
    ],
    "stack_trace": "..." // Only in development/staging
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Error Codes

#### Validation Errors (400 Bad Request)

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
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Invalid email format"
      },
      {
        "field": "stock",
        "code": "MIN_VALUE",
        "message": "Stock cannot be less than 0",
        "constraint": {
          "min": 0
        }
      },
      {
        "field": "category_id",
        "code": "NOT_FOUND",
        "message": "Category not found"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Authentication Errors (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token autentikasi tidak valid atau telah kedaluwarsa",
    "details": {
      "expired_at": "2024-01-15T09:00:00+07:00"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Authorization Errors (403 Forbidden)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Anda tidak memiliki izin untuk mengakses resource ini",
    "details": {
      "required_permission": "products:delete",
      "user_permissions": ["products:read", "products:create"]
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Not Found Errors (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Produk tidak ditemukan",
    "details": {
      "resource": "product",
      "resource_id": "prod_abc123"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Conflict Errors (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "SKU sudah digunakan oleh produk lain",
    "details": {
      "conflicting_field": "sku",
      "conflicting_value": "SKU-001",
      "existing_resource": {
        "id": "prod_existing",
        "name": "Produk Existing"
      }
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Rate Limit Errors (429 Too Many Requests)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Terlalu banyak request. Silakan coba lagi nanti",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2024-01-15T11:00:00+07:00"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Server Errors (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Terjadi kesalahan pada server. Tim kami telah diberitahu",
    "details": {
      "error_id": "err_xyz789"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Service Unavailable (503 Service Unavailable)

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Layanan sedang dalam maintenance. Silakan coba lagi nanti",
    "details": {
      "maintenance_until": "2024-01-15T12:00:00+07:00"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Business Logic Errors

#### Insufficient Stock

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
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Payment Failed

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Pembayaran gagal",
    "details": {
      "payment_method": "qris",
      "payment_id": "pay_xyz789",
      "failure_reason": "Transaction timeout"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

#### Shift Not Open

```json
{
  "success": false,
  "error": {
    "code": "SHIFT_NOT_OPEN",
    "message": "Shift belum dibuka. Silakan buka shift terlebih dahulu",
    "details": {
      "outlet_id": "outlet_456",
      "user_id": "user_789"
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

---

## Pagination

### Pagination Meta Structure

```json
{
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false,
    "next_page": 2,
    "prev_page": null
  }
}
```

### Cursor-based Pagination (Alternative)

```json
{
  "pagination": {
    "type": "cursor",
    "cursor": "eyJpZCI6InByb2RfYWJjMTIzIiwidGltZXN0YW1wIjoiMjAyNC0wMS0xNVQxMDozMDo0NSswNzowMCJ9",
    "has_next": true,
    "has_prev": false,
    "next_cursor": "eyJpZCI6InByb2RfZGVmNDU2IiwidGltZXN0YW1wIjoiMjAyNC0wMS0xNVQxMDozMTozMCswNzowMCJ9",
    "prev_cursor": null,
    "limit": 20
  }
}
```

### Query Parameters

- `page`: Halaman yang diminta (default: 1)
- `per_page`: Jumlah item per halaman (default: 20, max: 100)
- `cursor`: Cursor untuk cursor-based pagination
- `limit`: Limit untuk cursor-based pagination (default: 20, max: 100)

---

## List Sorting Standard

### Default Sorting Behavior

**CRITICAL**: Semua endpoint yang mengembalikan list/collection data **WAJIB** di-sort berdasarkan `updated_at DESC` sebagai default sorting. Ini memastikan bahwa data yang baru di-update atau di-create akan muncul di paling atas list.

### Rationale

1. **User Experience**: User yang baru saja meng-update data akan langsung melihat perubahan di paling atas list tanpa perlu scroll atau search
2. **Consistency**: Semua list endpoint memiliki behavior yang konsisten
3. **Recent Activity First**: Data yang paling baru di-modify akan selalu terlihat pertama

### Implementation

#### Repository Level (Go)

```go
// ✅ GOOD - Default sorting by updated_at DESC
func (r *repository) List() ([]Entity, error) {
    var entities []Entity
    err := r.db.Order("updated_at DESC").Find(&entities).Error
    if err != nil {
        return nil, err
    }
    return entities, nil
}

// ✅ GOOD - With pagination
func (r *repository) List(req *ListRequest) ([]Entity, int64, error) {
    var entities []Entity
    var total int64
    
    query := r.db.Model(&Entity{})
    
    // Apply filters...
    
    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    // Apply pagination and sorting
    offset := (req.Page - 1) * req.PerPage
    err := query.Order("updated_at DESC").Offset(offset).Limit(req.PerPage).Find(&entities).Error
    if err != nil {
        return nil, 0, err
    }
    
    return entities, total, nil
}
```

#### Response Meta

Jika endpoint mendukung custom sorting via query parameter, sertakan informasi sorting di response meta:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {...},
    "sort": {
      "field": "updated_at",
      "order": "desc"
    }
  }
}
```

### Custom Sorting (Optional)

Jika endpoint perlu mendukung custom sorting, gunakan query parameter:

- `sort_by`: Field untuk sorting (default: `updated_at`)
- `sort_order`: Order direction (default: `desc`, options: `asc` | `desc`)

**Example**: `GET /api/v1/users?sort_by=name&sort_order=asc`

**Important**: 
- Default sorting tetap `updated_at DESC` jika tidak ada query parameter
- Custom sorting hanya untuk field yang aman dan indexed
- Jangan allow sorting pada field yang tidak indexed (performance issue)

### Best Practices

1. **Always use `updated_at DESC` as default** untuk semua list endpoints
2. **Update `updated_at` timestamp** pada setiap update operation (GORM handles this automatically)
3. **Include sort info in meta** jika custom sorting supported
4. **Document sorting behavior** di API documentation
5. **Index `updated_at` column** di database untuk performance

### Examples

#### Role List Endpoint

```go
// Repository
func (r *repository) List() ([]role.Role, error) {
    var roles []role.Role
    err := r.db.Preload("Permissions").Order("updated_at DESC").Find(&roles).Error
    return roles, err
}
```

#### User List Endpoint (with pagination)

```go
// Repository
func (r *repository) List(req *user.ListUsersRequest) ([]user.User, int64, error) {
    // ... filters ...
    
    // Order by updated_at DESC so recently updated items appear first
    err := query.Order("users.updated_at DESC").Offset(offset).Limit(perPage).Find(&users).Error
    return users, total, err
}
```

---

## Date & Time Format

### Standard Format

- **Format**: ISO 8601 dengan timezone
- **Timezone**: WIB (UTC+7) untuk Indonesia
- **Format String**: `2006-01-02T15:04:05+07:00` (Go time format)
- **Example**: `2024-01-15T10:30:45+07:00`

### Date Only (without time)

- **Format**: `YYYY-MM-DD`
- **Example**: `2024-01-15`

### Time Only (without date)

- **Format**: `HH:mm:ss` (24-hour format)
- **Example**: `10:30:45`

### Timestamp Fields

Semua resource memiliki minimal:
- `created_at`: Waktu dibuat (required)
- `updated_at`: Waktu diupdate (required)
- `deleted_at`: Waktu dihapus (optional, untuk soft delete)

### Timezone Handling

- Semua datetime disimpan di database dalam UTC
- Response selalu dalam format WIB (UTC+7)
- Frontend bertanggung jawab untuk convert ke timezone lokal user jika diperlukan

### Date Range Queries

**GET /api/v1/sales?start_date=2024-01-01&end_date=2024-01-31**

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {},
    "filters": {
      "start_date": "2024-01-01T00:00:00+07:00",
      "end_date": "2024-01-31T23:59:59+07:00"
    }
  }
}
```

---

## Data Types & Validation

### Currency (Money)

- **Type**: Integer (dalam satuan Rupiah terkecil, yaitu sen)
- **Display**: Format dengan titik sebagai pemisah ribuan
- **Example**: `50000` = Rp 50.000
- **Max Value**: 9,999,999,999,999 (Rp 99.999.999.999.990)

```json
{
  "price": 50000,
  "price_formatted": "Rp 50.000"
}
```

### Percentage

- **Type**: Float (0-100)
- **Example**: `10.5` = 10.5%
- **Precision**: 2 decimal places

```json
{
  "discount_percentage": 10.5
}
```

### Boolean

- **Type**: Boolean
- **Values**: `true` or `false`

### Enum/Status

- **Type**: String
- **Values**: Predefined constants
- **Example**: `"active"`, `"inactive"`, `"pending"`, `"approved"`, `"rejected"`

### ID Format

- **Format**: `{resource_type}_{random_string}`
- **Examples**:
  - Product: `prod_abc123xyz`
  - Sale: `sale_def456uvw`
  - Customer: `cust_ghi789rst`
  - User: `user_jkl012mno`
  - Tenant: `tenant_pqr345stu`
  - Outlet: `outlet_vwx678yza`

### Phone Number

- **Format**: String, tanpa spasi dan tanda hubung
- **Example**: `081234567890`
- **Validation**: 10-13 digits, mulai dengan 0 atau +62

### Email

- **Format**: Standard email format
- **Validation**: RFC 5322 compliant

### URL

- **Format**: Full URL dengan protocol
- **Example**: `https://cdn.gipos.id/products/abc123.jpg`

### Image Object

```json
{
  "id": "img_001",
  "url": "https://cdn.gipos.id/products/abc123.jpg",
  "thumbnail_url": "https://cdn.gipos.id/products/abc123_thumb.jpg",
  "order": 1,
  "size": 102400,
  "width": 800,
  "height": 600,
  "mime_type": "image/jpeg",
  "created_at": "2024-01-15T10:30:45+07:00"
}
```

### Address Object

```json
{
  "street": "Jl. Merdeka No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postal_code": "10110",
  "country": "Indonesia",
  "coordinates": {
    "latitude": -6.2088,
    "longitude": 106.8456
  }
}
```

### Nested Resource (Reference)

```json
{
  "category": {
    "id": "cat_xyz789",
    "name": "Kategori A",
    "slug": "kategori-a"
  }
}
```

### Nested Resource (Full)

```json
{
  "category": {
    "id": "cat_xyz789",
    "name": "Kategori A",
    "slug": "kategori-a",
    "parent_id": null,
    "description": "Deskripsi kategori",
    "image_url": "https://cdn.gipos.id/categories/xyz789.jpg",
    "created_at": "2024-01-10T08:00:00+07:00",
    "updated_at": "2024-01-15T10:30:45+07:00"
  }
}
```

---

## HTTP Status Codes

### Success Codes

- **200 OK**: Request berhasil (GET, PUT, PATCH)
- **201 Created**: Resource berhasil dibuat (POST)
- **204 No Content**: Request berhasil, tidak ada content (DELETE)

### Client Error Codes

- **400 Bad Request**: Request tidak valid (validation error)
- **401 Unauthorized**: Tidak terautentikasi
- **403 Forbidden**: Tidak memiliki izin
- **404 Not Found**: Resource tidak ditemukan
- **409 Conflict**: Konflik dengan state saat ini
- **422 Unprocessable Entity**: Request valid tapi tidak bisa diproses
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes

- **500 Internal Server Error**: Error pada server
- **502 Bad Gateway**: Error dari upstream service
- **503 Service Unavailable**: Service sedang maintenance
- **504 Gateway Timeout**: Timeout dari upstream service

---

## Response Examples

### Complete Sale Transaction Response

**POST /api/v1/sales**

```json
{
  "success": true,
  "data": {
    "id": "sale_abc123",
    "invoice_number": "INV-2024-001-0001",
    "outlet": {
      "id": "outlet_456",
      "name": "Outlet Pusat",
      "address": {
        "street": "Jl. Merdeka No. 123",
        "city": "Jakarta",
        "province": "DKI Jakarta"
      }
    },
    "cashier": {
      "id": "user_789",
      "name": "Budi Santoso",
      "email": "budi@example.com"
    },
    "customer": {
      "id": "cust_xyz789",
      "name": "Siti Nurhaliza",
      "phone": "081234567890"
    },
    "items": [
      {
        "id": "item_001",
        "product": {
          "id": "prod_abc123",
          "name": "Produk A",
          "sku": "SKU-001"
        },
        "quantity": 2,
        "unit_price": 50000,
        "discount": 0,
        "subtotal": 100000,
        "tax": 10000,
        "total": 110000
      }
    ],
    "subtotal": 100000,
    "discount": 0,
    "tax": 10000,
    "total": 110000,
    "payment": {
      "method": "qris",
      "status": "completed",
      "paid_at": "2024-01-15T10:30:45+07:00",
      "payment_id": "pay_xyz789",
      "qr_code_url": "https://api.xendit.co/qr/xyz789"
    },
    "points_earned": 10,
    "points_redeemed": 0,
    "status": "completed",
    "created_at": "2024-01-15T10:30:00+07:00",
    "completed_at": "2024-01-15T10:30:45+07:00"
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "created_by": "user_789",
    "shift_id": "shift_abc123"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Stock Movement Response

**GET /api/v1/inventory/movements**

```json
{
  "success": true,
  "data": [
    {
      "id": "movement_001",
      "type": "sale",
      "product": {
        "id": "prod_abc123",
        "name": "Produk A",
        "sku": "SKU-001"
      },
      "warehouse": {
        "id": "wh_001",
        "name": "Gudang Utama"
      },
      "quantity": -2,
      "balance_before": 100,
      "balance_after": 98,
      "reference": {
        "type": "sale",
        "id": "sale_abc123",
        "invoice_number": "INV-2024-001-0001"
      },
      "notes": "Penjualan",
      "created_at": "2024-01-15T10:30:00+07:00",
      "created_by": {
        "id": "user_789",
        "name": "Budi Santoso"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    },
    "filters": {
      "product_id": "prod_abc123",
      "warehouse_id": "wh_001",
      "type": "sale",
      "start_date": "2024-01-01T00:00:00+07:00",
      "end_date": "2024-01-31T23:59:59+07:00"
    },
    "summary": {
      "total_in": 500,
      "total_out": 300,
      "net_movement": 200
    }
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Dashboard Summary Response

**GET /api/v1/dashboard/summary**

```json
{
  "success": true,
  "data": {
    "period": {
      "type": "today",
      "start": "2024-01-15T00:00:00+07:00",
      "end": "2024-01-15T23:59:59+07:00"
    },
    "revenue": {
      "total": 2500000,
      "total_formatted": "Rp 2.500.000",
      "change_percentage": 15.5,
      "change_direction": "up",
      "previous_period": 2165000
    },
    "profit": {
      "total": 500000,
      "total_formatted": "Rp 500.000",
      "margin_percentage": 20.0,
      "change_percentage": 20.0,
      "change_direction": "up"
    },
    "transactions": {
      "count": 125,
      "average_value": 20000,
      "change_percentage": 10.0,
      "change_direction": "up"
    },
    "products_sold": {
      "count": 450,
      "change_percentage": 5.0,
      "change_direction": "up"
    },
    "customers": {
      "new": 15,
      "returning": 110,
      "total": 125
    },
    "payment_methods": {
      "cash": {
        "count": 50,
        "amount": 1000000,
        "percentage": 40.0
      },
      "qris": {
        "count": 60,
        "amount": 1200000,
        "percentage": 48.0
      },
      "e_wallet": {
        "count": 15,
        "amount": 300000,
        "percentage": 12.0
      }
    },
    "top_products": [
      {
        "product": {
          "id": "prod_abc123",
          "name": "Produk A",
          "sku": "SKU-001"
        },
        "quantity_sold": 50,
        "revenue": 2500000
      }
    ]
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_id": "outlet_456",
    "generated_at": "2024-01-15T10:30:45+07:00"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

### Multi-Outlet Consolidated Response

**GET /api/v1/reports/consolidated**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00+07:00",
      "end": "2024-01-31T23:59:59+07:00"
    },
    "total": {
      "revenue": 75000000,
      "profit": 15000000,
      "transactions": 3750,
      "products_sold": 13500
    },
    "by_outlet": [
      {
        "outlet": {
          "id": "outlet_456",
          "name": "Outlet Pusat"
        },
        "revenue": 30000000,
        "profit": 6000000,
        "transactions": 1500,
        "products_sold": 5400,
        "percentage": 40.0
      },
      {
        "outlet": {
          "id": "outlet_789",
          "name": "Outlet Cabang A"
        },
        "revenue": 25000000,
        "profit": 5000000,
        "transactions": 1250,
        "products_sold": 4500,
        "percentage": 33.3
      },
      {
        "outlet": {
          "id": "outlet_012",
          "name": "Outlet Cabang B"
        },
        "revenue": 20000000,
        "profit": 4000000,
        "transactions": 1000,
        "products_sold": 3600,
        "percentage": 26.7
      }
    ]
  },
  "meta": {
    "tenant_id": "tenant_123",
    "outlet_ids": ["outlet_456", "outlet_789", "outlet_012"],
    "generated_at": "2024-01-15T10:30:45+07:00"
  },
  "timestamp": "2024-01-15T10:30:45+07:00",
  "request_id": "req_abc123xyz"
}
```

---

## Best Practices

### 1. Consistent Field Naming

- Gunakan **snake_case** untuk semua field
- Gunakan nama yang deskriptif dan jelas
- Hindari singkatan yang tidak jelas

### 2. Always Include Metadata

- `timestamp`: Waktu response dibuat
- `request_id`: ID unik untuk tracking request
- `tenant_id`: ID tenant (untuk multi-tenant)
- `outlet_id`: ID outlet (jika applicable)

### 3. Error Messages

- Gunakan Bahasa Indonesia untuk user-facing messages
- Sertakan error code untuk programmatic handling
- Berikan context yang cukup untuk debugging
- Jangan expose sensitive information di production

### 4. Pagination

- Default `per_page`: 20
- Maximum `per_page`: 100
- Selalu sertakan pagination meta untuk collection responses

### 5. Date/Time

- Selalu gunakan ISO 8601 format
- Selalu include timezone (WIB/UTC+7)
- Store di database dalam UTC, convert ke WIB di response

### 6. Currency

- Store sebagai integer (sen)
- Sertakan formatted version jika diperlukan
- Gunakan format Indonesia: `Rp 50.000`

### 7. Null vs Empty

- Gunakan `null` untuk field yang tidak ada
- Gunakan empty array `[]` untuk collection yang kosong
- Gunakan empty string `""` hanya jika field memang string kosong

### 8. Nested Resources

- Gunakan reference (id + minimal fields) untuk list responses
- Gunakan full object untuk detail responses
- Sertakan query parameter `?include=category,images` untuk control

### 9. Versioning

- Gunakan URL versioning: `/api/v1/`
- Maintain backward compatibility dalam major version
- Document breaking changes

### 10. Request ID

- Generate unique request ID untuk setiap request
- Include di response untuk correlation
- Log request ID di semua logs untuk tracing


---

## Implementation Notes (Go Backend)

### Response Struct

```go
type APIResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Error     *APIError   `json:"error,omitempty"`
    Meta      Meta        `json:"meta,omitempty"`
    Timestamp string      `json:"timestamp"`
    RequestID string      `json:"request_id"`
}

type Meta struct {
    Pagination *PaginationMeta `json:"pagination,omitempty"`
    Filters    map[string]interface{} `json:"filters,omitempty"`
    Sort       *SortMeta      `json:"sort,omitempty"`
    TenantID   string         `json:"tenant_id,omitempty"`
    OutletID   string         `json:"outlet_id,omitempty"`
}
```

### Helper Functions

```go
func SuccessResponse(data interface{}, meta Meta) *APIResponse {
    return &APIResponse{
        Success:   true,
        Data:      data,
        Meta:      meta,
        Timestamp: time.Now().In(timezoneWIB).Format(time.RFC3339),
        RequestID: getRequestID(),
    }
}

func ErrorResponse(err *APIError, meta Meta) *APIResponse {
    return &APIResponse{
        Success:   false,
        Error:     err,
        Meta:      meta,
        Timestamp: time.Now().In(timezoneWIB).Format(time.RFC3339),
        RequestID: getRequestID(),
    }
}
```

---

**Dokumen ini akan diupdate sesuai dengan perkembangan API dan feedback dari development team.**

