package engine

import (
	"encoding/json"
	"strings"

	"github.com/gilabs/gims/api/internal/ai/domain/usecase/tools"
	"github.com/google/uuid"
)

const (
	toolCallOpen  = "<tool_call>"
	toolCallClose = "</tool_call>"
)

// ParseToolCall extracts a tool call from the LLM response.
// Returns:
//   - textBefore: text content before the tool call
//   - toolCall: parsed tool call (nil if no tool call found)
//   - textAfter: text content after the tool call
//
// The LLM format is:
//
//	Some reasoning text...
//	<tool_call>
//	{"name": "query_stock", "parameters": {"low_stock": true}}
//	</tool_call>
//	Optional text after...
func ParseToolCall(content string) (textBefore string, toolCall *tools.ToolCall, textAfter string) {
	openIdx := strings.Index(content, toolCallOpen)
	if openIdx == -1 {
		return content, nil, ""
	}

	closeIdx := strings.Index(content, toolCallClose)
	if closeIdx == -1 || closeIdx <= openIdx {
		return content, nil, ""
	}

	textBefore = strings.TrimSpace(content[:openIdx])
	textAfter = strings.TrimSpace(content[closeIdx+len(toolCallClose):])

	jsonStr := strings.TrimSpace(content[openIdx+len(toolCallOpen) : closeIdx])

	// Parse the JSON tool call
	var rawCall struct {
		Name       string                 `json:"name"`
		Parameters map[string]interface{} `json:"parameters"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &rawCall); err != nil {
		// If JSON parsing fails, return content as plain text
		return content, nil, ""
	}

	if rawCall.Name == "" {
		return content, nil, ""
	}

	toolCall = &tools.ToolCall{
		ID:         uuid.New().String(),
		Name:       rawCall.Name,
		Parameters: rawCall.Parameters,
	}

	if toolCall.Parameters == nil {
		toolCall.Parameters = make(map[string]interface{})
	}

	return textBefore, toolCall, textAfter
}

// ContainsToolCall checks if the content has a tool call without fully parsing it.
func ContainsToolCall(content string) bool {
	return strings.Contains(content, toolCallOpen) && strings.Contains(content, toolCallClose)
}
