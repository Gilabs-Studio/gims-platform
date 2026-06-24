package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gilabs/gims/api/internal/auth/domain/dto"
	"github.com/gilabs/gims/api/internal/auth/domain/usecase"
	coreConfig "github.com/gilabs/gims/api/internal/core/infrastructure/config"
	tenantDTO "github.com/gilabs/gims/api/internal/tenant/domain/dto"
	"github.com/gin-gonic/gin"
)

type fakeXenditAuthUsecase struct {
	completeCalled bool
	completeToken  string
	renewCalled    bool
	renewID        string
	renewAmount    int64
	linkCalled     bool
	linkReference  string
	linkPlanID     string
	linkSessionID  string
	linkTokenID    string
	linkStatus     string
	refundCalled   bool
	refundID       string
	refundReason   string
}

func (f *fakeXenditAuthUsecase) Login(context.Context, *dto.LoginRequest) (*dto.LoginResponse, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) RefreshToken(context.Context, string) (*dto.LoginResponse, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) Logout(context.Context, string) error { return nil }
func (f *fakeXenditAuthUsecase) RegisterTenant(context.Context, *dto.RegisterTenantRequest) (*usecase.RegisterTenantResult, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) CheckAvailability(context.Context, string, string) (map[string]bool, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) CompletePendingRegistration(_ context.Context, token string) error {
	f.completeCalled = true
	f.completeToken = token
	return nil
}
func (f *fakeXenditAuthUsecase) ConfirmPendingRegistration(context.Context, string) (*dto.LoginResponse, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) HandleRecurringRenewal(_ context.Context, id string, amount int64) error {
	f.renewCalled = true
	f.renewID = id
	f.renewAmount = amount
	return nil
}
func (f *fakeXenditAuthUsecase) LinkRecurringSubscription(_ context.Context, referenceID, recurringPlanID, paymentSessionID, paymentTokenID, recurringStatus string) error {
	f.linkCalled = true
	f.linkReference = referenceID
	f.linkPlanID = recurringPlanID
	f.linkSessionID = paymentSessionID
	f.linkTokenID = paymentTokenID
	f.linkStatus = recurringStatus
	return nil
}
func (f *fakeXenditAuthUsecase) HandlePaymentRefund(_ context.Context, id, reason string) error {
	f.refundCalled = true
	f.refundID = id
	f.refundReason = reason
	return nil
}
func (f *fakeXenditAuthUsecase) CreateBillingChangeInvoice(context.Context, *tenantDTO.BillingChangeRequest, string) (*tenantDTO.BillingChangeResponse, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) CompletePendingBillingChange(context.Context, string) error {
	return nil
}
func (f *fakeXenditAuthUsecase) ConfirmPendingBillingChange(context.Context, string, string) error {
	return nil
}
func (f *fakeXenditAuthUsecase) CancelSubscription(context.Context, string) error { return nil }

func dispatchXenditWebhook(t *testing.T, h *XenditHandler, payload xenditWebhookBody) *httptest.ResponseRecorder {
	t.Helper()

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/xendit/invoice", bytes.NewReader(body))
	req.Header.Set("x-callback-token", "secret")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	h.InvoicePaid(c)
	return w
}

func TestInvoicePaidRefundCallsAdjustmentPath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	orig := coreConfig.AppConfig
	coreConfig.AppConfig = &coreConfig.Config{}
	defer func() { coreConfig.AppConfig = orig }()

	fake := &fakeXenditAuthUsecase{}
	h := NewXenditHandler(fake)

	coreConfig.AppConfig.Xendit.BillingWebhookToken = "secret"
	w := dispatchXenditWebhook(t, h, xenditWebhookBody{ID: "inv-1", Status: "REFUNDED", ExternalID: "ext-1"})

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d", w.Code)
	}
	if !fake.refundCalled || fake.refundID != "inv-1" || fake.refundReason != "REFUNDED" {
		t.Fatalf("refund call = (%v, %s, %s)", fake.refundCalled, fake.refundID, fake.refundReason)
	}
}

func TestSubscriptionSetupOnlyLinksRecurringMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	orig := coreConfig.AppConfig
	coreConfig.AppConfig = &coreConfig.Config{}
	defer func() { coreConfig.AppConfig = orig }()

	fake := &fakeXenditAuthUsecase{}
	h := NewXenditHandler(fake)
	coreConfig.AppConfig.Xendit.BillingWebhookToken = "secret"

	w := dispatchXenditWebhook(t, h, xenditWebhookBody{
		Event:            "payment_session.completed",
		ReferenceID:      "reg-token",
		PaymentSessionID: "ps-123",
		PaymentTokenID:   "pt-123",
	})

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d", w.Code)
	}
	if fake.completeCalled {
		t.Fatalf("payment session setup should not provision tenant before paid cycle")
	}
	if !fake.linkCalled || fake.linkReference != "reg-token" || fake.linkSessionID != "ps-123" || fake.linkTokenID != "pt-123" || fake.linkStatus != "pending_activation" {
		t.Fatalf("link call = (%v, %s, %s, %s, %s)", fake.linkCalled, fake.linkReference, fake.linkSessionID, fake.linkTokenID, fake.linkStatus)
	}
}

func TestRecurringSuccessCompletesInitialRegistrationBeforeRenewal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	orig := coreConfig.AppConfig
	coreConfig.AppConfig = &coreConfig.Config{}
	defer func() { coreConfig.AppConfig = orig }()

	fake := &fakeXenditAuthUsecase{}
	h := NewXenditHandler(fake)
	coreConfig.AppConfig.Xendit.BillingWebhookToken = "secret"

	w := dispatchXenditWebhook(t, h, xenditWebhookBody{
		Event:            "recurring.cycle.succeeded",
		ReferenceID:      "reg-token",
		RecurringPlanID:  "rp-123",
		PaymentSessionID: "ps-123",
		PaymentTokenID:   "pt-123",
		Amount:           125000,
	})

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d", w.Code)
	}
	if !fake.completeCalled || fake.completeToken != "reg-token" {
		t.Fatalf("complete call = (%v, %s)", fake.completeCalled, fake.completeToken)
	}
	if fake.renewCalled {
		t.Fatalf("initial paid cycle should not be processed as a renewal")
	}
	if !fake.linkCalled || fake.linkPlanID != "rp-123" || fake.linkStatus != "active" {
		t.Fatalf("link call = (%v, %s, %s)", fake.linkCalled, fake.linkPlanID, fake.linkStatus)
	}
}
