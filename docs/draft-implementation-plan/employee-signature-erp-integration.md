# Employee Signature ERP Integration Implementation Plan

## Overview

This document outlines the implementation plan for integrating Employee Digital Signature with various ERP modules including HRD, Finance, Sales, and CRM.

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERP Modules                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  HRD Module  │  │ Finance      │  │ Sales        │  │ CRM          │     │
│  │  - Leave Req │  │ - Payment    │  │ - Quotation  │  │ - Visit Rep  │     │
│  │  - Payroll   │  │ - Journal    │  │ - Order      │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │               │
│         └─────────────────┴────────┬────────┴─────────────────┘               │
│                                    │                                          │
│                          ┌─────────▼──────────┐                               │
│                          │ Document Signing   │                               │
│                          │ Service            │                               │
│                          │ (Middleware)       │                               │
│                          └─────────┬──────────┘                               │
│                                    │                                          │
│                          ┌─────────▼──────────┐                               │
│                          │ Employee Signature │                               │
│                          │ Core Service       │                               │
│                          └────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
User Action → Permission Check → Signature Validation → Document Update → Audit Trail
     │              │                    │                   │              │
     ▼              ▼                    ▼                   ▼              ▼
 Click      Has approver      Employee has         Update status    Log signature
 Approve    permission?       valid signature?     & signature      reference
```

## 2. Database Schema

### 2.1 Core Tables

#### document_signatures

```sql
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document Reference
    document_type VARCHAR(50) NOT NULL, -- 'leave_request', 'sales_quotation', 'payment', 'visit_report'
    document_id UUID NOT NULL,

    -- Signer Information
    employee_id UUID NOT NULL REFERENCES employees(id),
    signature_id UUID NOT NULL REFERENCES employee_signatures(id),

    -- Signing Context
    action VARCHAR(50) NOT NULL, -- 'approve', 'reject', 'verify', 'acknowledge', 'review'
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    signed_by_user_id UUID REFERENCES users(id),

    -- Metadata
    notes TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_action CHECK (action IN ('approve', 'reject', 'verify', 'acknowledge', 'review'))
);

-- Indexes
CREATE INDEX idx_doc_sigs_document ON document_signatures(document_type, document_id);
CREATE INDEX idx_doc_sigs_employee ON document_signatures(employee_id);
CREATE INDEX idx_doc_sigs_type_action ON document_signatures(document_type, action);
CREATE INDEX idx_doc_sigs_signed_at ON document_signatures(signed_at);
```

#### signature_workflows (for complex workflows)

```sql
CREATE TABLE signature_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow Definition
    workflow_code VARCHAR(50) UNIQUE NOT NULL, -- 'payment_approval', 'leave_approval'
    workflow_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Module & Document Type
    module VARCHAR(50) NOT NULL, -- 'hrd', 'finance', 'sales', 'crm'
    document_type VARCHAR(50) NOT NULL,

    -- Configuration
    is_active BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT false, -- Whether signature is required
    allow_bulk_signing BOOLEAN DEFAULT false,

    -- Multi-level settings
    max_levels INTEGER DEFAULT 1,
    require_all_levels BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow levels
CREATE TABLE signature_workflow_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES signature_workflows(id),

    level_order INTEGER NOT NULL, -- 1, 2, 3
    level_name VARCHAR(100) NOT NULL, -- 'Manager Approval', 'Finance Head Approval'

    -- Who can approve at this level
    permission_code VARCHAR(100), -- e.g., 'payment.approve.level1'
    min_amount DECIMAL(15,2), -- Minimum amount for this level
    max_amount DECIMAL(15,2), -- Maximum amount for this level

    -- Signature settings
    require_signature BOOLEAN DEFAULT true,
    can_skip_if_no_sig BOOLEAN DEFAULT false, -- Allow approval without signature if approver doesn't have one

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Module-Specific Schema Updates

#### HRD Module

```sql
-- Add to leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejected_signature_id UUID REFERENCES document_signatures(id);

-- Add to overtime_requests table
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);

-- Add to payroll_records table (for acknowledgment)
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employee_ack_signature_id UUID REFERENCES document_signatures(id);
```

#### Finance Module

```sql
-- Add to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS manager_signature_id UUID REFERENCES document_signatures(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS finance_head_signature_id UUID REFERENCES document_signatures(id);

-- Add to journals table
ALTER TABLE journals ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);

-- Add to budgets table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);
```

