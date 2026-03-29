# Employee Signature on Print Documents - Option B: Dual Signature (Prepared + Approved)

## Overview

Implementasi dengan **dua tanda tangan**:

1. **Prepared by**: Karyawan yang membuat/memproses dokumen
2. **Approved by**: Manager/approver yang menyetujui dokumen

Pilihan ini memberikan checks and balances dan cocok untuk dokumen yang memerlukan approval formal seperti Sales Order, Purchase Order, dan Payment.

## Use Cases

| Document Type   | Prepared By   | Approved By         | Mandatory Approval |
| --------------- | ------------- | ------------------- | ------------------ |
| Sales Order     | Sales Rep     | Sales Manager       | Yes (> X amount)   |
| Purchase Order  | Procurement   | Procurement Manager | Yes                |
| Sales Invoice   | Admin         | Finance Manager     | Optional           |
| Payment Voucher | Finance Staff | Finance Manager     | Yes                |
| Journal Voucher | Accountant    | Finance Manager     | Yes (> X amount)   |
| Contract        | HR Staff      | HR Manager          | Yes                |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Document Print Flow (Dual Sig)          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  1. User Click "Print"                              │
│  2. Handler Fetch Document Data                     │
│  3. Get Creator Employee ID → Fetch Signature       │
│  4. Get Approver Employee ID → Fetch Signature      │
│  5. Render HTML with Both Signatures                │
└─────────────────────────────────────────────────────┘
```

## Database Changes

**Minimal changes** - Hanya menambahkan field untuk tracking approver:

```sql
-- Untuk dokumen yang memerlukan approval signature
-- Contoh: sales_orders
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- Untuk purchase_orders (jika belum ada)
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Untuk payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
```

## Backend Implementation

### 1. Enhanced Print DTO

```go
// internal/sales/domain/dto/sales_order_dto.go (atau file terpisah)

type SalesOrderPrintDTO struct {
    // ... existing fields ...

    // Prepared By (Creator)
    PreparedBy struct {
        HasSignature bool
        SignatureURL string
        EmployeeName string
        Position     string
        Date         string
    }

    // Approved By (Approver)
    ApprovedBy struct {
        HasSignature bool
        SignatureURL string
        EmployeeName string
        Position     string
        Date         string
        IsApproved   bool
    }
}
```

### 2. Handler Implementation

```go
// internal/sales/presentation/handler/sales_order_handler.go

func (h *SalesOrderHandler) Print(c *gin.Context) {
    id := c.Param("id")

    // Fetch document
    salesOrder, err := h.usecase.GetByID(c.Request.Context(), id)
    if err != nil {
        c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
        return
    }

    // Prepare data
    data := SalesOrderPrintDTO{
        // ... populate existing fields ...
    }

    // 1. Get Prepared By (Creator) Signature
    data.PreparedBy = h.getSignerData(c, salesOrder.CreatedBy)

    // 2. Get Approved By (Approver) Signature
    if salesOrder.ApprovedBy != "" && salesOrder.ApprovalStatus == "approved" {
        data.ApprovedBy = h.getSignerData(c, salesOrder.ApprovedBy)
        data.ApprovedBy.IsApproved = true
    }

    c.HTML(http.StatusOK, "sales_order_print.html", data)
}

// Helper method untuk fetch signer data
func (h *SalesOrderHandler) getSignerData(c *gin.Context, userID string) struct {
    HasSignature bool
    SignatureURL string
    EmployeeName string
    Position     string
    Date         string
} {
    result := struct {
        HasSignature bool
        SignatureURL string
        EmployeeName string
        Position     string
        Date         string
    }{}

    if userID == "" {
        return result
    }

    // Get employee ID from user
    employeeID := h.getEmployeeIDFromUserID(c.Request.Context(), userID)
    if employeeID == "" {
        return result
    }

    // Get employee details
    employee, err := h.employeeUsecase.GetByID(c.Request.Context(), employeeID)
    if err != nil {
        return result
    }

    result.EmployeeName = employee.Name
    result.Position = employee.JobPosition.Name

    // Get signature
    signature, err := h.employeeUsecase.GetEmployeeSignature(c.Request.Context(), employeeID)
    if err == nil && signature != nil {
        result.HasSignature = true
        result.SignatureURL = getFullURL(signature.FileURL)
    }

    return result
}
```

### 3. Approval Endpoint dengan Signature Tracking

```go
// Approve handler yang mencatat approver

