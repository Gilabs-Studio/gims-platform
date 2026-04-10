// Package usecase contains the rewritten AI chat business logic using
// Claude Code-inspired context engineering: modular system prompt, tool registry,
// multi-turn conversation engine with tool loop, and SSE streaming.
//
// This file (chat_engine_usecase.go) replaces the core message processing flow
// while maintaining backward compatibility with existing endpoints.
package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/ai/data/models"
	"github.com/gilabs/gims/api/internal/ai/data/repositories"
	"github.com/gilabs/gims/api/internal/ai/domain/dto"
	aiContext "github.com/gilabs/gims/api/internal/ai/domain/usecase/context"
	"github.com/gilabs/gims/api/internal/ai/domain/usecase/engine"
	"github.com/gilabs/gims/api/internal/ai/domain/usecase/tools"
	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/cerebras"
	"github.com/gilabs/gims/api/internal/core/utils"
)

// ChatEngineUsecase implements the new AI chat interface using the conversation engine.
type ChatEngineUsecase struct {
	sessionRepo    repositories.ChatSessionRepository
	messageRepo    repositories.ChatMessageRepository
	actionRepo     repositories.ActionLogRepository
	cerebrasClient *cerebras.Client
	contextBuilder *aiContext.Builder
	engine         *engine.Engine
	toolRegistry   *tools.Registry
	entityResolver *EntityResolver
}

// NewChatEngineUsecase creates the engine-based usecase.
func NewChatEngineUsecase(
	sessionRepo repositories.ChatSessionRepository,
	messageRepo repositories.ChatMessageRepository,
	actionRepo repositories.ActionLogRepository,
	cerebrasClient *cerebras.Client,
	toolRegistry *tools.Registry,
	contextBuilder *aiContext.Builder,
	entityResolver *EntityResolver,
) *ChatEngineUsecase {
	return &ChatEngineUsecase{
		sessionRepo:    sessionRepo,
		messageRepo:    messageRepo,
		actionRepo:     actionRepo,
		cerebrasClient: cerebrasClient,
		contextBuilder: contextBuilder,
		engine:         engine.NewEngine(cerebrasClient, toolRegistry, contextBuilder),
		toolRegistry:   toolRegistry,
		entityResolver: entityResolver,
	}
}

// SendMessage processes a user message through the conversation engine.
func (u *ChatEngineUsecase) SendMessage(ctx context.Context, req *dto.SendMessageRequest, userID string, userPermissions map[string]bool, isAdmin bool) (*dto.ChatResponse, error) {
	start := apptime.Now()

	if !u.cerebrasClient.IsConfigured() {
		return nil, fmt.Errorf("AI_SERVICE_NOT_CONFIGURED: Cerebras AI is not configured")
	}

	// Get or create session
	session, err := u.getOrCreateSession(ctx, req.SessionID, userID)
	if err != nil {
		return nil, err
	}

	// IDOR prevention
	if session.UserID != userID {
		return nil, fmt.Errorf("FORBIDDEN: you do not have access to this session")
	}

	// Check for pending action confirmation/cancellation
	if req.SessionID != nil && *req.SessionID != "" {
		pendingAction, pendingErr := u.actionRepo.FindPendingBySessionID(ctx, session.ID)
		if pendingErr == nil && pendingAction != nil {
			if isAffirmativeMessage(req.Message) {
				return u.ConfirmAction(ctx, &dto.ConfirmActionRequest{
					ActionID:  pendingAction.ID,
					Confirmed: true,
				}, userID, userPermissions, isAdmin)
			}
			if isNegativeMessage(req.Message) {
				return u.ConfirmAction(ctx, &dto.ConfirmActionRequest{
					ActionID:  pendingAction.ID,
					Confirmed: false,
				}, userID, userPermissions, isAdmin)
			}
			// Cancel stale pending action and process as new request
			pendingAction.Status = models.ActionStatusCancelled
			_ = u.actionRepo.Update(ctx, pendingAction)
		}
	}

	// Save user message
	userMsg := &models.AIChatMessage{
		SessionID: session.ID,
		Role:      models.MessageRoleUser,
		Content:   req.Message,
	}
	if err := u.messageRepo.Create(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to save user message: %w", err)
	}

	// Load conversation history
	history, err := u.messageRepo.FindBySessionID(ctx, session.ID, engine.MaxContextMessages)
	if err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to load conversation history: %w", err)
	}

	// Convert to engine message format
	engineHistory := u.toEngineMessages(history)

	// Build user context for the context builder
	userCtx := u.buildUserContext(userID, userPermissions, isAdmin, session.ID)

	// Load recent actions for context continuity
	recentActions, _ := u.actionRepo.FindBySessionID(ctx, session.ID)
	// Limit to last 5 for context
	if len(recentActions) > 5 {
		recentActions = recentActions[len(recentActions)-5:]
	}
	if len(recentActions) > 0 {
		for _, a := range recentActions {
			userCtx.RecentActions = append(userCtx.RecentActions, aiContext.RecentAction{
				Intent:    a.Intent,
				Module:    a.EntityType,
				Status:    string(a.Status),
				CreatedAt: a.CreatedAt,
			})
		}
	}

	// Select model
	model := u.cerebrasClient.GetDefaultModel()
	if req.Model != "" {
		model = req.Model
	}

	// Process through the conversation engine
	result, err := u.engine.ProcessMessage(ctx, req.Message, engineHistory, userCtx, model)
	if err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: %w", err)
	}

	// Handle tool calls requiring confirmation
	if result.RequiresConfirmation && result.PendingToolCall != nil {
		return u.createPendingToolAction(ctx, session, result, userID, start)
	}

	// Log executed tool calls
	for _, tcr := range result.ToolCallResults {
		u.logToolCall(ctx, session.ID, userID, tcr)
	}

	// Save assistant response
	return u.saveEngineResponse(ctx, session, result, start)
}

