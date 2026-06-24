package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gin-gonic/gin"
)

func TestWritePurchasePaymentBusinessError_CashBankAccountMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	handled := writePurchasePaymentBusinessError(ctx, errors.New("no active cash/bank account configured for this company"))
	if !handled {
		t.Fatal("expected error to be handled")
	}

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d", http.StatusUnprocessableEntity, recorder.Code)
	}

	var payload response.StandardErrorPayload
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.Code != response.ErrCodeCashBankAccountMissing {
		t.Fatalf("expected code %q, got %q", response.ErrCodeCashBankAccountMissing, payload.Code)
	}

	if payload.Details["setting_path"] != "/finance/bank-accounts" {
		t.Fatalf("expected setting path /finance/bank-accounts, got %#v", payload.Details["setting_path"])
	}
}

func TestWritePurchasePaymentBusinessError_PeriodClosed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	handled := writePurchasePaymentBusinessError(ctx, errors.New("failed to post journal: period is closed"))
	if !handled {
		t.Fatal("expected error to be handled")
	}

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d", http.StatusUnprocessableEntity, recorder.Code)
	}

	var payload response.StandardErrorPayload
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.Code != response.ErrCodePeriodClosed {
		t.Fatalf("expected code %q, got %q", response.ErrCodePeriodClosed, payload.Code)
	}

	if payload.Details["setting_path"] != "/finance/closing" {
		t.Fatalf("expected setting path /finance/closing, got %#v", payload.Details["setting_path"])
	}
}
