package xendit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultBaseURL      = "https://api.xendit.co"
	invoicePath         = "/v2/invoices"
	paymentSessionPath  = "/sessions"
	subscriptionPath    = "/recurring/plans"
	subscriptionAPIPath = "/recurring/subscriptions"
	balancePath         = "/balance"
	payoutPath          = "/v2/payouts"
	payoutChannelsPath  = "/payouts_channels"
)

// Client is a minimal Xendit API client scoped to the Invoice API.
// Extend with additional resources as needed.
type Client struct {
	secretKey  string
	baseURL    string
	httpClient *http.Client
}

type APIError struct {
	StatusCode int
	Path       string
	Body       string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("xendit: API error %d on %s: %s", e.StatusCode, e.Path, e.Body)
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
	key := strings.TrimSpace(c.secretKey)
	return key != "" &&
		key != "xnd_development_your_secret_key_here" &&
		!strings.HasPrefix(key, "CHANGE_ME")
}

// IsSandbox returns true when the secret key is a development key (does not start with xnd_production_).
func (c *Client) IsSandbox() bool {
	return !strings.HasPrefix(c.secretKey, "xnd_production_")
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

// PaymentSessionCustomerDetails is the customer object accepted by Xendit
// Payment Sessions. Keep this minimal so GIMS never handles raw payment data.
type PaymentSessionCustomerDetails struct {
	ReferenceID      string                         `json:"reference_id"`
	Type             string                         `json:"type"` // "INDIVIDUAL"
	Email            string                         `json:"email,omitempty"`
	MobileNumber     string                         `json:"mobile_number,omitempty"`
	IndividualDetail PaymentSessionIndividualDetail `json:"individual_detail"`
}

type PaymentSessionIndividualDetail struct {
	GivenNames string `json:"given_names"`
	Surname    string `json:"surname,omitempty"`
}

type PaymentSessionItem struct {
	ReferenceID   string `json:"reference_id"`
	Type          string `json:"type"` // DIGITAL_SERVICE
	Name          string `json:"name"`
	Category      string `json:"category"`
	NetUnitAmount int64  `json:"net_unit_amount"`
	Quantity      int    `json:"quantity"`
	Currency      string `json:"currency"`
	Description   string `json:"description,omitempty"`
}

type PaymentSessionSubscription struct {
	Schedule          PaymentSessionSubscriptionSchedule `json:"schedule"`
	FailedCycleAction string                             `json:"failed_cycle_action,omitempty"` // RESUME or STOP
	ImmediatePayment  bool                               `json:"immediate_payment,omitempty"`
}

type PaymentSessionSubscriptionSchedule struct {
	Interval                    string `json:"interval"` // DAY, WEEK, MONTH
	IntervalCount               int    `json:"interval_count"`
	TotalRecurrence             int    `json:"total_recurrence,omitempty"`
	AnchorDate                  string `json:"anchor_date"` // ISO-8601
	RetryInterval               string `json:"retry_interval,omitempty"`
	RetryIntervalCount          int    `json:"retry_interval_count,omitempty"`
	TotalRetry                  int    `json:"total_retry,omitempty"`
	PaymentLinkForFailedAttempt bool   `json:"payment_link_for_failed_attempt,omitempty"`
}

// CreatePaymentSessionRequest creates a Xendit-hosted checkout session.
// For recurring billing use SessionType=SUBSCRIPTION and Mode=PAYMENT_LINK.
type CreatePaymentSessionRequest struct {
	ReferenceID          string                        `json:"reference_id"`
	SessionType          string                        `json:"session_type"` // PAY, SAVE, SUBSCRIPTION
	Mode                 string                        `json:"mode"`         // PAYMENT_LINK, COMPONENTS
	Amount               int64                         `json:"amount"`
	Currency             string                        `json:"currency"`
	Country              string                        `json:"country"`
	Customer             PaymentSessionCustomerDetails `json:"customer"`
	Items                []PaymentSessionItem          `json:"items,omitempty"`
	Locale               string                        `json:"locale,omitempty"`
	Description          string                        `json:"description,omitempty"`
	Subscription         *PaymentSessionSubscription   `json:"subscription,omitempty"`
	SuccessReturnURL     string                        `json:"success_return_url,omitempty"`
	CancelReturnURL      string                        `json:"cancel_return_url,omitempty"`
	NotificationChannels []string                      `json:"notification_channels,omitempty"`
	Metadata             map[string]interface{}        `json:"metadata,omitempty"`
}

type PaymentSessionResponse struct {
	PaymentSessionID string    `json:"payment_session_id"`
	ReferenceID      string    `json:"reference_id"`
	Status           string    `json:"status"`
	SessionType      string    `json:"session_type"`
	Mode             string    `json:"mode"`
	Amount           int64     `json:"amount"`
	Currency         string    `json:"currency"`
	Country          string    `json:"country"`
	PaymentLinkURL   string    `json:"payment_link_url"`
	PaymentTokenID   string    `json:"payment_token_id"`
	PaymentID        string    `json:"payment_id"`
	PaymentRequestID string    `json:"payment_request_id"`
	CustomerID       string    `json:"customer_id"`
	Created          time.Time `json:"created"`
	Updated          time.Time `json:"updated"`
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
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Path:       invoicePath,
			Body:       string(respBody),
		}
	}

	var result CreateInvoiceResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit: parse response: %w", err)
	}
	return &result, nil
}