// SendMessageStream processes a message with SSE streaming.
func (u *ChatEngineUsecase) SendMessageStream(ctx context.Context, req *dto.SendMessageRequest, userID string, userPermissions map[string]bool, isAdmin bool, eventChan chan<- tools.StreamEvent) error {
	if !u.cerebrasClient.IsConfigured() {
		eventChan <- tools.StreamEvent{
			Type:    tools.EventError,
			Content: "AI service is not configured",
		}
		return fmt.Errorf("AI_SERVICE_NOT_CONFIGURED")
	}

	session, err := u.getOrCreateSession(ctx, req.SessionID, userID)
	if err != nil {
		return err
	}
	if session.UserID != userID {
		return fmt.Errorf("FORBIDDEN: you do not have access to this session")
	}

	// Intercept pending action confirmation/cancellation — mirrors the sync SendMessage path.
	// Without this check, user replies like "ya"/"yes" would re-enter the engine and trigger
	// a new NeedsConfirmation loop instead of executing the already-queued action.
	if req.SessionID != nil && *req.SessionID != "" {
		pendingAction, pendingErr := u.actionRepo.FindPendingBySessionID(ctx, session.ID)
		if pendingErr == nil && pendingAction != nil {
			model := u.cerebrasClient.GetDefaultModel()
			if req.Model != "" {
				model = req.Model
			}
			eventChan <- tools.StreamEvent{
				Type: tools.EventMessageStart,
				Data: map[string]string{"session_id": session.ID},
			}
			if isAffirmativeMessage(req.Message) {
				return u.confirmActionStream(ctx, pendingAction, session, userID, userPermissions, isAdmin, req.Message, model, eventChan)
			}
			if isNegativeMessage(req.Message) {
				return u.cancelActionStream(ctx, pendingAction, session, req.Message, eventChan)
			}
			// Unrecognised reply — cancel stale action and continue as a new request
			pendingAction.Status = models.ActionStatusCancelled
			_ = u.actionRepo.Update(ctx, pendingAction)
		}
	}

	// Save user message
	userMsg := &models.AIChatMessage{
		SessionID: session.ID,
		Role:      models.MessageRoleUser,
		Content:   req.Message,
	}
	if err := u.messageRepo.Create(ctx, userMsg); err != nil {
		return fmt.Errorf("AI_CHAT_FAILED: failed to save user message: %w", err)
	}

	// Load history and context
	history, _ := u.messageRepo.FindBySessionID(ctx, session.ID, engine.MaxContextMessages)
	engineHistory := u.toEngineMessages(history)
	userCtx := u.buildUserContext(userID, userPermissions, isAdmin, session.ID)

	model := u.cerebrasClient.GetDefaultModel()
	if req.Model != "" {
		model = req.Model
	}

	// Send session_id as first event
	eventChan <- tools.StreamEvent{
		Type: tools.EventMessageStart,
		Data: map[string]string{"session_id": session.ID},
	}

	// Process with streaming — now returns the accumulated result for DB persistence
	start := apptime.Now()
	result, processErr := u.engine.ProcessMessageStream(ctx, req.Message, engineHistory, userCtx, model, eventChan)
	if processErr != nil {
		return processErr
	}

	// Persist the assistant response so it appears in subsequent session reads
	if result != nil {
		if result.RequiresConfirmation && result.PendingToolCall != nil {
			// Create an action log record so the next "ya"/"yes" can be intercepted above
			if _, saveErr := u.createPendingToolAction(ctx, session, result, userID, start); saveErr != nil {
				log.Printf("[AI] warning: failed to create pending tool action: %v", saveErr)
			}
		} else if result.Response != "" {
			if _, saveErr := u.saveEngineResponse(ctx, session, result, start); saveErr != nil {
				log.Printf("[AI] warning: failed to save engine response: %v", saveErr)
			}
		}
	}

	return nil
}