func (h *SalesOrderHandler) Approve(c *gin.Context) {
    id := c.Param("id")
    userID := c.GetString("user_id")

    // Update sales order
    updates := map[string]interface{}{
        "approval_status": "approved",
        "approved_by":     userID,
        "approved_at":     time.Now(),
    }

    err := h.usecase.Update(c.Request.Context(), id, updates)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Sales order approved successfully",
    })
}
```

## Frontend (HTML Templates)

### Dual Signature Template

```html
<!-- Dual Signature Section -->
<div class="signatures-container">
  <!-- Prepared By -->
  <div class="signature-box prepared-by">
    <p class="signature-label">Prepared by:</p>

    {{if .PreparedBy.HasSignature}}
    <div class="signature-image-wrapper">
      <img
        src="{{.PreparedBy.SignatureURL}}"
        alt="{{.PreparedBy.EmployeeName}}"
        class="signature-image"
      />
    </div>
    {{else}}
    <div class="signature-placeholder">
      <div class="signature-line"></div>
    </div>
    {{end}}

    <p class="signature-name">{{.PreparedBy.EmployeeName}}</p>
    <p class="signature-position">{{.PreparedBy.Position}}</p>
    {{if .PreparedBy.Date}}
    <p class="signature-date">{{.PreparedBy.Date}}</p>
    {{end}}
  </div>

  <!-- Spacer -->
  <div class="signature-spacer"></div>

  <!-- Approved By -->
  <div class="signature-box approved-by">
    <p class="signature-label">Approved by:</p>

    {{if .ApprovedBy.IsApproved}} {{if .ApprovedBy.HasSignature}}
    <div class="signature-image-wrapper">
      <img
        src="{{.ApprovedBy.SignatureURL}}"
        alt="{{.ApprovedBy.EmployeeName}}"
        class="signature-image"
      />
    </div>
    {{else}}
    <div class="signature-placeholder">
      <div class="signature-line approved"></div>
    </div>
    {{end}}

    <p class="signature-name">{{.ApprovedBy.EmployeeName}}</p>
    <p class="signature-position">{{.ApprovedBy.Position}}</p>
    {{if .ApprovedBy.Date}}
    <p class="signature-date">{{.ApprovedBy.Date}}</p>
    {{end}} {{else}}
    <div class="not-approved-badge">
      <span>Pending Approval</span>
    </div>
    <div class="signature-placeholder">
      <div class="signature-line pending"></div>
    </div>
    {{end}}
  </div>
</div>

<style>
  .signatures-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 50px;
    page-break-inside: avoid;
    padding: 0 20px;
  }

  .signature-box {
    width: 200px;
    text-align: center;
  }

  .signature-spacer {
    flex: 1;
    max-width: 100px;
  }

  .signature-label {
    font-size: 9pt;
    font-weight: 700;
    color: #333;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .signature-image-wrapper {
    min-height: 55px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 10px;
  }

  .signature-image {
    max-height: 55px;
    max-width: 180px;
    object-fit: contain;
  }

  .signature-placeholder {
    min-height: 55px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 10px;
  }

  .signature-line {
    border-bottom: 1.5px solid #333;
    height: 50px;
    width: 180px;
  }

  .signature-line.approved {
    border-color: #22c55e; /* Green for approved */
  }

  .signature-line.pending {
    border-color: #f59e0b; /* Orange for pending */
    border-style: dashed;
  }

  .not-approved-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 600;
    margin-bottom: 8px;
    display: inline-block;
  }

  .signature-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #000;
    border-top: 1.5px solid #333;
    padding-top: 6px;
    margin-top: 4px;
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

  /* Print-specific styles */
  @media print {
    .not-approved-badge {
      background: #fff;
      border: 1px solid #f59e0b;
    }
  }
