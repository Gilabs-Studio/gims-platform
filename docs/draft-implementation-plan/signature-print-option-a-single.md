# Employee Signature on Print Documents - Option A: Single Signature (Creator)

## Overview

Implementasi sederhana di mana dokumen print menampilkan tanda tangan karyawan yang **membuat/memproses dokumen tersebut**. Pilihan ini paling mudah diimplementasikan dan cocok untuk dokumen-dokumen standar seperti Quotation, Invoice, dan Payment Receipt.

## Use Cases

| Document Type   | Signer            | Kapan Signature Muncul |
| --------------- | ----------------- | ---------------------- |
| Sales Quotation | Sales Rep         | Saat quotation dibuat  |
| Sales Order     | Sales Rep         | Saat order dibuat      |
| Sales Invoice   | Sales Rep/Admin   | Saat invoice dibuat    |
| Payment Receipt | Finance Staff     | Saat payment diterima  |
| Purchase Order  | Procurement Staff | Saat PO dibuat         |
| Delivery Note   | Warehouse Staff   | Saat delivery dibuat   |

## Architecture

```
┌─────────────────────────────────────────────┐
│              Document Print Flow             │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  1. User Click "Print"                      │
│  2. Handler Fetch Document Data             │
│  3. Handler Get Creator Employee ID         │
│  4. Fetch Employee Signature                │
│  5. Render HTML with Signature              │
└─────────────────────────────────────────────┘
```

## Database Changes

**Tidak ada perubahan database** - Menggunakan existing `employee_signatures` table.

## Backend Implementation

### 1. Service Layer Enhancement

```go
// internal/organization/domain/usecase/employee_usecase.go

// GetEmployeeSignatureForPrint mengambil signature untuk ditampilkan di print
func (u *employeeUsecase) GetEmployeeSignatureForPrint(ctx context.Context, employeeID string) (*dto.EmployeeSignaturePrintDTO, error) {
    signature, err := u.signatureRepo.GetByEmployeeID(ctx, employeeID)
    if err != nil {
        return nil, err
    }

    if signature == nil {
        return nil, nil // Return nil jika tidak ada signature
    }

    // Get employee details
    employee, err := u.employeeRepo.FindByID(ctx, employeeID)
    if err != nil {
        return nil, err
    }

    return &dto.EmployeeSignaturePrintDTO{
        EmployeeID:   employeeID,
        EmployeeName: employee.Name,
        Position:     employee.JobPosition.Name, // atau field yang sesuai
        SignatureURL: signature.FileURL,
        FileName:     signature.FileName,
        MimeType:     signature.MimeType,
    }, nil
}
```

### 2. DTO

```go
// internal/organization/domain/dto/employee_dto.go

type EmployeeSignaturePrintDTO struct {
    EmployeeID   string `json:"employee_id"`
    EmployeeName string `json:"employee_name"`
    Position     string `json:"position"`
    SignatureURL string `json:"signature_url"`
    FileName     string `json:"file_name"`
    MimeType     string `json:"mime_type"`
}
```

### 3. Handler Implementation Pattern

```go
// Example: Sales Order Print Handler

func (h *SalesOrderHandler) Print(c *gin.Context) {
    id := c.Param("id")

    // 1. Fetch sales order
    salesOrder, err := h.usecase.GetByID(c.Request.Context(), id)
    if err != nil {
        c.HTML(http.StatusInternalServerError, "error.html", gin.H{
            "error": err.Error(),
        })
        return
    }

    // 2. Fetch creator's signature
    var signatureData *dto.EmployeeSignaturePrintDTO
    if salesOrder.CreatedBy != "" {
        // Get employee ID from user ID
        employeeID := h.getEmployeeIDFromUserID(c.Request.Context(), salesOrder.CreatedBy)
        if employeeID != "" {
            signatureData, _ = h.employeeUsecase.GetEmployeeSignatureForPrint(
                c.Request.Context(),
                employeeID,
            )
        }
    }

    // 3. Prepare print data
    printData := struct {
        // ... existing fields ...

        // Signature fields
        HasSignature     bool
        SignatureURL     string
        EmployeeName     string
        EmployeePosition string
        CreatedDate      string
    }{
        // ... populate existing fields ...

        // Signature
        HasSignature:     signatureData != nil,
        SignatureURL:     getFullURL(signatureData.SignatureURL),
        EmployeeName:     signatureData.EmployeeName,
        EmployeePosition: signatureData.Position,
        CreatedDate:      formatDate(salesOrder.CreatedAt),
    }

    c.HTML(http.StatusOK, "sales_order_print.html", printData)
}

// Helper function untuk convert relative URL ke full URL
func getFullURL(relativeURL string) string {
    if relativeURL == "" {
        return ""
    }
    if strings.HasPrefix(relativeURL, "http") {
        return relativeURL
    }
    baseURL := os.Getenv("API_BASE_URL")
    if baseURL == "" {
        baseURL = "http://localhost:8080"
    }
    return baseURL + relativeURL
}
```