// ConfirmAction processes user confirmation of a pending tool action.
func (u *ChatEngineUsecase) ConfirmAction(ctx context.Context, req *dto.ConfirmActionRequest, userID string, userPermissions map[string]bool, isAdmin bool) (*dto.ChatResponse, error) {
	start := apptime.Now()

	action, err := u.actionRepo.FindByID(ctx, req.ActionID)
	if err != nil {
		return nil, fmt.Errorf("AI_ACTION_NOT_FOUND: action not found: %w", err)
	}

	if action.UserID != userID {
		return nil, fmt.Errorf("FORBIDDEN: you do not have access to this action")
	}
	if action.Status != models.ActionStatusPendingConfirmation {
		return nil, fmt.Errorf("AI_ACTION_INVALID_STATE: action is not pending confirmation (current: %s)", action.Status)
	}

	session, err := u.sessionRepo.FindByID(ctx, action.SessionID)
	if err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: session not found: %w", err)
	}

	if !req.Confirmed {
		action.Status = models.ActionStatusCancelled
		_ = u.actionRepo.Update(ctx, action)
		return u.saveSimpleResponse(ctx, session, "Tindakan dibatalkan. Ada yang bisa saya bantu lagi?", start)
	}

	// Execute the confirmed tool
	tool := u.toolRegistry.Get(strings.ToLower(action.Intent))
	if tool == nil {
		action.Status = models.ActionStatusFailed
		action.ErrorMessage = "Tool no longer available"
		_ = u.actionRepo.Update(ctx, action)
		return nil, fmt.Errorf("AI_CHAT_FAILED: tool '%s' not found in registry", action.Intent)
	}

	var storedParams map[string]interface{}
	if action.RequestPayload != nil {
		_ = json.Unmarshal([]byte(*action.RequestPayload), &storedParams)
	}

	execCtx := &tools.ExecutionContext{
		UserID:          userID,
		UserPermissions: userPermissions,
		IsAdmin:         isAdmin,
		SessionID:       session.ID,
	}

	toolResult, execErr := tool.Execute(ctx, storedParams, execCtx)

	if execErr != nil || (toolResult != nil && !toolResult.Success) {
		action.Status = models.ActionStatusFailed
		if execErr != nil {
			action.ErrorMessage = execErr.Error()
		} else if toolResult != nil {
			action.ErrorMessage = toolResult.ErrorMessage
		}
		_ = u.actionRepo.Update(ctx, action)

		errMsg := "Tindakan gagal."
		if toolResult != nil && toolResult.ErrorMessage != "" {
			errMsg = fmt.Sprintf("Maaf, tindakan gagal: %s", toolResult.ErrorMessage)
		}
		return u.saveSimpleResponse(ctx, session, errMsg, start)
	}

	// Success
	action.Status = models.ActionStatusSuccess
	if toolResult.EntityID != "" {
		action.EntityID = &toolResult.EntityID
	}
	responseJSON, _ := json.Marshal(toolResult.Data)
	respStr := string(responseJSON)
	action.ResponsePayload = &respStr
	action.DurationMs = int(toolResult.DurationMs)
	_ = u.actionRepo.Update(ctx, action)

	assistantContent := fmt.Sprintf("Tindakan berhasil dilakukan. %s", toolResult.Message)
	return u.saveSimpleResponse(ctx, session, assistantContent, start)
}