</style>
```

## Implementation Steps

### Phase 1: Database & Core (2 days)

- [ ] Migration: Tambahkan `approved_by`, `approved_at` fields
- [ ] Update DTOs untuk print data
- [ ] Helper function untuk fetch dual signature
- [ ] Update approval endpoints untuk mencatat approver

### Phase 2: Sales Module (3 days)

- [ ] Update `quotation_print.html` - Prepared + Optional Approved
- [ ] Update `sales_order_print.html` - Prepared + Approved
- [ ] Update `sales_payment_print.html` - Prepared + Approved
- [ ] Update handlers untuk fetch dual signature
- [ ] Update approval workflow (jika belum ada)

### Phase 3: Purchase Module (2 days)

- [ ] Update `purchase_order_print.html`
- [ ] Update handlers
- [ ] Implement approval workflow (jika belum ada)

### Phase 4: Finance Module (2 days)

- [ ] Update `journal_voucher_print.html`
- [ ] Update `payment_voucher_print.html`
- [ ] Update handlers
- [ ] Implement amount-based approval

### Phase 5: UI Enhancement (2 days)

- [ ] Tambahkan approval status indicator di document list
- [ ] Tambahkan "Print" button dengan warning jika belum approved
- [ ] Tambahkan approval workflow UI (jika belum ada)

### Phase 6: Testing (2 days)

- [ ] Test print dengan prepared + approved signatures
- [ ] Test print dengan prepared only (pending approval)
- [ ] Test approval workflow
- [ ] Test email notifications (jika ada)
- [ ] Test amount-based approval triggers

## Approval Workflow Integration

### Minimum Requirements

Setiap dokumen yang menggunakan Option B harus memiliki:

1. **Status Tracking**:

   ```go
   type DocumentStatus string
   const (
       StatusDraft     DocumentStatus = "draft"
       StatusPending   DocumentStatus = "pending"
       StatusApproved  DocumentStatus = "approved"
       StatusRejected  DocumentStatus = "rejected"
   )
   ```

2. **Permission Check**:

   ```go
   // Middleware atau check di handler
   func CanApprove(userID string, documentType string, amount float64) bool {
       // Check permission
       // Check amount threshold
       // Return true/false
   }
   ```

3. **Audit Trail**:
   ```go
   type ApprovalAudit struct {
       DocumentID   string
       DocumentType string
       Action       string // 'approve', 'reject'
       ActorID      string
       ActorName    string
       Timestamp    time.Time
       Notes        string
   }
   ```

## Pros & Cons

### ✅ Pros

- **Accountability**: Clear separation of responsibility
- **Checks & balances**: Tidak bisa sembarangan print dokumen penting
- **Audit trail**: Jelas siapa yang prepare dan siapa yang approve
- **Professional**: Dokumen terlihat lebih formal dan official

### ❌ Cons

- **Complexity**: Lebih kompleks dari Option A
- **Approval bottleneck**: Dokumen tidak bisa diprint sebelum di-approve
- **More tables**: Perlu update beberapa tabel database
- **Workflow required**: Harus implementasi approval workflow

## When to Use

Gunakan Option B ketika:

- Dokumen bersifat legal/binding
- Memerlukan authorization formal
- Ada segregation of duties requirement
- Dokumen akan diberikan ke pihak eksternal (customer, vendor)

## Migration dari Option A

Jika sudah implementasi Option A dan ingin upgrade ke Option B:

1. **Database Migration**:

   ```sql
   -- Tambahkan approval fields
   ALTER TABLE ... ADD COLUMN approved_by UUID;
   ```

2. **Data Migration**:

   ```sql
   -- Set semua existing document sebagai "auto-approved"
   UPDATE sales_orders
   SET approved_by = created_by,
       approved_at = created_at,
       approval_status = 'approved';
   ```

3. **Template Update**:
   - Update HTML template untuk support dual signature
   - Fallback untuk document lama (prepared = approved)

4. **Rollback Plan**:
   - Simpan backup schema sebelum migration
   - Buat script untuk revert jika terjadi masalah

---

**Document Version**: 1.0  
**Last Updated**: March 19, 2026  
**Status**: Ready for Implementation  
**Est. Effort**: 2-3 weeks (full-time developer)  
**Pre-requisites**: Approval workflow system