#### Sales Module

```sql
-- Add to sales_quotations table
ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);
ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS discount_approved_signature_id UUID REFERENCES document_signatures(id);

-- Add to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approval_signature_id UUID REFERENCES document_signatures(id);
```

#### CRM Module

```sql
-- Add to visit_reports table
ALTER TABLE visit_reports ADD COLUMN IF NOT EXISTS manager_signature_id UUID REFERENCES document_signatures(id);
ALTER TABLE visit_reports ADD COLUMN IF NOT EXISTS employee_signature_id UUID REFERENCES document_signatures(id);
```

## 3. Backend Implementation

### 3.1 Core Service Layer

#### Document Signing Service Interface

```go
// Package: internal/core/domain/service/document_signing.go

package service

import (
    "context"
    "time"
)

// DocumentSigningService handles digital signature operations across all modules
type DocumentSigningService interface {
    // Core Operations
    SignDocument(ctx context.Context, req SignDocumentRequest) (*DocumentSignature, error)
    VerifyDocumentSignature(ctx context.Context, docType string, docID string) (*SignatureVerification, error)
    GetDocumentSignatures(ctx context.Context, docType string, docID string) ([]DocumentSignature, error)
    RevokeSignature(ctx context.Context, signatureID string, revokedBy string) error

    // Validation
    ValidateSignerEligibility(ctx context.Context, employeeID string, docType string, action string) error
    CheckSignatureExists(ctx context.Context, employeeID string) (bool, error)

    // Workflow
    GetWorkflowForDocument(ctx context.Context, docType string) (*SignatureWorkflow, error)
    GetRequiredApprovers(ctx context.Context, docType string, amount float64) ([]WorkflowLevel, error)
}

type SignDocumentRequest struct {
    DocumentType  string  // 'leave_request', 'payment', 'sales_quotation'
    DocumentID    string
    EmployeeID    string  // Must have valid signature
    UserID        string  // Current user performing the action
    Action        string  // 'approve', 'reject', 'verify', 'acknowledge'
    Notes         string  // Optional notes
    IPAddress     string
    UserAgent     string
}

type DocumentSignature struct {
    ID           string
    DocumentType string
    DocumentID   string
    EmployeeID   string
    SignatureID  string
    Action       string
    SignedAt     time.Time
    SignedBy     string
    Notes        string
    IPAddress    string

    // Embedded data
    EmployeeName    string
    SignatureFileID string
}

type SignatureVerification struct {
    IsValid      bool
    Signature    *DocumentSignature
    SignedAt     time.Time
    DaysSince    int
    Status       string // 'valid', 'expired', 'revoked'
}
```

#### Implementation Structure

```
internal/core/
├── domain/
│   └── service/
│       └── document_signing.go           # Interface
├── infrastructure/
│   └── service/
│       └── document_signing_service.go   # Implementation
└── middleware/
    └── signature_middleware.go           # Gin middleware
```

### 3.2 Middleware for Signature Validation

```go
// internal/core/middleware/signature_middleware.go

package middleware

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

// RequireSignature ensures the user has a valid employee signature
func RequireSignature(docType string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "User not authenticated",
            })
            return
        }

        // Get employee ID from user
        employeeID := getEmployeeIDFromUser(userID.(string))
        if employeeID == "" {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error": "User is not linked to an employee record",
                "code": "EMPLOYEE_LINK_REQUIRED",
            })
            return
        }

        // Check if employee has valid signature
        hasSignature, err := signatureService.CheckSignatureExists(c, employeeID)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                "error": "Failed to verify signature",
            })
            return
        }

        if !hasSignature {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error": "Digital signature required",
                "code": "SIGNATURE_REQUIRED",
                "message": "Please set up your digital signature in your profile before performing this action",
                "action_url": "/employee/signature",
            })
            return
        }

        // Store employee ID for use in handlers
        c.Set("employee_id", employeeID)
        c.Next()
    }
}

// OptionalSignature allows action without signature but warns
func OptionalSignature() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, _ := c.Get("user_id")
        employeeID := getEmployeeIDFromUser(userID.(string))

        hasSignature, _ := signatureService.CheckSignatureExists(c, employeeID)
        c.Set("has_signature", hasSignature)
        c.Set("employee_id", employeeID)
        c.Next()
    }
}
```