// ListSessions returns paginated sessions
func (u *ChatEngineUsecase) ListSessions(ctx context.Context, req *dto.ListSessionsRequest, userID string) ([]dto.SessionListResponse, *utils.PaginationResult, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PerPage < 1 || req.PerPage > 100 {
		req.PerPage = 20
	}

	sessions, total, err := u.sessionRepo.FindByUserID(ctx, userID, req.Page, req.PerPage, req.Status, req.Search)
	if err != nil {
		return nil, nil, fmt.Errorf("AI_CHAT_FAILED: failed to list sessions: %w", err)
	}

	responses := make([]dto.SessionListResponse, len(sessions))
	for i, s := range sessions {
		responses[i] = dto.SessionListResponse{
			ID:           s.ID,
			Title:        s.Title,
			Status:       string(s.Status),
			LastActivity: formatTimePtr(s.LastActivity),
			MessageCount: s.MessageCount,
			CreatedAt:    s.CreatedAt.Format(time.RFC3339),
		}
	}

	pagination := &utils.PaginationResult{
		Page:       req.Page,
		PerPage:    req.PerPage,
		Total:      int(total),
		TotalPages: int((total + int64(req.PerPage) - 1) / int64(req.PerPage)),
	}

	return responses, pagination, nil
}

// GetSessionDetail returns a session with messages
func (u *ChatEngineUsecase) GetSessionDetail(ctx context.Context, sessionID string, userID string) (*dto.SessionDetailResponse, error) {
	session, err := u.sessionRepo.FindByIDWithMessages(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("AI_SESSION_NOT_FOUND: session not found: %w", err)
	}

	if session.UserID != userID {
		return nil, fmt.Errorf("FORBIDDEN: you do not have access to this session")
	}

	messages := make([]dto.MessageResponse, len(session.Messages))
	for i, m := range session.Messages {
		messages[i] = dto.MessageResponse{
			ID:         m.ID,
			Role:       string(m.Role),
			Content:    m.Content,
			Intent:     m.Intent,
			Model:      m.Model,
			DurationMs: m.DurationMs,
			CreatedAt:  m.CreatedAt.Format(time.RFC3339),
		}
	}

	// Check for pending action
	var pendingAction *dto.ActionPreview
	if pending, err := u.actionRepo.FindPendingBySessionID(ctx, session.ID); err == nil && pending != nil {
		pendingAction = &dto.ActionPreview{
			ID:     pending.ID,
			Intent: pending.Intent,
			Status: string(pending.Status),
		}
		if pending.RequestPayload != nil {
			var preview interface{}
			if err := json.Unmarshal([]byte(*pending.RequestPayload), &preview); err == nil {
				pendingAction.PayloadPreview = preview
			}
		}
	}

	resp := &dto.SessionDetailResponse{
		ID:            session.ID,
		Title:         session.Title,
		Status:        string(session.Status),
		LastActivity:  formatTimePtr(session.LastActivity),
		MessageCount:  session.MessageCount,
		Messages:      messages,
		PendingAction: pendingAction,
		CreatedAt:     session.CreatedAt.Format(time.RFC3339),
	}

	return resp, nil
}

// DeleteSession soft deletes a session
func (u *ChatEngineUsecase) DeleteSession(ctx context.Context, sessionID string, userID string) error {
	session, err := u.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("AI_SESSION_NOT_FOUND: session not found: %w", err)
	}
	if session.UserID != userID {
		return fmt.Errorf("FORBIDDEN: you do not have access to this session")
	}
	return u.sessionRepo.Delete(ctx, sessionID)
}

