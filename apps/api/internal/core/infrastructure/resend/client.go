package resend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client handles requests to the Resend API.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new Resend API client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:  apiKey,
		baseURL: "https://api.resend.com",
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// SetBaseURL overrides the default Resend API base URL (useful for testing).
func (c *Client) SetBaseURL(url string) {
	c.baseURL = url
}

// SendEmailRequest represents the request body for sending an email via Resend.
type SendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// SendEmailResponse represents the response from Resend when an email is successfully sent.
type SendEmailResponse struct {
	ID string `json:"id"`
}

// SendEmail sends an email using the Resend API.
func (c *Client) SendEmail(ctx context.Context, req *SendEmailRequest) (*SendEmailResponse, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("resend API key is not configured")
	}

	url := fmt.Sprintf("%s/emails", c.baseURL)
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errResponse map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResponse)
		return nil, fmt.Errorf("resend API returned status %d: %v", resp.StatusCode, errResponse)
	}

	var res SendEmailResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &res, nil
}
