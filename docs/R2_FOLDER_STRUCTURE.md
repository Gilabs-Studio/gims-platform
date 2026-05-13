# Cloudflare R2 Folder Structure & Storage Management

## 📁 Organized Folder Structure

All uploads di Cloudflare R2 diorganisir dalam folder terstruktur untuk efisiensi dan manajemen yang lebih baik:

### **Folder Hierarki**

```
r2://bucket/
├── avatars/                          # User profile photos
│   ├── {userId}/
│   │   └── {uuid}.webp              # One avatar per user (overwrite on re-upload)
│
├── signatures/                       # Employee signatures
│   ├── {employeeId}/
│   │   └── {uuid}.png|jpg           # One signature per employee
│
├── products/                         # Product images
│   ├── {productId}/
│   │   ├── {uuid}.webp
│   │   ├── {uuid}.webp
│   │   └── ...
│
├── visits/                           # Visit report photos
│   ├── {visitReportId}/
│   │   ├── {uuid}.webp
│   │   ├── {uuid}.webp
│   │   └── ... (max 5 per visit)
│
├── documents/                        # Uploaded documents
│   ├── {uuid}_{sanitizedName}.pdf
│   ├── {uuid}_{sanitizedName}.docx
│   └── ...
│
├── exports/                          # Async exported files
│   ├── {jobId}_{filename}.xlsx
│   └── {jobId}_{filename}.pdf
│
└── uploads/                          # Generic uploads (fallback)
    └── {uuid}.webp
```

---

## 🔧 Upload Configuration & Folder Mapping

### **Generic Upload Handler** (`/api/v1/uploads/images`, `/api/v1/uploads/document`)

Query parameter untuk set folder destination:

```bash
# Upload image to visit reports folder
POST /api/v1/uploads/images?folder=visits
# Result: visits/{uuid}.webp

# Upload document to reports
POST /api/v1/uploads/document?folder=documents
# Result: documents/{uuid}_{name}.pdf

# Default (no folder param)
POST /api/v1/uploads/images
# Result: uploads/{uuid}.webp
```

### **Domain-Specific Handlers** (Folder otomatis via handler logic)

| Endpoint | Handler | Folder | Path Example |
|----------|---------|--------|--------------|
| `POST /profile/avatar` | user_handler.UploadAvatar() | `avatars/{userId}` | `avatars/user123/{uuid}.webp` |
| `POST /employees/:id/signature` | employee_handler.UploadEmployeeSignature() | `signatures/{employeeId}` | `signatures/emp456/{uuid}.png` |
| `PATCH /master-data/products/:id` | product_usecase.Update() | `products/{productId}` | `products/prod789/{uuid}.webp` |
| `POST /crm/visits/:id/photos` | visit_report_handler.UploadPhotos() | `visits/{visitId}` | `visits/visit001/{uuid}.webp` |

---

## 🗑️ Automatic Cleanup & Deletion

### **1. Image Deletion Flow**

#### **Avatar Update (Product Image)**
**File:** `apps/api/internal/product/domain/usecase/product_usecase.go` (line 215)

```go
// When updating product with new/empty image URL
if req.ImageURL != nil {
    if product.ImageURL != nil && *product.ImageURL != "" {
        // Delete old image from R2 (best-effort)
        key := storage.KeyFromURL(*product.ImageURL)  // Extract key from URL
        if key != "" {
            _ = storage.Delete(ctx, key)
        }
    }
    // Set new image
    product.ImageURL = req.ImageURL
}
```

**Trigger:** `PATCH /master-data/products/:id` dengan `image_url: ""` atau `image_url: "{new_url}"`

---

#### **Visit Report Deletion**
**File:** `apps/api/internal/crm/domain/usecase/visit_report_usecase.go` (line 371)

```go
func (u *visitReportUsecase) Delete(ctx context.Context, id string) error {
    report, err := u.visitRepo.FindByID(ctx, id)
    if err != nil {
        return ErrVisitReportNotFound
    }

    // Delete all photos from R2 (best-effort cleanup)
    if report.Photos != nil && *report.Photos != "" {
        var photoURLs []string
        json.Unmarshal([]byte(*report.Photos), &photoURLs)
        for _, photoURL := range photoURLs {
            key := storage.KeyFromURL(photoURL)
            if key != "" {
                _ = storage.Delete(ctx, key)
            }
        }
    }

    return u.visitRepo.Delete(ctx, id)
}
```