// ListActions returns paginated action logs (admin)
func (u *ChatEngineUsecase) ListActions(ctx context.Context, req *dto.ListActionsRequest) ([]dto.ActionLogResponse, *utils.PaginationResult, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PerPage < 1 || req.PerPage > 100 {
		req.PerPage = 20
	}

	actions, total, err := u.actionRepo.FindAll(ctx, req.Page, req.PerPage, req.UserID, req.Intent, req.Status)
	if err != nil {
		return nil, nil, fmt.Errorf("AI_CHAT_FAILED: failed to list actions: %w", err)
	}

	responses := make([]dto.ActionLogResponse, len(actions))
	for i, a := range actions {
		responses[i] = dto.ActionLogResponse{
			ID:         a.ID,
			SessionID:  a.SessionID,
			UserID:     a.UserID,
			Intent:     a.Intent,
			EntityType: a.EntityType,
			Action:     string(a.Action),
			Status:     string(a.Status),
			DurationMs: a.DurationMs,
			CreatedAt:  a.CreatedAt.Format(time.RFC3339),
		}
		if a.EntityID != nil {
			responses[i].EntityID = *a.EntityID
		}
		if a.ErrorMessage != "" {
			responses[i].ErrorMessage = a.ErrorMessage
		}
	}

	pagination := &utils.PaginationResult{
		Page:       req.Page,
		PerPage:    req.PerPage,
		Total:      int(total),
		TotalPages: int((total + int64(req.PerPage) - 1) / int64(req.PerPage)),
	}

	return responses, pagination, nil
}

// GetIntentRegistry returns all active intents
func (u *ChatEngineUsecase) GetIntentRegistry(ctx context.Context) ([]dto.IntentRegistryResponse, error) {
	return nil, fmt.Errorf("use the tool registry instead")
}

// --- Private helpers ---

func (u *ChatEngineUsecase) getOrCreateSession(ctx context.Context, sessionID *string, userID string) (*models.AIChatSession, error) {
	if sessionID != nil && *sessionID != "" {
		session, err := u.sessionRepo.FindByID(ctx, *sessionID)
		if err != nil {
			return nil, fmt.Errorf("AI_SESSION_NOT_FOUND: session not found: %w", err)
		}
		_ = u.sessionRepo.UpdateLastActivity(ctx, session.ID)
		return session, nil
	}

	now := apptime.Now()
	session := &models.AIChatSession{
		UserID:       userID,
		Title:        "New Chat",
		Status:       "ACTIVE",
		LastActivity: &now,
	}
	if err := u.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to create session: %w", err)
	}
	return session, nil
}

func (u *ChatEngineUsecase) toEngineMessages(messages []models.AIChatMessage) []engine.ConversationMessage {
	result := make([]engine.ConversationMessage, len(messages))
	for i, m := range messages {
		result[i] = engine.ConversationMessage{
			Role:    string(m.Role),
			Content: m.Content,
		}
	}
	return result
}

func (u *ChatEngineUsecase) buildUserContext(userID string, permissions map[string]bool, isAdmin bool, sessionID string) *aiContext.UserContext {
	return &aiContext.UserContext{
		UserID:      userID,
		IsAdmin:     isAdmin,
		Permissions: permissions,
		Locale:      "id", // Default to Indonesian
	}
}