// CreatePaymentSession creates a Xendit Payment Session.
func (c *Client) CreatePaymentSession(ctx context.Context, req CreatePaymentSessionRequest) (*PaymentSessionResponse, error) {
	if req.Currency == "" {
		req.Currency = "IDR"
	}
	if req.Country == "" {
		req.Country = "ID"
	}
	if req.Mode == "" {
		req.Mode = "PAYMENT_LINK"
	}
	if req.Locale == "" {
		req.Locale = "id"
	}
	return doPost[PaymentSessionResponse](ctx, c, paymentSessionPath, req)
}

// ─── Recurring Subscription API ─────────────────────────────────────────────

// CreateRecurringPlanRequest holds the fields for creating a Xendit recurring plan.
// Reference: https://docs.xendit.co/docs/subscriptions-overview
type CreateRecurringPlanRequest struct {
	ReferenceID      string                   `json:"reference_id"`     // Unique plan reference (e.g. "gims_{tenantID}_{planSlug}")
	CustomerID       string                   `json:"customer_id"`      // Xendit customer ID
	RecurringAction  string                   `json:"recurring_action"` // "PAYMENT"
	Currency         string                   `json:"currency"`         // "IDR"
	Amount           int64                    `json:"amount"`
	PaymentMethods   []RecurringPaymentMethod `json:"payment_methods"`
	Schedule         RecurringSchedule        `json:"schedule"`
	SuccessReturnURL string                   `json:"success_return_url"`
	FailureReturnURL string                   `json:"failure_return_url"`
	Metadata         map[string]interface{}   `json:"metadata,omitempty"`
}

// RecurringPaymentMethod specifies how the recurring charge is collected.
type RecurringPaymentMethod struct {
	Type string `json:"type"` // "CREDIT_CARD", "DEBIT_CARD", "EWALLET", "BANK_TRANSFER"
}

// RecurringSchedule defines the billing frequency.
type RecurringSchedule struct {
	ReferenceID   string `json:"reference_id"`
	Interval      string `json:"interval"`              // "MONTH" or "YEAR"
	IntervalCount int    `json:"interval_count"`        // 1 for monthly, 12 for yearly
	AnchorDate    string `json:"anchor_date,omitempty"` // ISO-8601 start date
}

// RecurringPlanResponse is the Xendit recurring plan object.
type RecurringPlanResponse struct {
	ID          string `json:"id"`
	ReferenceID string `json:"reference_id"`
	Status      string `json:"status"` // "ACTIVE", "INACTIVE", "STOPPED"
	CustomerID  string `json:"customer_id"`
	Amount      int64  `json:"amount"`
	Currency    string `json:"currency"`
}

// CreateRecurringSubscriptionRequest activates a recurring plan for a customer.
type CreateRecurringSubscriptionRequest struct {
	PlanID     string `json:"plan_id"`
	CustomerID string `json:"customer_id"`
}

