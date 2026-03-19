# Employee Signature Feature Documentation

## Overview

Fitur **Employee Signature** memungkinkan HR/Admin untuk mengupload dan mengelola tanda tangan digital karyawan. Tanda tangan ini dapat digunakan untuk berbagai keperluan dokumentasi seperti kontrak kerja, surat peringatan, dan dokumen-dokumen legal lainnya yang memerlukan tanda tangan karyawan.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Security & Verification](#security--verification)
4. [API Endpoints](#api-endpoints)
5. [File Storage](#file-storage)
6. [Frontend Implementation](#frontend-implementation)
7. [Backend Implementation](#backend-implementation)
8. [Database Schema](#database-schema)
9. [Translation Keys](#translation-keys)
10. [Usage Guide](#usage-guide)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Core Features

| Feature                | Description                                        | Status         |
| ---------------------- | -------------------------------------------------- | -------------- |
| **Upload Signature**   | Upload foto tanda tangan (PNG/JPG)                 | ✅ Implemented |
| **Replace Signature**  | Ganti signature yang sudah ada                     | ✅ Implemented |
| **Delete Signature**   | Soft delete signature (history tetap tersimpan)    | ✅ Implemented |
| **Download Signature** | Download file signature (direct download via blob) | ✅ Implemented |
| **Preview**            | Preview gambar signature di browser                | ✅ Implemented |
| **Image Validation**   | Validasi format dan ukuran file                    | ✅ Implemented |
| **Error Handling**     | Handle image load errors dengan gracefully         | ✅ Implemented |

### Business Rules

1. **HR/Admin Only**: Hanya user dengan permission `employee.update` yang dapat upload/delete signature
2. **One Signature Per Employee**: Setiap karyawan hanya boleh memiliki satu signature aktif
3. **Auto Replace**: Upload signature baru otomatis replace signature lama (soft delete)
4. **Optional**: Employee tidak wajib memiliki signature saat pembuatan
5. **Soft Delete**: Signature yang dihapus masih tersimpan di database dengan `deleted_at` timestamp
6. **Format Preservation**: File disimpan dalam format asli (PNG tetap PNG, JPG tetap JPG), tidak dikonversi ke format lain
7. **Original Filename**: Nama file asli disimpan dan ditampilkan saat download

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Employee Detail  │──│ Signature Section│──│ File Upload  │  │
│  │   Modal          │  │   Component      │  │   Handler    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Go/Gin)                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Employee Handler │──│ Signature Usecase│──│ File Storage │  │
│  │   (Router)       │  │   (Business)     │  │   (Utils)    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ GORM
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                       │
│              ┌──────────────────────────────┐                   │
│              │   employee_signatures        │                   │
│              │   (with soft delete)         │                   │
│              └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Upload Flow:
   User (HR) → Select File → Frontend Validation → POST /api/v1/organization/employees/:id/signature
   → Backend Validation → Save to Storage → Save to Database → Return Response

2. View Flow:
   User → Open Employee Detail → Click Signature Tab → GET /api/v1/organization/employees/:id/signature
   → Backend Query → Return Signature Data → Frontend Display

3. Delete Flow:
   User → Click Delete → Confirmation Dialog → DELETE /api/v1/organization/employees/:id/signature
   → Soft Delete in Database → Invalidate Cache → Return Success
```

---

## Security & Verification

### Access Control

| Action             | Required Permission | Role               |
| ------------------ | ------------------- | ------------------ |
| View Signature     | `employee.read`     | HR, Admin, Manager |
| Upload Signature   | `employee.update`   | HR, Admin          |
| Delete Signature   | `employee.update`   | HR, Admin          |
| Download Signature | `employee.read`     | HR, Admin, Manager |

### File Security

#### 1. File Type Validation

```go
// Allowed MIME types
"image/png"
"image/jpeg"
"image/jpg"

// Rejected types
"image/gif", "image/webp", "image/svg+xml", dll.
```

#### 2. File Size Validation

- **Maximum Size**: 5 MB (5 _ 1024 _ 1024 bytes)
- **Rejected**: Files larger than 5MB

#### 3. File Naming

- Menggunakan UUID untuk mencegah file collision di storage
- Format storage: `{uuid}.png` atau `{uuid}.jpg`
- Original filename disimpan di field `file_name` untuk ditampilkan saat download
- Nama file asli tidak digunakan untuk nama file di storage (security)

#### 4. File Storage

- File disimpan di direktori terpisah: `./uploads/signatures/`
- File disimpan dalam format asli (PNG tetap PNG, JPG tetap JPG), tidak dikonversi ke WebP
- File permissions: 0644 (readable, not executable)
- Directory traversal protection diimplementasikan
- Menggunakan utility function `SaveSignatureFile` khusus untuk signature

#### 5. Integrity Check

- SHA-256 hash disimpan untuk setiap file
- Hash dapat digunakan untuk verifikasi integritas file

### Audit Trail

Setiap action tercatat dengan informasi:

- `uploaded_by`: User ID yang upload
- `uploaded_at`: Timestamp upload
- `deleted_at`: Timestamp soft delete (jika dihapus)

---

## API Endpoints

### Base URL

```
/api/v1/organization/employees/:employee_id/signature
```

### Endpoints

#### 1. Get Employee Signature

```http
GET /api/v1/organization/employees/{employee_id}/signature
```

**Response (200 - Has Signature)**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "file_path": "/uploads/signatures/uuid.png",
    "file_url": "/uploads/signatures/uuid.png",
    "file_name": "original_filename.png",
    "file_size": 45123,
    "file_hash": "sha256_hash",
    "mime_type": "image/png",
    "width": 300,
    "height": 100,
    "uploaded_by": "user_uuid",
    "uploaded_at": "2024-03-18T10:30:00Z"
  }
}
```

**Response (200 - No Signature)**

```json
{
  "success": true,
  "data": null
}
```

#### 2. Upload Signature

```http
POST /api/v1/organization/employees/{employee_id}/signature
Content-Type: multipart/form-data
```

**Request Body**

```
file: (binary) - PNG/JPG file, max 5MB
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "file_path": "/uploads/signatures/uuid.png",
    "file_url": "/uploads/signatures/uuid.png",
    "file_name": "original_filename.png",
    "file_size": 45123,
    "file_hash": "sha256_hash",
    "mime_type": "image/png",
    "width": 300,
    "height": 100,
    "uploaded_by": "user_uuid",
    "uploaded_at": "2024-03-18T10:30:00Z"
  }
}
```

**Response (400 - Invalid File)**

```json
{
  "success": false,
  "error": "INVALID_FILE_TYPE",
  "message": "Only PNG and JPG files are allowed"
}
```

**Response (400 - File Too Large)**

```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "File size must be less than 5MB"
}
```

#### 3. Delete Signature

```http
DELETE /api/v1/organization/employees/{employee_id}/signature
```

**Response (200)**

```json
{
  "success": true,
  "data": {
    "message": "Signature deleted successfully"
  }
}
```

---

## File Storage

### Storage Location

```
./uploads/signatures/
```

### File Organization

```
uploads/
└── signatures/
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.png
    ├── b2c3d4e5-f6a7-8901-bcde-f12345678901.jpg
    └── ...
```

### Storage Configuration

```go
// In usecase initialization
uploadDir := "./uploads/signatures"
baseURL := "/uploads/signatures"
```

### File Naming Convention

- UUID v4 untuk filename di storage
- Ekstensi sesuai MIME type asli (.png, .jpg)
- Original filename disimpan di field `file_name` untuk ditampilkan saat download
- Contoh storage: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.png`
- Contoh file_name: `tanda_tangan_karyawan.png`

### Upload Function

Signature menggunakan utility function khusus:

```go
// SaveSignatureFile - Khusus untuk upload signature
// Menyimpan file dalam format asli (tidak dikonversi)
func SaveSignatureFile(file multipart.File, header *multipart.FileHeader, uploadDir string) (*FileInfo, error)

// Berbeda dengan SaveUploadedFile yang digunakan untuk file umum
// SaveSignatureFile memastikan format asli tetap terjaga
```

**Perbedaan dengan SaveUploadedFile:**

- `SaveSignatureFile`: Khusus signature, format asli dipertahankan (PNG/JPG)
- `SaveUploadedFile`: Untuk file umum, bisa melakukan konversi/formatting

**Keuntungan menggunakan SaveSignatureFile:**

1. Format file asli (PNG/JPG) dipertahankan
2. Tidak ada konversi ke WebP atau format lain
3. Integritas file tetap terjaga untuk keperluan legal/dokumen

---

## Frontend Implementation

### Component Structure

```
components/signature/
├── employee-signature-section.tsx  # Main component
└── index.ts                        # Export barrel
```

### EmployeeSignatureSection Component

**Props**

```typescript
interface EmployeeSignatureSectionProps {
  employeeId: string;
}
```

**Features**

- File upload dengan drag & drop (opsional)
- Preview gambar dengan error handling
- Informasi file (nama, ukuran, tanggal upload)
- Tombol Replace, Download, dan Delete
- Loading states dan skeleton loader

**Image URL Resolution**

```typescript
const getImageUrl = (sig: EmployeeSignature): string => {
  // If file_url is already a full URL, use it
  if (sig.file_url?.startsWith("http")) {
    return sig.file_url;
  }
  // Otherwise, prepend API base URL
  const path = sig.file_url || sig.file_path;
  return `${API_BASE_URL}${path}`;
};
```

**Error Handling**

- Jika gambar gagal load → tampilkan placeholder icon
- Tampilkan alert error
- Tetap tampilkan tombol download (bisa jadi file masih ada tapi tidak bisa di-preview)

**Download Functionality**

Download signature menggunakan blob URL approach untuk memastikan file selalu di-download ke komputer user, bukan dibuka di browser:

```typescript
const handleDownload = async () => {
  if (!signature) return;

  try {
    // Fetch the image as a blob
    const response = await fetch(imageUrl, { credentials: "include" });
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create temporary anchor element
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = signature.file_name || "signature.jpg";

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    toast.success(t("signature.downloadSuccess"));
  } catch (error) {
    toast.error(t("signature.downloadError"));
  }
};
```

**Keuntungan blob URL approach:**

- File selalu di-download, tidak dibuka di tab baru
- Mendukung CORS dengan credentials
- Filename tetap terjaga (sesuai `file_name` dari backend)
- Loading state dapat ditampilkan selama proses download
- Toast notification untuk success/error feedback

### React Query Hooks

```typescript
// Query hooks
export function useEmployeeSignature(employeeId: string | undefined);

// Mutation hooks
export function useUploadEmployeeSignature();
export function useDeleteEmployeeSignature();
```

### Integration

**Location**: Tab "Signature" di Employee Detail Modal

```tsx
<TabsContent value="signature" className="space-y-6 py-4">
  <EmployeeSignatureSection employeeId={displayEmployee.id} />
</TabsContent>
```

---

## Backend Implementation

### Domain Layer

#### Models

**EmployeeSignature**

```go
type EmployeeSignature struct {
    ID         uuid.UUID `gorm:"primary_key"`
    EmployeeID string    `gorm:"not null;uniqueIndex"`
    FilePath   string    `gorm:"not null"`
    FileName   string    `gorm:"not null"`
    FileSize   int64     `gorm:"not null"`
    FileHash   string    `gorm:"not null"` // SHA-256
    MimeType   string    `gorm:"not null"`
    Width      int
    Height     int
    UploadedBy string    `gorm:"not null"`
    UploadedAt time.Time
    DeletedAt  gorm.DeletedAt `gorm:"index"` // Soft delete
}
```

#### Repository Interface

```go
type EmployeeSignatureRepository interface {
    GetByEmployeeID(ctx context.Context, employeeID string) (*models.EmployeeSignature, error)
    Create(ctx context.Context, signature *models.EmployeeSignature) error
    SoftDelete(ctx context.Context, id string) error
}
```

#### Usecase Methods

```go
type EmployeeUsecase interface {
    GetEmployeeSignature(ctx context.Context, employeeID string) (*dto.EmployeeSignatureResponse, error)
    UploadEmployeeSignature(ctx context.Context, employeeID string, fileData FileData, uploadedBy string) (*dto.EmployeeSignatureResponse, error)
    DeleteEmployeeSignature(ctx context.Context, employeeID string) error
}
```

### Handler Methods

```go
func (h *EmployeeHandler) GetEmployeeSignature(c *gin.Context)
func (h *EmployeeHandler) UploadEmployeeSignature(c *gin.Context)
func (h *EmployeeHandler) DeleteEmployeeSignature(c *gin.Context)
```

---

## Database Schema

### Table: employee_signatures

```sql
CREATE TABLE employee_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    width INTEGER,
    height INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_employee_signatures_employee_id ON employee_signatures(employee_id);
CREATE INDEX idx_employee_signatures_deleted_at ON employee_signatures(deleted_at);
```

### Indexes

- `employee_id`: Untuk query by employee
- `deleted_at`: Untuk soft delete queries

---

## Translation Keys

### English (en.ts)

```typescript
signature: {
  title: "Digital Signature",
  description: "Employee's digital signature for document signing",
  upload: "Upload Signature",
  uploading: "Uploading...",
  replace: "Replace Signature",
  delete: "Delete Signature",
  deleting: "Deleting...",
  download: "Download",
  downloading: "Downloading...",
  downloadSuccess: "Signature downloaded successfully",
  downloadError: "Failed to download signature",
  noSignature: "No signature uploaded",
  supportedFormats: "Supported formats: PNG, JPG",
  invalidFileType: "Only PNG and JPG files are allowed",
  fileTooLarge: "File size must be less than 5MB",
  confirmDelete: "Are you sure you want to delete this signature?",
  deleteTitle: "Delete Signature",
  deleteMessage: "Are you sure you want to delete this signature? This action cannot be undone.",
  deleteConfirm: "Delete",
  deleteCancel: "Cancel",
  altText: "Employee signature",
  fileName: "File name",
  fileSize: "File size",
  uploadedAt: "Uploaded at",
  previewNotAvailable: "Preview not available",
  imageLoadError: "Failed to load signature image. The file may have been moved or deleted.",
}
```

### Indonesian (id.ts)

```typescript
signature: {
  title: "Tanda Tangan Digital",
  description: "Tanda tangan digital karyawan untuk penandatanganan dokumen",
  upload: "Unggah Tanda Tangan",
  uploading: "Mengunggah...",
  replace: "Ganti Tanda Tangan",
  delete: "Hapus Tanda Tangan",
  deleting: "Menghapus...",
  download: "Unduh",
  downloading: "Mengunduh...",
  downloadSuccess: "Tanda tangan berhasil diunduh",
  downloadError: "Gagal mengunduh tanda tangan",
  noSignature: "Belum ada tanda tangan",
  supportedFormats: "Format yang didukung: PNG, JPG",
  invalidFileType: "Hanya file PNG dan JPG yang diizinkan",
  fileTooLarge: "Ukuran file maksimal 5MB",
  confirmDelete: "Apakah Anda yakin ingin menghapus tanda tangan ini?",
  deleteTitle: "Hapus Tanda Tangan",
  deleteMessage: "Apakah Anda yakin ingin menghapus tanda tangan ini? Tindakan ini tidak dapat dibatalkan.",
  deleteConfirm: "Hapus",
  deleteCancel: "Batal",
  altText: "Tanda tangan karyawan",
  fileName: "Nama file",
  fileSize: "Ukuran file",
  uploadedAt: "Diunggah pada",
  previewNotAvailable: "Pratinjau tidak tersedia",
  imageLoadError: "Gagal memuat gambar tanda tangan. File mungkin telah dipindahkan atau dihapus.",
}
```

---

## Usage Guide

### For HR/Admin

#### Upload Signature

1. Buka halaman **Master Data → Employees**
2. Klik nama karyawan untuk membuka detail
3. Pilih tab **Signature**
4. Klik tombol **Upload Signature**
5. Pilih file PNG atau JPG (max 5MB)
6. Tunggu upload selesai
7. Preview akan muncul otomatis

#### Replace Signature

1. Buka tab **Signature** karyawan
2. Klik tombol **Replace Signature**
3. Pilih file baru
4. Signature lama akan dihapus otomatis (soft delete)

#### Download Signature

1. Buka tab **Signature** karyawan
2. Klik tombol **Download**
3. File akan di-download ke komputer

#### Delete Signature

1. Buka tab **Signature** karyawan
2. Klik tombol **Delete Signature**
3. Konfirmasi penghapusan
4. Signature akan di-soft delete

---

## Troubleshooting

### Common Issues

#### 1. Image Preview Not Loading

**Symptom**: Preview gambar tidak muncul (broken image icon)

**Possible Causes**:

- File belum benar-benar tersimpan di storage
- URL file salah
- File sudah dihapus tapi record database masih ada

**Solutions**:

- Cek console browser untuk error 404
- Verifikasi file ada di direktori `uploads/signatures/`
- Cek `file_path` dan `file_url` di database

#### 2. Upload Failed

**Symptom**: Error saat upload

**Possible Causes**:

- File terlalu besar (>5MB)
- Format file tidak didukung
- Network error
- Permission denied

**Solutions**:

- Pastikan file < 5MB
- Pastikan format PNG/JPG
- Cek permission user (harus punya `employee.update`)

#### 3. Signature Not Found After Upload

**Symptom**: Setelah upload, signature tidak muncul

**Possible Causes**:

- Cache React Query belum invalidate
- Employee ID salah
- Error di backend

**Solutions**:

- Refresh halaman
- Cek browser console untuk error
- Cek log backend

### Debug Steps

1. **Check API Response**:

   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        http://localhost:8080/api/v1/organization/employees/EMP_ID/signature
   ```

2. **Check Database**:

   ```sql
   SELECT * FROM employee_signatures
   WHERE employee_id = 'EMP_ID'
   AND deleted_at IS NULL;
   ```

3. **Check File Storage**:
   ```bash
   ls -la ./uploads/signatures/
   ```

---

## Future Enhancements

### Planned Features

- [ ] Digital signature drawing pad (canvas-based)
- [ ] Signature verification against stored template
- [ ] Signature expiration/reminder
- [ ] Bulk upload signatures
- [ ] Signature usage audit trail
- [ ] Integration with document signing workflow

### Technical Improvements

- [ ] CDN integration for file serving
- [ ] ~~Image optimization (WebP conversion)~~ - Signature files preserve original format (PNG/JPG) for legal integrity
- [ ] Signed URLs for secure file access
- [ ] Rate limiting untuk upload
- [ ] Virus scanning for uploaded files

---

## References

### Related Documentation

- [Employee Management](../employee-management.md)
- [File Upload Utils](../../../../apps/api/internal/core/utils/file_upload.go)
- [API Standards](../../../../docs/api-standart/README.md)

### Code Locations

- **Backend Models**: `apps/api/internal/organization/data/models/employee_signature.go`
- **Backend Handler**: `apps/api/internal/organization/presentation/handler/employee_handler.go`
- **Frontend Component**: `apps/web/src/features/master-data/employee/components/signature/`
- **Frontend Service**: `apps/web/src/features/master-data/employee/services/employee-service.ts`

---

**Last Updated**: March 19, 2026
**Version**: 1.2.0
**Author**: GIMS Development Team