**Trigger:** `DELETE /crm/visits/:id`

---

#### **Avatar Upload Failure**
**File:** `apps/api/internal/user/presentation/handler/user_handler.go` (line 455)

```go
// If DB update fails after upload → rollback R2
if err := h.userUC.UpdateAvatar(c.Request.Context(), id, uploadedFile.URL); err != nil {
    _ = storage.Delete(c.Request.Context(), uploadedFile.Path)
}
```

---

### **2. Export File Cleanup**
**File:** `apps/api/internal/core/infrastructure/exportjob/manager.go` (line 252)

- Expired async exports otomatis didelete dari R2 setelah **7 hari** (TTL)
- Cleanup runs setiap 1 jam via background worker

```go
func (m *Manager) cleanupExpiredJobRecords(cutoff time.Time) {
    for id, job := range m.jobs {
        if job.FinishedAt.Before(cutoff) && job.filePath != "" {
            _ = storage.Delete(context.Background(), job.filePath)
        }
    }
}
```

---

## 📋 Upload Flow Summary

### **Current Implementation**

```
Request → Validate → Convert (if image) → Upload to R2 → Update DB → Response
                     └─ On DB failure ─→ Delete from R2 (best-effort)
```

### **Efisiensi Improvements** ✅

1. **Folder Structure**
   - ✅ Terpisah per domain: avatars, products, visits, signatures, documents, exports
   - ✅ Nested by ID untuk better organization (e.g., `products/{productId}/` untuk group semua images product)
   - ✅ Query parameter support untuk generic handlers (`?folder=visits`)

2. **Automatic Cleanup**
   - ✅ Product image update: Hapus old image saat replace/delete
   - ✅ Visit report delete: Hapus all photos saat report didelete
   - ✅ Upload failure: Rollback R2 jika DB save gagal
   - ✅ Export expiry: Auto-cleanup setelah 7 hari

3. **Future Enhancements** (Optional)
   - [ ] Batch deletion endpoint untuk administrative cleanup
   - [ ] Lifecycle policy di R2 untuk automatic purge of old exports
   - [ ] S3 lifecycle rules: Delete objects after X days automatically
   - [ ] Orphaned file detection & cleanup job (detects files without DB references)

---

## 🚀 Deployment Checklist

Before production deployment:

- [ ] R2 bucket created dengan public URL configured
- [ ] Environment variables set:
  - `R2_ACCOUNT_ID` → Cloudflare account ID
  - `R2_ACCESS_KEY_ID` → API token access key
  - `R2_SECRET_ACCESS_KEY` → API token secret
  - `R2_BUCKET_NAME` → Bucket name
  - `R2_PUBLIC_URL` → Public URL (e.g., `https://pub-abc123.r2.dev`)
- [ ] Test upload, delete, and cleanup flows
- [ ] Verify folder structure appears in R2 dashboard
- [ ] Monitor logs untuk storage errors (network, auth, etc.)

---

## 📝 Testing Commands

### **Upload with folder parameter**
```bash
curl -F "file=@image.jpg" \
  "http://localhost:8080/api/v1/uploads/images?folder=visits"
# Response: { "url": "https://.../visits/{uuid}.webp", ... }
```

### **Product image update (triggers cleanup)**
```bash
curl -X PATCH http://localhost:8080/api/v1/master-data/products/{productId} \
  -H "Content-Type: application/json" \
  -d '{"image_url": ""}' # Empty string = delete old image
# Old image deleted from R2, DB updated
```

### **Visit report deletion (cleanup all photos)**
```bash
curl -X DELETE http://localhost:8080/api/v1/crm/visits/{visitId}
# All associated photos deleted from R2
```

---

## 🔗 Related Files

- **Storage Core:** `apps/api/internal/core/storage/r2.go`
  - `Init()` — Initialize R2 client
  - `Upload()` — Upload to R2 with key
  - `Delete()` — Delete from R2
  - `KeyFromURL()` — Extract R2 key from public URL
  - `URL()` — Build public URL from key

- **File Upload Utilities:** `apps/api/internal/core/utils/file_upload.go`
  - `FileUploadConfig.Folder` — Folder prefix parameter
  - `SaveUploadedFile()` — Upload image with folder support
  - `SaveDocumentFile()` — Upload document with folder support

- **Handlers:** See table above for domain-specific upload/delete logic

---

**Last Updated:** May 8, 2026
