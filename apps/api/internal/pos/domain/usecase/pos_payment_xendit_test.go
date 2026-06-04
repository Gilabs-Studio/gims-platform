package usecase

import (
	"testing"
	"time"

	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
)

func TestNormalizeXenditInvoiceChannel(t *testing.T) {
	tests := []struct {
		name        string
		req         *dto.ProcessPaymentRequest
		wantChannel string
		wantErr     bool
	}{
		{
			name:        "legacy self order QRIS is retained as requested channel",
			req:         &dto.ProcessPaymentRequest{Method: "QRIS", Amount: 49950},
			wantChannel: "QRIS",
		},
		{
			name:        "digital without channel lets Xendit hosted invoice show active methods",
			req:         &dto.ProcessPaymentRequest{Method: "DIGITAL", Amount: 49950},
			wantChannel: "",
		},
		{
			name:        "digital with ewallet channel is accepted",
			req:         &dto.ProcessPaymentRequest{Method: "DIGITAL", Amount: 49950, ChannelCode: strPtr("dana")},
			wantChannel: "DANA",
		},
		{
			name:    "cash is rejected on digital endpoint",
			req:     &dto.ProcessPaymentRequest{Method: "CASH", Amount: 49950},
			wantErr: true,
		},
		{
			name:    "unknown channel is rejected",
			req:     &dto.ProcessPaymentRequest{Method: "DIGITAL", Amount: 49950, ChannelCode: strPtr("UNKNOWN")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeXenditInvoiceChannel(tt.req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.wantChannel {
				t.Fatalf("channel = %q, want %q", got, tt.wantChannel)
			}
		})
	}
}

func TestMapXenditInvoiceStatus(t *testing.T) {
	tests := []struct {
		status       string
		wantStatus   models.POSPaymentStatus
		wantTerminal bool
		wantErr      bool
	}{
		{status: "PENDING", wantStatus: models.POSPaymentStatusPending, wantTerminal: false},
		{status: "PAID", wantStatus: models.POSPaymentStatusPaid, wantTerminal: true},
		{status: "SETTLED", wantStatus: models.POSPaymentStatusPaid, wantTerminal: true},
		{status: "EXPIRED", wantStatus: models.POSPaymentStatusExpired, wantTerminal: true},
		{status: "FAILED", wantStatus: models.POSPaymentStatusFailed, wantTerminal: true},
		{status: "CANCELLED", wantStatus: models.POSPaymentStatusCancelled, wantTerminal: true},
		{status: "mystery", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			gotStatus, gotTerminal, err := mapXenditInvoiceStatus(tt.status)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if gotStatus != tt.wantStatus {
				t.Fatalf("status = %q, want %q", gotStatus, tt.wantStatus)
			}
			if gotTerminal != tt.wantTerminal {
				t.Fatalf("terminal = %v, want %v", gotTerminal, tt.wantTerminal)
			}
		})
	}
}

func TestResolveXenditInvoiceExpiry(t *testing.T) {
	fallback := time.Date(2026, 6, 4, 10, 0, 0, 0, time.UTC)
	parsed := resolveXenditInvoiceExpiry("2026-06-04T12:00:00Z", fallback)
	if !parsed.Equal(time.Date(2026, 6, 4, 12, 0, 0, 0, time.UTC)) {
		t.Fatalf("parsed expiry = %s", parsed)
	}

	defaulted := resolveXenditInvoiceExpiry("", fallback)
	if !defaulted.Equal(fallback.Add(24 * time.Hour)) {
		t.Fatalf("default expiry = %s", defaulted)
	}
}

func strPtr(value string) *string {
	return &value
}