func (u *ChatEngineUsecase) saveEngineResponse(ctx context.Context, session *models.AIChatSession, result *engine.EngineResult, start time.Time) (*dto.ChatResponse, error) {
	durationMs := time.Since(start).Milliseconds()

	// Build metadata from engine result
	metadata := map[string]interface{}{
		"turn_count":       result.TurnCount,
		"tool_calls_count": len(result.ToolCallResults),
	}
	metadataJSON, _ := json.Marshal(metadata)
	metaStr := string(metadataJSON)

	assistantMsg := &models.AIChatMessage{
		SessionID:  session.ID,
		Role:       models.MessageRoleAssistant,
		Content:    result.Response,
		Intent:     &metaStr,
		DurationMs: int(durationMs),
	}
	if err := u.messageRepo.Create(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to save assistant message: %w", err)
	}

	_ = u.sessionRepo.IncrementMessageCount(ctx, session.ID)
	_ = u.sessionRepo.UpdateLastActivity(ctx, session.ID)

	// Auto-generate title from first exchange
	if session.Title == "New Chat" && result.Response != "" {
		title := result.Response
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		session.Title = title
		_ = u.sessionRepo.Update(ctx, session)
	}

	return &dto.ChatResponse{
		SessionID: session.ID,
		Message: dto.MessageResponse{
			ID:         assistantMsg.ID,
			Role:       string(assistantMsg.Role),
			Content:    assistantMsg.Content,
			DurationMs: assistantMsg.DurationMs,
			CreatedAt:  assistantMsg.CreatedAt.Format(time.RFC3339),
		},
		TokenUsage: &dto.TokenUsageResponse{TotalTokens: 0},
	}, nil
}

