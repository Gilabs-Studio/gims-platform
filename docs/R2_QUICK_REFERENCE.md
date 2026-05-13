# R2 Storage - Quick Reference Guide

## 🚀 Quick Start for Developers

### Add Folder to Any Upload

When you need to upload files in a new context, add folder parameter:

```go
// In your handler:
uploadConfig := utils.FileUploadConfig{
    MaxSize: 5 * 1024 * 1024,
    Folder:  "your-folder-name",  // e.g., "products", "visits", "documents"
}

uploadedFile, err := utils.SaveUploadedFile(file, header, uploadConfig)
// Result: r2://bucket/your-folder-name/{uuid}.webp
```

### Generic Handler Endpoints

```bash
# Upload image with folder
POST /api/v1/uploads/images?folder=visits
# → visits/{uuid}.webp

# Upload document with folder  
POST /api/v1/uploads/document?folder=reports
# → reports/{uuid}_{name}.pdf

# Default (no folder)
POST /api/v1/uploads/images
# → uploads/{uuid}.webp
```

### Delete Old Image Before Setting New One

```go
import "github.com/gilabs/gims/api/internal/core/storage"

// When updating/deleting image
if oldImageURL != nil && *oldImageURL != "" {
    key := storage.KeyFromURL(*oldImageURL)
    if key != "" {
        _ = storage.Delete(ctx, key)  // Best-effort cleanup
    }
}
```

### Delete All Files When Deleting Parent Record

```go
// Example: Delete visit report with all photos
func (u *usecase) Delete(ctx context.Context, id string) error {
    report, _ := u.repo.FindByID(ctx, id)
    
    // Delete all associated photos from R2
    if report.Photos != nil {
        var photoURLs []string
        json.Unmarshal([]byte(*report.Photos), &photoURLs)
        for _, url := range photoURLs {
            if url != "" {
                key := storage.KeyFromURL(url)
                if key != "" {
                    _ = storage.Delete(ctx, key)
                }
            }
        }
    }
    
    return u.repo.Delete(ctx, id)

### Automatic Cleanup on Upload Failure (Best-Effort)

When a file uploads to R2 but DB save fails, cleanup is automatic:

```go
// Handler example: If DB update fails after upload
if err := h.userUC.UpdateAvatar(c.Request.Context(), id, uploadedFile.URL); err != nil {
    // Automatically triggered in handlers
    _ = storage.Delete(c.Request.Context(), uploadedFile.Path)
    return err
}
```

**Implemented in:**
- User avatar upload → `user_handler.go` line 456
- Employee signature upload → `employee_handler.go` line 1098
- Visit report photo upload → `visit_report_usecase.go` line 669
- Employee signature delete → `employee_usecase.go` line 2073
}
```

---

## 📁 Folder Convention

Follow this naming for organized R2 structure:

| Purpose | Folder | Path Example |
|---------|--------|--------------|
| User avatars | `avatars/{userId}` | `avatars/user123/{uuid}.webp` |
| Employee signatures | `signatures/{empId}` | `signatures/emp456/{uuid}.png` |
| Product images | `products/{prodId}` | `products/prod789/{uuid}.webp` |
| Visit photos | `visits/{visitId}` | `visits/visit001/{uuid}.webp` |
| General documents | `documents` | `documents/{uuid}_{name}.pdf` |
| Exports | `exports` | `exports/job123_{name}.xlsx` |
| Generic/fallback | `uploads` | `uploads/{uuid}.webp` |

---

## 🔧 Key Functions

### `storage.Upload(ctx, key, data, contentType)`
- Uploads file to R2 under given key
- Returns: public URL
- Key format: `folder/filename` or just `filename`

### `storage.Delete(ctx, key)`
- Deletes file from R2
- Use best-effort (ignore errors)
- Key: same format as Upload

### `storage.KeyFromURL(publicURL)`
- Extracts R2 object key from public URL
- Example: `https://pub-abc.r2.dev/avatars/123.webp` → `avatars/123.webp`
- Returns: empty string if URL not from R2

### `storage.URL(key)`
- Builds public URL from R2 key
- Example: `avatars/123.webp` → `https://pub-abc.r2.dev/avatars/123.webp`

---

## ⚠️ Important Notes

1. **Folder parameter is optional** — defaults to `"uploads"` if not specified
2. **Cleanup is best-effort** — errors ignored, doesn't block main operation
3. **KeyFromURL() must be used** — for extracting key from stored URLs
4. **Always trim trailing slashes** — Folder should be `"avatars/123"` not `"avatars/123/"`
5. **Max filename length** — R2 keys limited to 1024 characters

---

## 🧪 Testing Upload Flows

```bash
# Test 1: Upload image to specific folder
curl -F "file=@photo.jpg" \
  http://localhost:8080/api/v1/uploads/images?folder=test
# Verify response has: "url": "https://.../test/{uuid}.webp"

# Test 2: Update product with new image (old should be cleaned up)
curl -X PATCH http://localhost:8080/api/v1/master-data/products/ABC123 \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://pub-abc.r2.dev/products/ABC123/oldimage.webp"}'
# Check R2 console - old image should be deleted

# Test 3: Delete visit report (all photos should be cleaned up)
curl -X DELETE http://localhost:8080/api/v1/crm/visits/VISIT123
# Check R2 console - all visit photos should be deleted
```

---

**Last Updated:** May 8, 2026  
**Related Docs:** [R2_FOLDER_STRUCTURE.md](R2_FOLDER_STRUCTURE.md)
