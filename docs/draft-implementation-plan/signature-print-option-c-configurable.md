# Employee Signature on Print Documents - Option C: Configurable Multiple Signatures

## Overview

Implementasi **flexible dan configurable** yang memungkinkan 1-3 tanda tangan per dokumen, dengan konfigurasi per document type. Pilihan ini paling scalable dan cocok untuk enterprise dengan berbagai jenis dokumen dan approval hierarchy yang kompleks.

## Konsep Configurable

```yaml
# Contoh konfigurasi (bisa di database atau config file)
signature_config:
  sales_quotation:
    enabled: true
    signatures:
      - role: "prepared_by"
        label: "Prepared by"
        required: true
        show_if_no_signature: true
      - role: "approved_by"
        label: "Approved by"
        required: false
        show_if_no_signature: true

  sales_order:
    enabled: true
    min_amount_for_approval: 10000000 # 10 juta
    signatures:
      - role: "prepared_by"
        label: "Prepared by"
        required: true
      - role: "manager"
        label: "Sales Manager"
        required: true
        condition: "amount > min_amount"
      - role: "director"
        label: "Director"
        required: true
        condition: "amount > 100000000" # 100 juta

  purchase_order:
    enabled: true
    signatures:
      - role: "prepared_by"
        label: "Prepared by"
        required: true
      - role: "department_head"
        label: "Dept. Head"
        required: true
      - role: "finance"
        label: "Finance Approval"
        required: true
```

## Use Cases

| Document Type   | Max Signatures | Configuration                             |
| --------------- | -------------- | ----------------------------------------- |
| Sales Quotation | 2              | Prepared + Optional Approved              |
| Sales Order     | 2-3            | Prepared + Manager (+ Director for large) |
| Purchase Order  | 3              | Requester + Dept Head + Finance           |
| Payment Voucher | 2-3            | Prepared + Manager + Director             |
| Contract        | 3              | HR + Legal + Director                     |
| Journal Entry   | 2              | Prepared + Reviewer                       |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Configurable Signature System                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Config Mgr  │   │  Doc Handler │   │  Sig Service │
│  (Rules)     │   │  (Orchestrate)│   │  (Fetch)     │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   HTML Template     │
              │   (Dynamic Render)  │
              └─────────────────────┘
```

## Database Schema

### 1. Signature Configuration Table

```sql
-- Master konfigurasi signature per document type
CREATE TABLE print_signature_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(50) UNIQUE NOT NULL, -- 'sales_order', 'purchase_order'
    document_name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'sales', 'purchase', 'finance'

    -- Global settings
    is_enabled BOOLEAN DEFAULT true,
    min_amount_for_approval DECIMAL(15,2), -- Optional threshold
    max_signatures INTEGER DEFAULT 2,

    -- Layout settings
    layout_type VARCHAR(20) DEFAULT 'horizontal', -- 'horizontal', 'vertical'
    show_date BOOLEAN DEFAULT true,
    show_position BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual signature slots per config
CREATE TABLE print_signature_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES print_signature_configs(id) ON DELETE CASCADE,

    slot_order INTEGER NOT NULL, -- 1, 2, 3
    role_key VARCHAR(50) NOT NULL, -- 'prepared_by', 'manager', 'director'
    label VARCHAR(100) NOT NULL, -- "Prepared by", "Approved by"

    -- Requirements
    is_required BOOLEAN DEFAULT true,
    condition_expression TEXT, -- JSON logic atau SQL-like condition
    -- Contoh: '{"field": "amount", "operator": ">", "value": 10000000}'

    -- Fallback behavior
    show_if_no_signature BOOLEAN DEFAULT true,
    allow_manual_sign BOOLEAN DEFAULT true, -- Tampilkan garis untuk manual sign

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sig_slots_config ON print_signature_slots(config_id);
```

### 2. Document Signature Tracking

```sql
-- Tracking siapa yang sign di dokumen mana (sudah ada dari plan sebelumnya)
-- document_signatures table (reusable)

-- Tambahan: Document-level approval status
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS
    signature_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'partial', 'complete'
```

## Backend Implementation

### 1. Configuration Service

```go
// internal/core/domain/service/signature_config_service.go

type SignatureConfigService interface {
    // CRUD Config
    GetConfig(ctx context.Context, documentType string) (*PrintSignatureConfig, error)
    GetAllConfigs(ctx context.Context) ([]PrintSignatureConfig, error)
    CreateConfig(ctx context.Context, config *PrintSignatureConfig) error
    UpdateConfig(ctx context.Context, config *PrintSignatureConfig) error

    // Business logic
    GetRequiredSignatures(ctx context.Context, documentType string, documentData map[string]interface{}) ([]SignatureSlot, error)
    ValidateSignatureCompleteness(ctx context.Context, documentType string, docID string) (bool, []string, error)

    // Admin
    DuplicateConfig(ctx context.Context, sourceType string, targetType string) error
}