// RecurringSubscriptionResponse is the Xendit subscription object.
type RecurringSubscriptionResponse struct {
	ID         string `json:"id"`
	PlanID     string `json:"plan_id"`
	Status     string `json:"status"`
	CustomerID string `json:"customer_id"`
}

// CreateCustomerRequest creates a Xendit customer for recurring billing.
type CreateCustomerRequest struct {
	ReferenceID string `json:"reference_id"`
	GivenNames  string `json:"given_names"`
	Email       string `json:"email"`
	Type        string `json:"type"` // "INDIVIDUAL" or "BUSINESS"
}

// CustomerResponse is the Xendit customer object.
type CustomerResponse struct {
	ID          string `json:"id"`
	ReferenceID string `json:"reference_id"`
	GivenNames  string `json:"given_names"`
	Email       string `json:"email"`
}

// CreateCustomer creates a Xendit customer record for recurring billing.
func (c *Client) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*CustomerResponse, error) {
	return doPost[CustomerResponse](ctx, c, "/customers", req)
}

// ─── Card Tokenization API ───────────────────────────────────────────────────

// CardTokenData is the card token object stored from Xendit.js tokenization.
// The frontend collects card details via Xendit.js, which returns a token_id.
// This token_id is sent to our backend and stored here — never the raw card data.
type CardTokenData struct {
	ID               string `json:"id"`                 // Xendit token ID (xnd_...)
	Status           string `json:"status"`             // "VALID", "INVALID"
	MaskedCardNumber string `json:"masked_card_number"` // e.g. "400000XXXXXX0002"
	CardBrand        string `json:"card_brand"`         // "VISA", "MASTERCARD", etc.
	CardHolderName   string `json:"card_holder_name"`
	ExpiryMonth      int    `json:"expiry_month"`
	ExpiryYear       int    `json:"expiry_year"`
}

// GetCardToken retrieves a card token by its ID to verify validity and card details.
func (c *Client) GetCardToken(ctx context.Context, tokenID string) (*CardTokenData, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/v2/tokens/"+tokenID, nil)
	if err != nil {
		return nil, fmt.Errorf("xendit: build get-token request: %w", err)
	}
	httpReq.SetBasicAuth(c.secretKey, "")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xendit: http get-token: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("xendit: read get-token response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Path:       "/v2/tokens/" + tokenID,
			Body:       string(respBody),
		}
	}

	var result CardTokenData
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit: parse get-token response: %w", err)
	}
	return &result, nil
}

// ─── Balance & Payout API ───────────────────────────────────────────────────

type BalanceResponse struct {
	Balance float64 `json:"balance"`
}

type CreatePayoutRequest struct {
	ReferenceID       string                  `json:"reference_id"`
	ChannelCode       string                  `json:"channel_code"`
	ChannelProperties PayoutChannelProperties `json:"channel_properties"`
	Amount            int64                   `json:"amount"`
	Description       string                  `json:"description,omitempty"`
	Currency          string                  `json:"currency"`
}

type PayoutChannelProperties struct {
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
}

type PayoutResponse struct {
	ID                   string                  `json:"id"`
	ReferenceID          string                  `json:"reference_id"`
	Status               string                  `json:"status"`
	Amount               float64                 `json:"amount"`
	Currency             string                  `json:"currency"`
	ChannelCode          string                  `json:"channel_code"`
	Description          string                  `json:"description"`
	Created              string                  `json:"created"`
	Updated              string                  `json:"updated"`
	EstimatedArrivalTime string                  `json:"estimated_arrival_time"`
	FailureCode          string                  `json:"failure_code,omitempty"`
	ChannelProperties    PayoutChannelProperties `json:"channel_properties"`
}

type PayoutChannel struct {
	ChannelName     string             `json:"channel_name"`
	ChannelCategory string             `json:"channel_category"`
	ChannelCode     string             `json:"channel_code"`
	Currency        string             `json:"currency"`
	AmountLimits    PayoutAmountLimits `json:"amount_limits"`
}

type PayoutAmountLimits struct {
	Minimum          float64 `json:"minimum"`
	Maximum          float64 `json:"maximum"`
	MinimumIncrement float64 `json:"minimum_increment"`
}