func (u *ChatEngineUsecase) saveSimpleResponse(ctx context.Context, session *models.AIChatSession, content string, start time.Time) (*dto.ChatResponse, error) {
	durationMs := time.Since(start).Milliseconds()

	assistantMsg := &models.AIChatMessage{
		SessionID:  session.ID,
		Role:       models.MessageRoleAssistant,
		Content:    content,
		DurationMs: int(durationMs),
	}
	if err := u.messageRepo.Create(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to save assistant message: %w", err)
	}

	_ = u.sessionRepo.IncrementMessageCount(ctx, session.ID)
	_ = u.sessionRepo.UpdateLastActivity(ctx, session.ID)

	return &dto.ChatResponse{
		SessionID: session.ID,
		Message: dto.MessageResponse{
			ID:         assistantMsg.ID,
			Role:       string(assistantMsg.Role),
			Content:    assistantMsg.Content,
			DurationMs: assistantMsg.DurationMs,
			CreatedAt:  assistantMsg.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

// confirmActionStream executes a confirmed pending action and streams the formatted response.
// Called from SendMessageStream when the user sends an affirmative reply ("ya", "yes", etc.)
// while there is a pending action awaiting approval.
func (u *ChatEngineUsecase) confirmActionStream(
	ctx context.Context,
	action *models.AIActionLog,
	session *models.AIChatSession,
	userID string,
	userPermissions map[string]bool,
	isAdmin bool,
	userMessage string,
	model string,
	eventChan chan<- tools.StreamEvent,
) error {
	start := apptime.Now()

	// Persist the user's confirmation message for history continuity
	userMsg := &models.AIChatMessage{
		SessionID: session.ID,
		Role:      models.MessageRoleUser,
		Content:   userMessage,
	}
	_ = u.messageRepo.Create(ctx, userMsg)

	tool := u.toolRegistry.Get(strings.ToLower(action.Intent))
	if tool == nil {
		action.Status = models.ActionStatusFailed
		action.ErrorMessage = "Tool no longer available"
		_ = u.actionRepo.Update(ctx, action)
		resp := fmt.Sprintf("Maaf, tindakan '%s' tidak dapat dijalankan karena tool tidak tersedia.", action.Intent)
		eventChan <- tools.StreamEvent{Type: tools.EventContentDelta, Content: resp}
		eventChan <- tools.StreamEvent{Type: tools.EventMessageEnd, Data: map[string]interface{}{"duration_ms": time.Since(start).Milliseconds()}}
		result := &engine.EngineResult{Response: resp, TurnCount: 1, TotalDurationMs: time.Since(start).Milliseconds()}
		_, _ = u.saveEngineResponse(ctx, session, result, start)
		return nil
	}

	// Decode stored parameters
	var storedParams map[string]interface{}
	if action.RequestPayload != nil {
		_ = json.Unmarshal([]byte(*action.RequestPayload), &storedParams)
	}

	execCtx := &tools.ExecutionContext{
		UserID:          userID,
		UserPermissions: userPermissions,
		IsAdmin:         isAdmin,
		SessionID:       session.ID,
	}

	// Emit tool_call event so the UI shows a status card
	eventChan <- tools.StreamEvent{
		Type: tools.EventToolCall,
		Data: map[string]interface{}{"name": strings.ToLower(action.Intent), "parameters": storedParams},
	}

	toolResult, execErr := tool.Execute(ctx, storedParams, execCtx)

	// Emit tool_result event
	var errStr string
	if execErr != nil {
		errStr = execErr.Error()
	}
	eventChan <- tools.StreamEvent{
		Type: tools.EventToolResult,
		Data: map[string]interface{}{
			"call":   map[string]interface{}{"name": action.Intent, "parameters": storedParams},
			"result": toolResult,
			"error":  errStr,
		},
	}

	// Update action status in DB
	if execErr != nil || toolResult == nil || !toolResult.Success {
		action.Status = models.ActionStatusFailed
		if execErr != nil {
			action.ErrorMessage = execErr.Error()
		} else if toolResult != nil {
			action.ErrorMessage = toolResult.ErrorMessage
		}
		_ = u.actionRepo.Update(ctx, action)
	} else {
		action.Status = models.ActionStatusSuccess
		_ = u.actionRepo.Update(ctx, action)
	}

	// Use Cerebras to format the tool result as a natural language response
	availableTools := u.toolRegistry.FilterByPermissions(userPermissions, isAdmin)
	userCtx := u.buildUserContext(userID, userPermissions, isAdmin, session.ID)
	systemPrompt := u.contextBuilder.BuildFlatSystemPrompt(availableTools, userCtx, u.toolRegistry)

	toolResultJSON, _ := json.Marshal(toolResult)
	presentationPrompt := fmt.Sprintf(
		"Tool '%s' telah dijalankan. Berikut hasilnya:\n\n%s\n\nSajikan hasil ini kepada pengguna secara jelas dan terformat. Sertakan tautan navigasi yang relevan jika data ditampilkan.",
		strings.ToLower(action.Intent), string(toolResultJSON),
	)

	messages := []cerebras.ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: presentationPrompt},
	}

	var fullResponse strings.Builder
	emittedLen := 0
	_, streamErr := u.cerebrasClient.ChatStream(&cerebras.ChatRequest{
		Model:       model,
		Messages:    messages,
		Temperature: 0.3,
		MaxTokens:   2048,
	}, func(chunk string) error {
		fullResponse.WriteString(chunk)
		current := fullResponse.String()
		if len(current) > emittedLen {
			eventChan <- tools.StreamEvent{Type: tools.EventContentDelta, Content: current[emittedLen:]}
			emittedLen = len(current)
		}
		return nil
	})

	responseText := strings.TrimSpace(fullResponse.String())
	if streamErr != nil || responseText == "" {
		if execErr != nil {
			responseText = fmt.Sprintf("Tindakan gagal: %v", execErr)
		} else {
			responseText = fmt.Sprintf("Tindakan '%s' berhasil dijalankan.", strings.ToLower(action.Intent))
		}
		eventChan <- tools.StreamEvent{Type: tools.EventContentDelta, Content: responseText}
	}

	durationMs := time.Since(start).Milliseconds()
	eventChan <- tools.StreamEvent{
		Type: tools.EventMessageEnd,
		Data: map[string]interface{}{"duration_ms": durationMs},
	}

	result := &engine.EngineResult{Response: responseText, TurnCount: 1, TotalDurationMs: durationMs}
	_, _ = u.saveEngineResponse(ctx, session, result, start)
	return nil
}

// cancelActionStream cancels a pending action and streams a brief acknowledgement.
func (u *ChatEngineUsecase) cancelActionStream(
	ctx context.Context,
	action *models.AIActionLog,
	session *models.AIChatSession,
	userMessage string,
	eventChan chan<- tools.StreamEvent,
) error {
	start := apptime.Now()

	_ = u.messageRepo.Create(ctx, &models.AIChatMessage{
		SessionID: session.ID,
		Role:      models.MessageRoleUser,
		Content:   userMessage,
	})

	action.Status = models.ActionStatusCancelled
	_ = u.actionRepo.Update(ctx, action)

	resp := "Tindakan dibatalkan. Ada yang bisa saya bantu lagi?"
	eventChan <- tools.StreamEvent{Type: tools.EventContentDelta, Content: resp}
	eventChan <- tools.StreamEvent{
		Type: tools.EventMessageEnd,
		Data: map[string]interface{}{"duration_ms": time.Since(start).Milliseconds()},
	}

	result := &engine.EngineResult{Response: resp, TurnCount: 1, TotalDurationMs: time.Since(start).Milliseconds()}
	_, _ = u.saveEngineResponse(ctx, session, result, start)
	return nil
}

func (u *ChatEngineUsecase) createPendingToolAction(ctx context.Context, session *models.AIChatSession, result *engine.EngineResult, userID string, start time.Time) (*dto.ChatResponse, error) {
	tc := result.PendingToolCall
	requestJSON, _ := json.Marshal(tc.Parameters)
	reqPayload := string(requestJSON)

	tool := u.toolRegistry.Get(tc.Name)
	entityType := ""
	actionType := ""
	if tool != nil {
		entityType = tool.Module()
		actionType = tool.Category()
	}

	actionLog := &models.AIActionLog{
		SessionID:      session.ID,
		UserID:         userID,
		Intent:         strings.ToUpper(tc.Name),
		EntityType:     entityType,
		Action:         models.ActionType(strings.ToUpper(actionType)),
		RequestPayload: &reqPayload,
		Status:         models.ActionStatusPendingConfirmation,
	}

	if err := u.actionRepo.Create(ctx, actionLog); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to create pending action: %w", err)
	}

	// Save the confirmation message
	assistantContent := result.Response
	durationMs := time.Since(start).Milliseconds()

	assistantMsg := &models.AIChatMessage{
		SessionID:  session.ID,
		Role:       models.MessageRoleAssistant,
		Content:    assistantContent,
		DurationMs: int(durationMs),
	}
	if err := u.messageRepo.Create(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("AI_CHAT_FAILED: failed to save assistant message: %w", err)
	}

	_ = u.sessionRepo.IncrementMessageCount(ctx, session.ID)
	_ = u.sessionRepo.UpdateLastActivity(ctx, session.ID)

	return &dto.ChatResponse{
		SessionID:            session.ID,
		Message: dto.MessageResponse{
			ID:         assistantMsg.ID,
			Role:       string(assistantMsg.Role),
			Content:    assistantContent,
			DurationMs: assistantMsg.DurationMs,
			CreatedAt:  assistantMsg.CreatedAt.Format(time.RFC3339),
		},
		Action: &dto.ActionPreview{
			ID:     actionLog.ID,
			Intent: actionLog.Intent,
			Status: string(actionLog.Status),
		},
		RequiresConfirmation: true,
	}, nil
}