### 3.3 Module Integration

#### HRD Module - Leave Request

```go
// internal/hrd/presentation/handler/leave_request_handler.go

func (h *LeaveRequestHandler) Approve(c *gin.Context) {
    id := c.Param("id")
    employeeID := c.GetString("employee_id") // From middleware

    var req dto.ApproveLeaveRequestDTO
    if err := c.ShouldBindJSON(&req); err != nil {
        // handle error
    }

    // The actual approval logic in usecase
    result, err := h.leaveRequestUsecase.ApproveWithSignature(c.Request.Context(), id, employeeID, &req)
    if err != nil {
        // handle error
    }

    response.SuccessResponse(c, result, nil)
}

// Router setup with signature middleware
func RegisterLeaveRequestRoutes(r *gin.Engine, v1 *gin.RouterGroup, ...) {
    leaveRequests := v1.Group("/hrd/leave-requests")
    {
        // ... existing routes ...

        // Approval routes with signature requirement
        leaveRequests.POST("/:id/approve",
            middleware.RequirePermission("leave_request.approve"),
            middleware.RequireSignature("leave_request"), // New middleware
            h.Approve)

        leaveRequests.POST("/:id/reject",
            middleware.RequirePermission("leave_request.approve"),
            middleware.OptionalSignature(), // Signature optional for rejection
            h.Reject)
    }
}
```

#### Usecase Implementation Pattern

```go
// internal/hrd/domain/usecase/leave_request_usecase.go

func (u *leaveRequestUsecase) ApproveWithSignature(
    ctx context.Context,
    leaveRequestID string,
    approverEmployeeID string,
    req *dto.ApproveLeaveRequestDTO,
) (*dto.LeaveRequestDetailResponseDTO, error) {

    return u.db.Transaction(func(tx *gorm.DB) error {
        // 1. Fetch leave request
        leaveRequest, err := u.repo.FindByID(ctx, leaveRequestID)
        if err != nil {
            return err
        }

        // 2. Validate can approve
        if leaveRequest.Status != models.LeaveStatusPending {
            return errors.New("only pending requests can be approved")
        }

        // 3. Create signature record
        signReq := service.SignDocumentRequest{
            DocumentType: "leave_request",
            DocumentID:   leaveRequestID,
            EmployeeID:   approverEmployeeID,
            Action:       "approve",
            Notes:        req.Notes,
        }

        signature, err := u.docSigningService.SignDocument(ctx, signReq)
        if err != nil {
            return fmt.Errorf("failed to record signature: %w", err)
        }

        // 4. Update leave request
        updates := map[string]interface{}{
            "status":                models.LeaveStatusApproved,
            "approved_by":          approverEmployeeID,
            "approved_at":          time.Now(),
            "approval_signature_id": signature.ID,
        }

        if err := u.repo.Update(ctx, leaveRequestID, updates); err != nil {
            return err
        }

        // 5. Create audit trail
        u.auditService.Log(ctx, "leave_request.approve", leaveRequestID, map[string]interface{}{
            "signature_id": signature.ID,
            "approved_by":  approverEmployeeID,
        })

        return nil
    })
}
```

## 4. Frontend Implementation

### 4.1 Core Components

#### SignActionButton Component

```tsx
// src/components/signature/sign-action-button.tsx

interface SignActionButtonProps {
  documentType: string;
  documentId: string;
  action: "approve" | "reject" | "verify" | "acknowledge";
  variant?: "default" | "outline" | "destructive";
  size?: "sm" | "default" | "lg";
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  requireSignature?: boolean;
  children: React.ReactNode;
}

export function SignActionButton({
  documentType,
  documentId,
  action,
  variant = "default",
  size = "default",
  onSuccess,
  onError,
  requireSignature = true,
  children,
}: SignActionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: signature, isLoading: isCheckingSig } =
    useCurrentUserSignature();

  const handleClick = () => {
    if (requireSignature && !signature) {
      // Show warning that signature is required
      toast.error("You need to set up your digital signature first");
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirm = async (notes?: string) => {
    setIsLoading(true);
    try {
      await signDocument({
        documentType,
        documentId,
        action,
        notes,
      });
      toast.success(`Document ${action}ed successfully`);
      onSuccess?.();
      setIsModalOpen(false);
    } catch (error) {
      onError?.(error as Error);
      toast.error(`Failed to ${action} document`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isCheckingSig || (requireSignature && !signature)}
      >
        {isCheckingSig ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PenTool className="mr-2 h-4 w-4" />
        )}
        {children}
      </Button>

      <SignatureConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        action={action}
        isLoading={isLoading}
        signature={signature}
      />
    </>
  );
}
```