type PrintSignatureConfig struct {
    ID                 string
    DocumentType       string
    DocumentName       string
    Module             string
    IsEnabled          bool
    MinAmountForApproval float64
    MaxSignatures      int
    LayoutType         string
    ShowDate           bool
    ShowPosition       bool
    Slots              []SignatureSlot
}

type SignatureSlot struct {
    ID                   string
    SlotOrder            int
    RoleKey              string
    Label                string
    IsRequired           bool
    ConditionExpression  string
    ShowIfNoSignature    bool
    AllowManualSign      bool
}
```

### 2. Dynamic Print Service

```go
// internal/core/domain/service/dynamic_print_service.go

type DynamicPrintService interface {
    // Generate print data dengan signatures
    GeneratePrintData(ctx context.Context, req PrintDataRequest) (*PrintDataResponse, error)

    // Preview sebelum print
    PreviewDocument(ctx context.Context, req PrintPreviewRequest) (string, error)

    // Check print readiness
    CanPrint(ctx context.Context, documentType string, docID string) (bool, []string, error)
}

type PrintDataRequest struct {
    DocumentType   string
    DocumentID     string
    DocumentData   map[string]interface{} // Dynamic data
    UserID         string
    IncludeSignatures bool
}

type PrintDataResponse struct {
    Document       interface{}            // Original document data
    Signatures     []SignatureSlotData    // Dynamic signatures
    Config         PrintSignatureConfig   // Config used
    Meta           PrintMeta              // Timestamps, etc
}

type SignatureSlotData struct {
    SlotOrder        int
    RoleKey          string
    Label            string

    // Signer info (populated dynamically)
    IsFilled         bool
    EmployeeID       string
    EmployeeName     string
    Position         string
    SignatureURL     string
    SignedAt         time.Time

    // UI behavior
    ShowPlaceholder  bool
    IsRequired       bool
}
```

### 3. Handler Implementation

```go
// Generic handler untuk configurable print

func (h *DocumentHandler) PrintWithSignatures(c *gin.Context) {
    docType := c.Param("doc_type") // 'sales_order', 'purchase_order', etc
    docID := c.Param("id")

    // 1. Get config
    config, err := h.sigConfigService.GetConfig(c.Request.Context(), docType)
    if err != nil {
        c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": "Config not found"})
        return
    }

    if !config.IsEnabled {
        // Fallback ke print tanpa signature
        h.PrintWithoutSignature(c, docType, docID)
        return
    }

    // 2. Get required signatures untuk dokumen ini
    documentData := h.fetchDocumentData(c, docType, docID)
    requiredSigs, err := h.sigConfigService.GetRequiredSignatures(
        c.Request.Context(),
        docType,
        documentData,
    )
    if err != nil {
        c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
        return
    }

    // 3. Fetch actual signature data
    signatures := make([]SignatureSlotData, len(requiredSigs))
    for i, slot := range requiredSigs {
        sigData := h.fetchSignatureForSlot(c, docType, docID, slot)
        signatures[i] = sigData
    }

    // 4. Prepare response
    response := PrintDataResponse{
        Document:   documentData,
        Signatures: signatures,
        Config:     *config,
        Meta: PrintMeta{
            PrintedAt: time.Now(),
            PrintedBy: c.GetString("user_id"),
        },
    }

    // 5. Render dengan template yang sesuai
    templateName := fmt.Sprintf("%s_print.html", docType)
    c.HTML(http.StatusOK, templateName, response)
}

func (h *DocumentHandler) fetchSignatureForSlot(
    c *gin.Context,
    docType string,
    docID string,
    slot SignatureSlot,
) SignatureSlotData {
    data := SignatureSlotData{
        SlotOrder:       slot.SlotOrder,
        RoleKey:         slot.RoleKey,
        Label:           slot.Label,
        ShowPlaceholder: slot.ShowIfNoSignature,
        IsRequired:      slot.IsRequired,
    }

    // Lookup berdasarkan role key
    var userID string
    switch slot.RoleKey {
    case "prepared_by", "creator":
        userID = h.getDocumentCreator(c, docType, docID)
    case "approved_by", "manager":
        userID = h.getDocumentApprover(c, docType, docID)
    case "reviewer":
        userID = h.getDocumentReviewer(c, docType, docID)
    case "director":
        userID = h.getDirectorForDocument(c, docType, docID)
    default:
        // Custom logic untuk role lain
        userID = h.resolveRoleToUser(c, docType, docID, slot.RoleKey)
    }

    if userID == "" {
        return data
    }

    // Fetch employee dan signature
    employeeID := h.getEmployeeIDFromUserID(c, userID)
    if employeeID == "" {
        return data
    }

    employee, _ := h.employeeUsecase.GetByID(c, employeeID)
    if employee != nil {
        data.EmployeeName = employee.Name
        data.Position = employee.JobPosition.Name
    }

    signature, _ := h.employeeUsecase.GetEmployeeSignature(c, employeeID)
    if signature != nil {
        data.IsFilled = true
        data.EmployeeID = employeeID
        data.SignatureURL = getFullURL(signature.FileURL)
        // data.SignedAt = ... dari document_signatures table
    }

    return data
}
```

### 4. Template dengan Dynamic Rendering

```html
<!-- Template yang bisa handle 1-3 signatures secara dinamis -->

