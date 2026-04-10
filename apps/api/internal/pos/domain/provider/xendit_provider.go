package provider

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
xenditBaseURL     = "https://api.xendit.co"
defaultExpirySecs = 86400 // 24 hours
)

// InvoiceRequest represents the payload sent to Xendit's invoice API
type InvoiceRequest struct {
ExternalID  string  `json:"external_id"`
Amount      float64 `json:"amount"`
Description string  `json:"description"`
Currency    string  `json:"currency"`
}

// InvoiceResponse is the relevant subset of the Xendit invoice creation response
type InvoiceResponse struct {
ID         string `json:"id"`
ExternalID string `json:"external_id"`
Status     string `json:"status"`
InvoiceURL string `json:"invoice_url"`
// QR code details — populated for QRIS-enabled invoices
QRCode     string `json:"qr_string"`
ExpiryDate string `json:"expiry_date"`
}

// PaymentProvider abstracts the underlying payment gateway.
// This interface allows swapping providers without touching business logic.
type PaymentProvider interface {
// CreateInvoice creates a payment invoice and returns the checkout URL and QR code
CreateInvoice(ctx context.Context, req InvoiceRequest) (*InvoiceResponse, error)
}

// XenditProvider implements PaymentProvider using the Xendit API.
// It uses the XenPlatform sub-account model: every call includes the
// `for-user-id` header so funds settle in the merchant's own Xendit account.
type XenditProvider struct {
secretKey    string
xenditAcctID string // sub-account ID for XenPlatform routing
httpClient   *http.Client
}

// NewXenditProvider creates an XenditProvider for the given merchant sub-account.
// secretKey is the platform or sub-account API key.
// xenditAccountID is the sub-account Xendit user ID (from XenPlatform).
func NewXenditProvider(secretKey, xenditAccountID string) *XenditProvider {
return &XenditProvider{
secretKey:    secretKey,
xenditAcctID: xenditAccountID,
httpClient: &http.Client{
Timeout: 30 * time.Second,
},
}
}

// CreateInvoice calls POST /v2/invoices and returns the resulting invoice details.
// When xenditAcctID is set, the `for-user-id` header routes funds to the merchant sub-account.
func (p *XenditProvider) CreateInvoice(ctx context.Context, req InvoiceRequest) (*InvoiceResponse, error) {
if req.Currency == "" {
req.Currency = "IDR"
}

body, err := json.Marshal(req)
if err != nil {
return nil, fmt.Errorf("xendit: failed to marshal invoice request: %w", err)
}

httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, xenditBaseURL+"/v2/invoices", strings.NewReader(string(body)))
if err != nil {
return nil, fmt.Errorf("xendit: failed to create http request: %w", err)
}

// Basic auth: base64(secret_key + ":") per Xendit auth spec
credentials := base64.StdEncoding.EncodeToString([]byte(p.secretKey + ":"))
httpReq.Header.Set("Authorization", "Basic "+credentials)
httpReq.Header.Set("Content-Type", "application/json")

// XenPlatform sub-account routing — routes settlement to merchant's Xendit account
if p.xenditAcctID != "" {
httpReq.Header.Set("for-user-id", p.xenditAcctID)
}

resp, err := p.httpClient.Do(httpReq)
if err != nil {
return nil, fmt.Errorf("xendit: http request failed: %w", err)
}
defer resp.Body.Close()

respBody, err := io.ReadAll(resp.Body)
if err != nil {
return nil, fmt.Errorf("xendit: failed to read response body: %w", err)
}

if resp.StatusCode >= 400 {
return nil, fmt.Errorf("xendit: API error (status %d): %s", resp.StatusCode, string(respBody))
}

var invoice InvoiceResponse
if err := json.Unmarshal(respBody, &invoice); err != nil {
return nil, fmt.Errorf("xendit: failed to parse invoice response: %w", err)
}

return &invoice, nil
}