#### SignatureConfirmationModal Component

```tsx
// src/components/signature/signature-confirmation-modal.tsx

interface SignatureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  action: "approve" | "reject" | "verify" | "acknowledge";
  isLoading: boolean;
  signature?: EmployeeSignature;
}

export function SignatureConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  isLoading,
  signature,
}: SignatureConfirmationModalProps) {
  const [notes, setNotes] = useState("");
  const t = useTranslations("signature");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            {t(`confirm${action.charAt(0).toUpperCase() + action.slice(1)}`)}
          </DialogTitle>
          <DialogDescription>
            {t("confirmActionDescription", { action })}
          </DialogDescription>
        </DialogHeader>

        {/* Show user's signature preview */}
        {signature && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-sm font-medium mb-2">{t("yourSignature")}</p>
            <img
              src={signature.file_url}
              alt="Your signature"
              className="max-h-20 object-contain"
            />
          </div>
        )}

        {/* Notes input */}
        <div className="space-y-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(notes)}
            disabled={isLoading}
            variant={action === "reject" ? "destructive" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### DocumentSignatureTimeline Component

```tsx
// src/components/signature/document-signature-timeline.tsx

interface DocumentSignatureTimelineProps {
  documentType: string;
  documentId: string;
}

export function DocumentSignatureTimeline({
  documentType,
  documentId,
}: DocumentSignatureTimelineProps) {
  const { data: signatures, isLoading } = useDocumentSignatures(
    documentType,
    documentId,
  );

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!signatures?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No signatures recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Signature History</h3>

      <div className="space-y-3">
        {signatures.map((sig, index) => (
          <div
            key={sig.id}
            className="flex items-start gap-3 p-3 border rounded-lg"
          >
            <div className="flex-shrink-0">
              {sig.action === "approve" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : sig.action === "reject" ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <PenTool className="h-5 w-5 text-blue-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium">{sig.employee_name}</p>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(sig.signed_at), "PPp")}
                </span>
              </div>

              <p className="text-sm text-muted-foreground capitalize">
                {sig.action}ed this document
              </p>

              {sig.notes && (
                <p className="text-sm mt-1 italic">&quot;{sig.notes}&quot;</p>
              )}

              <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                <Download className="mr-1 h-3 w-3" />
                View Signature
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.2 Module Integration Examples

#### HRD - Leave Request Detail

```tsx
// In leave request detail page

export function LeaveRequestDetail({ leaveRequest }: Props) {
  return (
    <div className="space-y-6">
      {/* ... existing content ... */}

      {/* Actions */}
      {leaveRequest.status === "PENDING" && canApprove && (
        <div className="flex gap-2">
          <SignActionButton
            documentType="leave_request"
            documentId={leaveRequest.id}
            action="approve"
            onSuccess={refetch}
          >
            Approve with Signature
          </SignActionButton>

          <SignActionButton
            documentType="leave_request"
            documentId={leaveRequest.id}
            action="reject"
            variant="destructive"
            requireSignature={false} // Optional for rejection
            onSuccess={refetch}
          >
            Reject
          </SignActionButton>
        </div>
      )}

      {/* Signature History */}
      {leaveRequest.approval_signature_id && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Record</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentSignatureTimeline
              documentType="leave_request"
              documentId={leaveRequest.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Backend:**

- [ ] Create `document_signatures` table
- [ ] Create `signature_workflows` and `signature_workflow_levels` tables
- [ ] Implement DocumentSigningService interface
- [ ] Create RequireSignature middleware
- [ ] Add database migrations

**Frontend:**

- [ ] Create SignActionButton component
- [ ] Create SignatureConfirmationModal component
- [ ] Create DocumentSignatureTimeline component
- [ ] Add signature hooks (useSignDocument, useDocumentSignatures)

**Testing:**

- [ ] Unit tests for DocumentSigningService
- [ ] Integration tests for middleware

### Phase 2: HRD Module Integration (Week 3-4)

**Leave Request:**

- [ ] Update leave_requests schema with signature fields
- [ ] Add RequireSignature middleware to approve endpoint
- [ ] Update Approve usecase to record signature
- [ ] Update LeaveRequestDetail UI with SignActionButton
- [ ] Show signature timeline in leave request detail

**Payroll (Acknowledgment):**

- [ ] Add acknowledgment flow for payslips
- [ ] Employee signs to acknowledge receipt
- [ ] Manager signs to approve payroll batch

**Testing:**

- [ ] E2E tests for leave approval with signature
- [ ] Test rejection without signature

### Phase 3: Finance Module Integration (Week 5-6)

**Payment Approval:**

- [ ] Update payments schema with signature fields
- [ ] Implement multi-level approval workflow
- [ ] Amount-based approval levels
- [ ] Update PaymentDetail UI

**Journal Vouchers:**

- [ ] Add signature requirement for journal posting
- [ ] Update JournalDetail UI

**Budget:**

- [ ] Add signature for budget approval

### Phase 4: Sales & CRM Integration (Week 7-8)

**Sales Quotation:**

- [ ] Manager approval for discount > threshold
- [ ] Signature requirement for high-value quotations

**CRM Visit Report:**

- [ ] Manager approval with signature
- [ ] Employee acknowledgment signature

### Phase 5: Advanced Features (Week 9-10)

**Bulk Signing:**

- [ ] Bulk approve multiple documents
- [ ] Payroll batch signing
- [ ] Leave batch approval

**Signature Verification:**

- [ ] Verify signature authenticity
- [ ] Signature audit report
- [ ] Revocation mechanism

**Notifications:**

- [ ] Email notification when signature required
- [ ] Reminder for pending signatures

## 6. Configuration & Settings

### Environment Variables

```env
# Signature Settings
SIGNATURE_MANDATORY_FOR_APPROVAL=true
SIGNATURE_ALLOW_BULK_SIGNING=true
SIGNATURE_EXPIRY_DAYS=365
SIGNATURE_REQUIRE_NOTES_FOR_REJECTION=true

# Module-specific settings
SIGNATURE_REQUIRED_HRD_LEAVE=true
SIGNATURE_REQUIRED_HRD_PAYROLL=false
SIGNATURE_REQUIRED_FINANCE_PAYMENT=true
SIGNATURE_REQUIRED_SALES_QUOTATION=true
SIGNATURE_REQUIRED_CRM_VISIT=true

# Workflow settings
SIGNATURE_MULTI_LEVEL_APPROVAL=true
SIGNATURE_MAX_APPROVAL_LEVELS=3
```

### Admin Settings UI

Create settings page for administrators to configure:

- Which modules require signatures
- Approval workflows per module
- Amount thresholds for multi-level approvals
- Whether to allow approval without signature
- Bulk signing permissions

## 7. Security Considerations

### Data Integrity

- Store SHA-256 hash of signature file
- Timestamp all signature records
- IP address and user agent logging
- Immutable signature records (soft delete only)

### Access Control

- Only signature owner can view their signature
- Approver can only use their own signature
- Admin can view all signatures (audit purposes)
- Signature file access restricted to authenticated users

### Audit Trail

- Every signature action logged
- Chain of custody for approvals
- Revocation tracking with reason
- Tamper-evident logs

## 8. Testing Strategy

### Unit Tests

- DocumentSigningService logic
- Middleware behavior
- Workflow calculations

### Integration Tests

- End-to-end approval flow
- Multi-level approval scenarios
- Error handling (no signature, invalid signature)

### E2E Tests

- Complete leave approval workflow
- Payment approval workflow
- Bulk signing scenarios

## 9. Rollback Plan

If issues arise:

1. Disable signature requirement via feature flags
2. Allow approvals without signature (fallback)
3. Manual data correction scripts
4. Signature migration/re-verification tools

## 10. Success Metrics

- **Adoption Rate**: % of approvals using digital signature
- **Time Saved**: Reduction in approval time
- **Error Rate**: Reduction in approval disputes
- **Compliance**: % of required signatures completed
- **User Satisfaction**: Feedback scores from approvers

---

**Document Version**: 1.0  
**Last Updated**: March 19, 2026  
**Status**: Draft - Ready for Review  
**Author**: GIMS Development Team
