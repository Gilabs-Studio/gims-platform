package xendit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultBaseURL = "https://api.xendit.co"
	invoicePath    = "/v2/invoices"
)

// Client is a minimal Xendit API client scoped to the Invoice API.
// Extend with additional resources as needed.
type Client struct {
	secretKey  string
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a Xendit client.
// secretKey is the Xendit server-side secret key (xnd_production_... or xnd_development_...).
// baseURL is optional; defaults to https://api.xendit.co.
func NewClient(secretKey, baseURL string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	return &Client{
		secretKey: secretKey,
		baseURL:   baseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// IsConfigured returns true when the secret key is set and non-placeholder.
func (c *Client) IsConfigured() bool {
	return c.secretKey != "" &&
		c.secretKey != "xnd_development_your_secret_key_here"
}

// CreateInvoiceRequest holds the fields for creating a Xendit invoice.
type CreateInvoiceRequest struct {
	// ExternalID must be unique per invoice; use the pending registration token.
	ExternalID  string `json:"external_id"`
	Amount      int64  `json:"amount"` // In smallest IDR unit (IDR has no subunits, so 1 IDR = 1)
	PayerEmail  string `json:"payer_email"`
	Description string `json:"description"`
	// SuccessRedirectURL is where Xendit redirects the browser after payment.
	SuccessRedirectURL string `json:"success_redirect_url"`
	// FailureRedirectURL is where Xendit redirects the browser if the user cancels.
	FailureRedirectURL string `json:"failure_redirect_url"`
	// Currency defaults to IDR.
	Currency string `json:"currency"`
	// InvoiceDuration is the number of seconds the invoice stays payable (default 86400 = 24h).
	InvoiceDuration int `json:"invoice_duration"`
}

// CreateInvoiceResponse is the relevant subset of the Xendit invoice object.
type CreateInvoiceResponse struct {
	ID          string    `json:"id"`
	ExternalID  string    `json:"external_id"`
	Status      string    `json:"status"`
	InvoiceURL  string    `json:"invoice_url"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	Description string    `json:"description"`
	ExpiryDate  time.Time `json:"expiry_date"`
}

// WebhookPayload is the structure Xendit POSTs to your webhook endpoint.
type WebhookPayload struct {
	ID         string `json:"id"`
	ExternalID string `json:"external_id"`
	Status     string `json:"status"` // "PAID", "EXPIRED", "SETTLED"
	Amount     int64  `json:"amount"`
	Currency   string `json:"currency"`
	PayerEmail string `json:"payer_email"`
	// PaymentMethod and PaidAt are optional on failure callbacks.
	PaymentMethod string     `json:"payment_method,omitempty"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
}

// CreateInvoice sends a create-invoice request to Xendit and returns the invoice.
func (c *Client) CreateInvoice(ctx context.Context, req CreateInvoiceRequest) (*CreateInvoiceResponse, error) {
	if req.Currency == "" {
		req.Currency = "IDR"
	}
	if req.InvoiceDuration == 0 {
		req.InvoiceDuration = 86400 // 24 hours
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("xendit: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+invoicePath, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("xendit: build request: %w", err)
	}
	// Xendit uses HTTP Basic Auth with the secret key as the username and no password.
	httpReq.SetBasicAuth(c.secretKey, "")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xendit: http: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1 MB cap
	if err != nil {
		return nil, fmt.Errorf("xendit: read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("xendit: API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result CreateInvoiceResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit: parse response: %w", err)
	}
	return &result, nil
}
