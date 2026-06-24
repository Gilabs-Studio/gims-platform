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

func TestWritePurchasePaymentBusinessError_AbortedTransactionIsNotConcurrency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	handled := writePurchasePaymentBusinessError(ctx, errors.New("ERROR: current transaction is aborted, commands ignored until end of transaction block (SQLSTATE 25P02)"))
	if !handled {
		t.Fatal("expected error to be handled")
	}

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, recorder.Code)
	}

	var payload response.StandardErrorPayload
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.Code != response.ErrCodeInternalServerError {
		t.Fatalf("expected code %q, got %q", response.ErrCodeInternalServerError, payload.Code)
	}

	if payload.Error == "Another process is updating this payment. Please refresh the data and try again." {
		t.Fatal("aborted transaction must not be reported as a concurrency conflict")
	}
}

func TestWritePurchasePaymentBusinessError_ValueTooLongIsNotConcurrency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	handled := writePurchasePaymentBusinessError(ctx, errors.New("ERROR: value too long for type character varying(20) (SQLSTATE 22001)"))
	if !handled {
		t.Fatal("expected error to be handled")
	}

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, recorder.Code)
	}

	var payload response.StandardErrorPayload
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.Error == "Another process is updating this payment. Please refresh the data and try again." {
		t.Fatal("varchar overflow must not be reported as a concurrency conflict")
	}
}