<div class="signatures-wrapper" data-layout="{{.Config.LayoutType}}">
  {{range .Signatures}}
  <div
    class="signature-slot {{if .IsFilled}}filled{{else}}empty{{end}}"
    data-order="{{.SlotOrder}}"
    data-required="{{.IsRequired}}"
  >
    <p class="signature-label">{{.Label}}</p>

    {{if .IsFilled}}
    <!-- Signature ada -->
    <div class="signature-content">
      <div class="signature-image-container">
        <img
          src="{{.SignatureURL}}"
          alt="{{.EmployeeName}}"
          class="signature-image"
          onerror="this.classList.add('error');"
        />
      </div>
      <p class="signature-name">{{.EmployeeName}}</p>
      {{if $.Config.ShowPosition}}
      <p class="signature-position">{{.Position}}</p>
      {{end}} {{if $.Config.ShowDate}}
      <p class="signature-date">{{formatDate .SignedAt}}</p>
      {{end}}
    </div>

    {{else if .ShowPlaceholder}}
    <!-- Signature kosong, tampilkan placeholder -->
    <div class="signature-placeholder">
      <div class="signature-line {{if .IsRequired}}required{{end}}"></div>
      {{if .IsRequired}}
      <span class="required-badge">Required</span>
      {{end}}
    </div>

    {{else}}
    <!-- Tidak tampilkan apa-apa -->
    <div class="signature-hidden"></div>
    {{end}}
  </div>
  {{end}}
</div>

<style>
  /* Dynamic layout styles */
  .signatures-wrapper {
    display: flex;
    gap: 40px;
    margin-top: 50px;
    page-break-inside: avoid;
  }

  .signatures-wrapper[data-layout="horizontal"] {
    flex-direction: row;
    justify-content: space-between;
  }

  .signatures-wrapper[data-layout="vertical"] {
    flex-direction: column;
    align-items: flex-start;
  }

  .signatures-wrapper[data-layout="grid"] {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
  }

  .signature-slot {
    flex: 1;
    max-width: 220px;
    text-align: center;
  }

  .signature-slot.filled {
    /* Styles untuk slot yang terisi */
  }

  .signature-slot.empty {
    /* Styles untuk slot kosong */
  }

  .signature-slot[data-required="true"] .signature-label::after {
    content: "*";
    color: #dc2626;
    margin-left: 4px;
  }

  .signature-label {
    font-size: 9pt;
    font-weight: 700;
    color: #333;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .signature-content {
    min-height: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
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
    max-width: 180px;
    object-fit: contain;
  }

  .signature-image.error {
    display: none;
  }

  .signature-placeholder {
    min-height: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    position: relative;
  }

  .signature-line {
    border-bottom: 1.5px solid #999;
    height: 50px;
    width: 180px;
    margin-bottom: 8px;
  }

  .signature-line.required {
    border-color: #333;
    border-bottom-style: dashed;
  }

  .required-badge {
    font-size: 7pt;
    color: #dc2626;
    background: #fef2f2;
    padding: 2px 6px;
    border-radius: 3px;
    position: absolute;
    top: 0;
  }

  .signature-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #000;
    border-top: 1.5px solid #333;
    padding-top: 6px;
    margin-top: 4px;
    width: 100%;
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

  .signature-hidden {
    display: none;
  }
</style>
```

## Admin Configuration UI

### Configuration Management

```tsx
// Admin panel untuk konfigurasi signature

interface SignatureConfigManagerProps {
  module: "sales" | "purchase" | "finance" | "hrd";
}