func (u *ChatEngineUsecase) logToolCall(ctx context.Context, sessionID, userID string, tcr tools.ToolCallResult) {
	requestJSON, _ := json.Marshal(tcr.Call.Parameters)
	reqStr := string(requestJSON)

	actionLog := &models.AIActionLog{
		SessionID:      sessionID,
		UserID:         userID,
		Intent:         strings.ToUpper(tcr.Call.Name),
		Action:         models.ActionType("QUERY"),
		RequestPayload: &reqStr,
	}

	if tcr.Result != nil {
		actionLog.EntityType = tcr.Result.EntityType
		if tcr.Result.EntityID != "" {
			actionLog.EntityID = &tcr.Result.EntityID
		}
		actionLog.Action = models.ActionType(tcr.Result.Action)
		actionLog.DurationMs = int(tcr.Result.DurationMs)

		if tcr.Result.Success {
			actionLog.Status = models.ActionStatusSuccess
			responseJSON, _ := json.Marshal(tcr.Result.Data)
			respStr := string(responseJSON)
			actionLog.ResponsePayload = &respStr
		} else {
			actionLog.Status = models.ActionStatusFailed
			actionLog.ErrorMessage = tcr.Result.ErrorMessage
		}
	} else if tcr.Error != "" {
		actionLog.Status = models.ActionStatusFailed
		actionLog.ErrorMessage = tcr.Error
	}

	_ = u.actionRepo.Create(ctx, actionLog)
}

func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}