## Frontend (HTML Templates)

### Template Pattern

```html
<!-- Signature Section untuk Option A -->
<div class="signature-section">
  <div class="signature-box">
    <p class="signature-label">Prepared by:</p>

    {{if .HasSignature}}
    <!-- Tampilkan signature digital -->
    <div class="signature-image-container">
      <img
        src="{{.SignatureURL}}"
        alt="{{.EmployeeName}} signature"
        class="signature-image"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
      />
      <div class="signature-fallback" style="display: none;">
        <div class="signature-line"></div>
      </div>
    </div>
    <p class="signature-name">{{.EmployeeName}}</p>
    <p class="signature-position">{{.EmployeePosition}}</p>
    <p class="signature-date">{{.CreatedDate}}</p>
    {{else}}
    <!-- Fallback: Blank line untuk manual sign -->
    <div class="signature-line"></div>
    <p class="signature-placeholder">(Signature Required)</p>
    {{end}}
  </div>
</div>

<style>
  .signature-section {
    margin-top: 60px;
    page-break-inside: avoid;
  }

  .signature-box {
    width: 220px;
    text-align: center;
  }

  .signature-label {
    font-size: 9pt;
    font-weight: 600;
    color: #333;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .signature-image-container {
    min-height: 50px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 8px;
  }

  .signature-image {
    max-height: 50px;
    max-width: 200px;
    object-fit: contain;
  }

  .signature-fallback {
    width: 100%;
  }

  .signature-line {
    border-bottom: 1px solid #333;
    height: 45px;
    width: 200px;
    margin: 0 auto;
  }

  .signature-placeholder {
    font-size: 8pt;
    color: #999;
    font-style: italic;
    margin-top: 5px;
  }

  .signature-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #000;
    border-top: 1.5px solid #333;
    padding-top: 6px;
    margin-top: 2px;
  }

  .signature-position {
    font-size: 8pt;
    color: #666;
    margin-top: 2px;
  }

  .signature-date {
    font-size: 7.5pt;
    color: #888;
    margin-top: 4px;
  }
</style>
```

## Implementation Steps

### Phase 1: Core Infrastructure (1-2 days)

- [ ] Tambahkan `GetEmployeeSignatureForPrint` method di usecase
- [ ] Buat DTO `EmployeeSignaturePrintDTO`
- [ ] Tambahkan helper function `getFullURL` di handler

### Phase 2: Sales Module (2-3 days)

- [ ] Update `quotation_print.html` - Add signature section
- [ ] Update `sales_order_print.html` - Add signature section
- [ ] Update `sales_payment_print.html` - Add signature section
- [ ] Update handler Quotation - Fetch creator signature
- [ ] Update handler Sales Order - Fetch creator signature
- [ ] Update handler Payment - Fetch creator signature

### Phase 3: Purchase Module (1-2 days)

- [ ] Update `purchase_order_print.html` - Add signature section
- [ ] Update handler Purchase Order - Fetch creator signature

### Phase 4: Finance Module (1-2 days)

- [ ] Update `journal_print.html` - Add signature section
- [ ] Update `payment_print.html` - Add signature section
- [ ] Update handler Journal - Fetch creator signature
- [ ] Update handler Payment - Fetch creator signature

### Phase 5: Testing (1 day)

- [ ] Test print dengan signature ada
- [ ] Test print tanpa signature (fallback)
- [ ] Test print dengan signature image error
- [ ] Test berbagai browser (Chrome, Firefox, Edge)

## Pros & Cons

### ✅ Pros

- **Simple**: Mudah diimplementasikan dan dimaintain
- **No workflow**: Tidak perlu approval workflow
- **Quick deployment**: Bisa deploy dalam 1 minggu
- **Low risk**: Tidak mengubah business process yang ada

### ❌ Cons

- **No approval**: Tidak ada verifikasi dari manager/approver
- **Creator only**: Hanya tanda tangan pembuat dokumen
- **Limited accountability**: Kurang accountability untuk dokumen penting

## When to Use

Gunakan Option A ketika:

- Dokumen bersifat informatif/intern
- Tidak memerlukan approval formal
- Speed lebih penting dari accountability
- Budget/timeline terbatas

## Future Enhancement Path

Jika nanti ingin upgrade ke Option B atau C:

1. Tambahkan `approved_by` field di database
2. Update handler untuk fetch approver signature
3. Update template untuk multiple signature boxes
4. Migrate existing data (jika ada)

---

**Document Version**: 1.0  
**Last Updated**: March 19, 2026  
**Status**: Ready for Implementation  
**Est. Effort**: 1 week (full-time developer)
