package cerebras

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client represents Cerebras API client
type Client struct {
	baseURL    string
	apiKey     string
	model      string // Default model name
	httpClient *http.Client
}

// NewClient creates a new Cerebras API client
func NewClient(baseURL, apiKey, model string) *Client {
	if baseURL == "" {
		baseURL = "https://api.cerebras.ai"
	}
	if model == "" {
		model = "llama-4-scout-17b-16e-instruct" // Default model
	}
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// IsConfigured returns true if the Cerebras API key is set
func (c *Client) IsConfigured() bool {
	return c.apiKey != "" && c.apiKey != "your-cerebras-api-key-here"
}

// ModelInfo describes an available Cerebras model
type ModelInfo struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	IsDefault   bool   `json:"is_default"`
}

// AvailableModels returns the list of supported Cerebras models
func (c *Client) AvailableModels() []ModelInfo {
	return []ModelInfo{
		{ID: "qwen-3-32b", DisplayName: "Qwen 3 32B", Description: "High-capability reasoning model", IsDefault: false},
		{ID: "llama-4-scout-17b-16e-instruct", DisplayName: "Llama 4 Scout 17B", Description: "Meta Llama 4 Scout - balanced performance", IsDefault: true},
		{ID: "llama3.3-70b", DisplayName: "Llama 3.3 70B", Description: "Large model for complex tasks", IsDefault: false},
		{ID: "llama3.1-8b", DisplayName: "Llama 3.1 8B", Description: "Fast lightweight model", IsDefault: false},
		{ID: "deepseek-r1-distill-llama-70b", DisplayName: "DeepSeek R1 70B", Description: "DeepSeek R1 distilled on Llama 70B", IsDefault: false},
	}
}

// GetDefaultModel returns the default model ID
func (c *Client) GetDefaultModel() string {
	return c.model
}

// GenerateRequest represents request to Cerebras API
type GenerateRequest struct {
	Prompt      string  `json:"prompt"`
	Model       string  `json:"model,omitempty"` // Model name (e.g., "llama-3.1-8b")
	MaxTokens   int     `json:"max_tokens,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
	TopP        float64 `json:"top_p,omitempty"`
}

// GenerateResponse represents response from Cerebras API
type GenerateResponse struct {
	Text   string `json:"text"`
	Tokens int    `json:"tokens,omitempty"`
}

// ChatMessage represents a chat message
type ChatMessage struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

// ChatRequest represents chat request
type ChatRequest struct {
	Messages    []ChatMessage `json:"messages"`
	Model       string        `json:"model,omitempty"` // Model name (e.g., "llama-3.1-8b")
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
}

// ChatResponse represents chat response
type ChatResponse struct {
	Message ChatMessage `json:"message"`
	Tokens  int         `json:"tokens,omitempty"`
	Usage   struct {
		TotalTokens      int `json:"total_tokens"`
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage,omitempty"`
}

// Generate generates text using Cerebras API
func (c *Client) Generate(req *GenerateRequest) (*GenerateResponse, error) {
	// Set defaults
	if req.MaxTokens == 0 {
		req.MaxTokens = 500
	}
	if req.Temperature == 0 {
		req.Temperature = 0.7
	}

	// Set default model if not provided
	model := req.Model
	if model == "" {
		model = c.model
	}

	// Build request body
	requestBody := map[string]interface{}{
		"model":       model,
		"prompt":      req.Prompt,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
	}
	if req.TopP > 0 {
		requestBody["top_p"] = req.TopP
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", fmt.Sprintf("%s/v1/completions", c.baseURL), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	}

	// Make request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Parse response
	var apiResponse struct {
		Choices []struct {
			Text string `json:"text"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		// If response format is different, try to extract text directly
		var simpleResponse struct {
			Text string `json:"text"`
		}
		if err2 := json.Unmarshal(body, &simpleResponse); err2 == nil {
			return &GenerateResponse{
				Text:   simpleResponse.Text,
				Tokens: 0,
			}, nil
		}
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResponse.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	return &GenerateResponse{
		Text:   apiResponse.Choices[0].Text,
		Tokens: apiResponse.Usage.TotalTokens,
	}, nil
}

// Chat sends chat messages to Cerebras API
func (c *Client) Chat(req *ChatRequest) (*ChatResponse, error) {
	// Set defaults
	if req.MaxTokens == 0 {
		req.MaxTokens = 500
	}
	if req.Temperature == 0 {
		req.Temperature = 0.7
	}

	url := fmt.Sprintf("%s/v1/chat/completions", c.baseURL)
	
	// Set default model if not provided
	model := req.Model
	if model == "" {
		model = c.model
	}

	// Build request body
	requestBody := map[string]interface{}{
		"model":       model,
		"messages":    req.Messages,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	}

	// Make request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Parse response
	var apiResponse struct {
		Choices []struct {
			Message ChatMessage `json:"message"`
		} `json:"choices"`
		Usage struct {
			TotalTokens      int `json:"total_tokens"`
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		// If response format is different, try alternative format
		var simpleResponse struct {
			Message string `json:"message"`
		}
		if err2 := json.Unmarshal(body, &simpleResponse); err2 == nil {
			return &ChatResponse{
				Message: ChatMessage{
					Role:    "assistant",
					Content: simpleResponse.Message,
				},
				Tokens: 0,
			}, nil
		}
		return nil, fmt.Errorf("failed to parse response: %w, body: %s", err, string(body))
	}

	if len(apiResponse.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	return &ChatResponse{
		Message: apiResponse.Choices[0].Message,
		Tokens:  apiResponse.Usage.TotalTokens,
		Usage:   apiResponse.Usage,
	}, nil
}

// ChatWithUsage sends chat messages and returns detailed usage information
func (c *Client) ChatWithUsage(req *ChatRequest) (*ChatResponse, error) {
	return c.Chat(req)
}

// StreamCallback is called for each chunk of streamed content
type StreamCallback func(chunk string) error

// ChatStream sends chat messages and streams the response via callback
func (c *Client) ChatStream(req *ChatRequest, callback StreamCallback) (*ChatResponse, error) {
	if req.MaxTokens == 0 {
		req.MaxTokens = 4096
	}
	if req.Temperature == 0 {
		req.Temperature = 0.3
	}

	model := req.Model
	if model == "" {
		model = c.model
	}

	requestBody := map[string]interface{}{
		"model":       model,
		"messages":    req.Messages,
		"max_tokens":  req.MaxTokens,
		"temperature": req.Temperature,
		"stream":      true,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/chat/completions", c.baseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "text/event-stream")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	}

	// Use a client without timeout for streaming
	streamClient := &http.Client{Timeout: 120 * time.Second}
	resp, err := streamClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s (status: %d)", string(body), resp.StatusCode)
	}

	var fullContent strings.Builder
	var totalTokens int

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
			Usage struct {
				TotalTokens      int `json:"total_tokens"`
				PromptTokens     int `json:"prompt_tokens"`
				CompletionTokens int `json:"completion_tokens"`
			} `json:"usage"`
		}

		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}

		if chunk.Usage.TotalTokens > 0 {
			totalTokens = chunk.Usage.TotalTokens
		}

		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			content := chunk.Choices[0].Delta.Content
			fullContent.WriteString(content)
			if callback != nil {
				if err := callback(content); err != nil {
					return nil, err
				}
			}
		}
	}

	return &ChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: fullContent.String(),
		},
		Tokens: totalTokens,
	}, nil
}