export function SignatureConfigManager({
  module,
}: SignatureConfigManagerProps) {
  const { data: configs } = useSignatureConfigs(module);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Print Signature Configuration</CardTitle>
          <CardDescription>
            Configure digital signatures for printed documents in {module}{" "}
            module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signatures</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {config.documentName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.isEnabled ? "default" : "secondary"}>
                      {config.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.slots.length} signature(s)</TableCell>
                  <TableCell className="capitalize">
                    {config.layoutType}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Configuration Dialog
interface ConfigDialogProps {
  config: PrintSignatureConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignatureConfigDialog({
  config,
  open,
  onOpenChange,
}: ConfigDialogProps) {
  const [slots, setSlots] = useState(config.slots);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {config.documentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Global Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layout Type</Label>
              <Select defaultValue={config.layoutType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="grid">Grid (3 columns)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min Amount for Approval</Label>
              <Input
                type="number"
                defaultValue={config.minAmountForApproval}
                placeholder="0 for no minimum"
              />
            </div>
          </div>

          {/* Signature Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Signature Slots</Label>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </div>

            {slots.map((slot, index) => (
              <Card key={slot.id}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input defaultValue={slot.label} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role Key</Label>
                      <Input defaultValue={slot.roleKey} />
                    </div>
                    <div className="flex items-center gap-4 pt-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked={slot.isRequired} />
                        <Label>Required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked={slot.showIfNoSignature} />
                        <Label>Show Empty</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Implementation Steps

### Phase 1: Core Infrastructure (1 week)

- [ ] Create database tables (`print_signature_configs`, `print_signature_slots`)
- [ ] Create SignatureConfigService
- [ ] Create DynamicPrintService
- [ ] Create configuration DTOs
- [ ] Seed default configurations untuk semua document types

### Phase 2: Backend Services (1 week)

- [ ] Implement config CRUD API
- [ ] Implement dynamic signature fetch logic
- [ ] Implement role resolution (creator, approver, manager, director)
- [ ] Implement amount-based conditions
- [ ] Create generic print handler

### Phase 3: Frontend Templates (1 week)

- [ ] Create reusable signature template component
- [ ] Update existing print templates (quotation, order, payment)
- [ ] Implement dynamic layout rendering (horizontal, vertical, grid)
- [ ] Handle edge cases (no signature, error loading, etc)

### Phase 4: Admin UI (3-4 days)

- [ ] Configuration list page
- [ ] Configuration editor dialog
- [ ] Role key selector
- [ ] Condition builder (simple)
- [ ] Preview mode

### Phase 5: Module Integration (1 week)

- [ ] Sales module integration
- [ ] Purchase module integration
- [ ] Finance module integration
- [ ] HRD module integration

### Phase 6: Testing & Optimization (3-4 days)

- [ ] Unit tests untuk config service
- [ ] Integration tests untuk print flow
- [ ] UI tests untuk admin panel
- [ ] Performance testing dengan banyak signatures

## Migration Strategy

### Dari Option A atau B

1. **Extract existing configs**:

   ```sql
   -- Convert existing implicit configs ke explicit config table
   INSERT INTO print_signature_configs (document_type, document_name, ...)
   SELECT 'sales_order', 'Sales Order', ...;
   ```

2. **Backfill signature tracking**:

   ```sql
   -- Populate document_signatures untuk existing approved documents
   ```

3. **Gradual rollout**:
   - Enable per module
   - Start dengan module non-critical
   - Monitor dan adjust

## Pros & Cons

### ✅ Pros

- **Maximum flexibility**: Bisa konfigurasi per document type
- **Future-proof**: Mudah menambah document type baru
- **Admin-friendly**: Admin bisa atur tanpa coding
- **Scalable**: Support complex approval hierarchies
- **Multi-tenant ready**: Config bisa berbeda per company

### ❌ Cons

- **Complexity**: Lebih kompleks dari Option A & B
- **Development time**: Butuh waktu lebih lama (4-5 minggu)
- **Maintenance**: Perlu maintain config UI dan logic
- **Learning curve**: Admin perlu belajar cara konfigurasi

## When to Use

Gunakan Option C ketika:

- Organization besar dengan banyak document types
- Approval hierarchy yang kompleks
- Requirement yang sering berubah
- Multi-tenant atau multi-company setup
- Butuh flexibility maksimum

## Cost-Benefit Analysis

| Factor           | Option A | Option B   | Option C    |
| ---------------- | -------- | ---------- | ----------- |
| Development Time | 1 minggu | 2-3 minggu | 4-5 minggu  |
| Maintenance      | Low      | Medium     | Medium-High |
| Flexibility      | Low      | Medium     | High        |
| Scalability      | Low      | Medium     | High        |
| User Training    | Minimal  | Low        | Medium      |

---

**Document Version**: 1.0  
**Last Updated**: March 19, 2026  
**Status**: Ready for Implementation  
**Est. Effort**: 4-5 weeks (full-time developer + admin UI)  
**Recommended for**: Enterprise dengan kompleksitas tinggi
