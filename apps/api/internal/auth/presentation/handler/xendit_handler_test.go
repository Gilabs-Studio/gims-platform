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
	refundCalled bool
	refundID     string
	refundReason string
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
func (f *fakeXenditAuthUsecase) CompletePendingRegistration(context.Context, string) error {
	return nil
}
func (f *fakeXenditAuthUsecase) ConfirmPendingRegistration(context.Context, string) (*dto.LoginResponse, error) {
	return nil, nil
}
func (f *fakeXenditAuthUsecase) HandleRecurringRenewal(context.Context, string, int64) error {
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

func TestInvoicePaidRefundCallsAdjustmentPath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	orig := coreConfig.AppConfig
	coreConfig.AppConfig = &coreConfig.Config{}
	defer func() { coreConfig.AppConfig = orig }()

	fake := &fakeXenditAuthUsecase{}
	h := NewXenditHandler(fake)

	payload := xenditWebhookBody{ID: "inv-1", Status: "REFUNDED", ExternalID: "ext-1"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/xendit/invoice", bytes.NewReader(body))
	req.Header.Set("x-callback-token", "secret")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	coreConfig.AppConfig.Xendit.WebhookToken = "secret"
	h.InvoicePaid(c)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d", w.Code)
	}
	if !fake.refundCalled || fake.refundID != "inv-1" || fake.refundReason != "REFUNDED" {
		t.Fatalf("refund call = (%v, %s, %s)", fake.refundCalled, fake.refundID, fake.refundReason)
	}
}