// GetBalance retrieves the Xendit cash balance. Do not expose this raw platform
// balance to tenants; use it only as a liquidity/configuration health check.
func (c *Client) GetBalance(ctx context.Context, currency string) (*BalanceResponse, error) {
	if currency == "" {
		currency = "IDR"
	}
	query := url.Values{}
	query.Set("account_type", "CASH")
	query.Set("currency", currency)
	return doGet[BalanceResponse](ctx, c, balancePath+"?"+query.Encode())
}

// GetPayoutChannels retrieves currently supported payout destination channels.
func (c *Client) GetPayoutChannels(ctx context.Context, currency, category string) (*[]PayoutChannel, error) {
	query := url.Values{}
	if currency != "" {
		query.Set("currency", currency)
	}
	if category != "" {
		query.Set("channel_category", category)
	}
	path := payoutChannelsPath
	if encoded := query.Encode(); encoded != "" {
		path += "?" + encoded
	}
	return doGet[[]PayoutChannel](ctx, c, path)
}

// CreatePayout initiates a Xendit payout with an idempotency key.
func (c *Client) CreatePayout(ctx context.Context, req CreatePayoutRequest, idempotencyKey string) (*PayoutResponse, error) {
	if req.Currency == "" {
		req.Currency = "IDR"
	}
	return doPostWithHeaders[PayoutResponse](ctx, c, payoutPath, req, map[string]string{
		"Idempotency-key": idempotencyKey,
	})
}

// CreateRecurringPlan registers a recurring billing plan in Xendit.
func (c *Client) CreateRecurringPlan(ctx context.Context, req CreateRecurringPlanRequest) (*RecurringPlanResponse, error) {
	return doPost[RecurringPlanResponse](ctx, c, subscriptionPath, req)
}

// CancelRecurringPlan deactivates a recurring plan (stops future charges).
func (c *Client) CancelRecurringPlan(ctx context.Context, planID string) (*RecurringPlanResponse, error) {
	return doPost[RecurringPlanResponse](ctx, c, subscriptionPath+"/"+planID+"/deactivate", nil)
}

// doPost is a typed helper that marshals req, sends a POST to path, and unmarshals into T.
func doPost[T any](ctx context.Context, c *Client, path string, req any) (*T, error) {
	return doPostWithHeaders[T](ctx, c, path, req, nil)
}

func doGet[T any](ctx context.Context, c *Client, path string) (*T, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, fmt.Errorf("xendit: build request %s: %w", path, err)
	}
	httpReq.SetBasicAuth(c.secretKey, "")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xendit: http %s: %w", path, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("xendit: read response %s: %w", path, err)
	}
	if resp.StatusCode >= 400 {
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Path:       path,
			Body:       string(respBody),
		}
	}

	var result T
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit: parse response %s: %w", path, err)
	}
	return &result, nil
}

func doPostWithHeaders[T any](ctx context.Context, c *Client, path string, req any, headers map[string]string) (*T, error) {
	var bodyReader *bytes.Reader
	if req != nil {
		b, err := json.Marshal(req)
		if err != nil {
			return nil, fmt.Errorf("xendit: marshal %s: %w", path, err)
		}
		bodyReader = bytes.NewReader(b)
	} else {
		bodyReader = bytes.NewReader([]byte("{}"))
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("xendit: build request %s: %w", path, err)
	}
	httpReq.SetBasicAuth(c.secretKey, "")
	httpReq.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("xendit: http %s: %w", path, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("xendit: read response %s: %w", path, err)
	}
	if resp.StatusCode >= 400 {
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Path:       path,
			Body:       string(respBody),
		}
	}

	var result T
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit: parse response %s: %w", path, err)
	}
	return &result, nil
}

type ValidateBankAccountRequest struct {
	BankCode      string `json:"bank_code"`
	AccountNumber string `json:"account_number"`
}

type ValidateBankAccountResponse struct {
	BankCode          string `json:"bank_code"`
	AccountNumber     string `json:"account_number"`
	BankName          string `json:"bank_name"`
	AccountHolderName string `json:"account_holder_name"`
	Status            string `json:"status"`
}

func (c *Client) ValidateBankAccount(ctx context.Context, req ValidateBankAccountRequest) (*ValidateBankAccountResponse, error) {
	return doPost[ValidateBankAccountResponse](ctx, c, "/bank_accounts/data_lookup", req)
}
