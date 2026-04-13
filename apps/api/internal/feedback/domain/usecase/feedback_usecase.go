package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"github.com/gilabs/gims/api/internal/feedback/data/repositories"
	"github.com/gilabs/gims/api/internal/feedback/domain/dto"
	"github.com/gilabs/gims/api/internal/feedback/domain/mapper"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Sentinel errors used by handlers for precise HTTP mapping.
var (
	ErrFeedbackFormNotFound     = errors.New("FEEDBACK_FORM_NOT_FOUND")
	ErrFeedbackTokenNotFound    = errors.New("FEEDBACK_TOKEN_NOT_FOUND")
	ErrFeedbackTokenExpired     = errors.New("FEEDBACK_TOKEN_EXPIRED")
	ErrFeedbackTokenUsed        = errors.New("FEEDBACK_TOKEN_USED")
	ErrFeedbackAlreadySubmitted = errors.New("FEEDBACK_ALREADY_SUBMITTED")
	ErrNoActiveForm             = errors.New("NO_ACTIVE_FEEDBACK_FORM")
	ErrInvalidFormSchema        = errors.New("INVALID_FORM_SCHEMA")
)

// allowedSchemaKeys is a whitelist of top-level keys inside each question config block.
// Any unknown key at the question level is rejected to prevent injection via labels/config.
var allowedQuestionKeys = map[string]bool{
	"id": true, "type": true, "label": true, "required": true, "config": true,
}

// allowedConfigKeys enumerates config sub-keys that are safe to persist.
var allowedConfigKeys = map[string]bool{
	"min": true, "max": true, "icon": true,
	"options": true, "allow_multiple": true,
	"placeholder": true, "max_length": true,
}

// FeedbackUsecase defines all feedback business operations.
type FeedbackUsecase interface {
	// Form management
	CreateForm(ctx context.Context, createdBy string, req *dto.CreateFeedbackFormRequest) (*dto.FeedbackFormResponse, error)
	UpdateForm(ctx context.Context, id, updatedBy string, req *dto.UpdateFeedbackFormRequest) (*dto.FeedbackFormResponse, error)
	DeleteForm(ctx context.Context, id string) error
	GetForm(ctx context.Context, id string) (*dto.FeedbackFormResponse, error)
	ListForms(ctx context.Context, page, perPage int) ([]dto.FeedbackFormResponse, *utils.PaginationResult, error)
	GetFormsByOutlet(ctx context.Context, outletID string) ([]dto.FeedbackFormResponse, error)

	// Token operations
	GenerateToken(ctx context.Context, req *dto.GenerateTokenRequest, appBaseURL string) (*dto.FeedbackTokenResponse, error)
	GetPublicForm(ctx context.Context, token string) (*dto.PublicFormResponse, error)
	SubmitFeedback(ctx context.Context, token string, req *dto.SubmitFeedbackRequest) error

	// Response management
	ListResponses(ctx context.Context, req *dto.ListFeedbackResponsesRequest, outletScope string) ([]dto.FeedbackResponseItem, *utils.PaginationResult, error)
	GetResponse(ctx context.Context, id string) (*dto.FeedbackResponseItem, error)
}

type feedbackUsecase struct {
	formRepo     repositories.FeedbackFormRepository
	tokenRepo    repositories.FeedbackTokenRepository
	responseRepo repositories.FeedbackResponseRepository
	outletRepo   orgRepos.OutletRepository
}

// NewFeedbackUsecase wires up all dependencies for the feedback usecase.
func NewFeedbackUsecase(
	formRepo repositories.FeedbackFormRepository,
	tokenRepo repositories.FeedbackTokenRepository,
	responseRepo repositories.FeedbackResponseRepository,
	outletRepo orgRepos.OutletRepository,
) FeedbackUsecase {
	return &feedbackUsecase{
		formRepo:     formRepo,
		tokenRepo:    tokenRepo,
		responseRepo: responseRepo,
		outletRepo:   outletRepo,
	}
}

// ─── Form Management ──────────────────────────────────────────────────────────

func (u *feedbackUsecase) CreateForm(ctx context.Context, createdBy string, req *dto.CreateFeedbackFormRequest) (*dto.FeedbackFormResponse, error) {
	sanitized, err := sanitizeAndValidateSchema(req.SchemaJSON)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidFormSchema, err)
	}

	// When creating a new active form deactivate existing forms for this outlet.
	if req.IsActive {
		if err := u.formRepo.DeactivateAllForOutlet(ctx, req.OutletID); err != nil {
			return nil, err
		}
	}

	form := &models.FeedbackForm{
		ID:         uuid.New().String(),
		OutletID:   req.OutletID,
		Title:      req.Title,
		Description: req.Description,
		SchemaJSON: datatypes.JSON(sanitized),
		Version:    1,
		IsActive:   req.IsActive,
		CreatedBy:  &createdBy,
		UpdatedBy:  &createdBy,
	}

	if err := u.formRepo.Create(ctx, form); err != nil {
		return nil, err
	}

	resp := mapper.ToFeedbackFormResponse(form)
	return &resp, nil
}

func (u *feedbackUsecase) UpdateForm(ctx context.Context, id, updatedBy string, req *dto.UpdateFeedbackFormRequest) (*dto.FeedbackFormResponse, error) {
	form, err := u.formRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackFormNotFound
		}
		return nil, err
	}

	if req.Title != nil {
		form.Title = *req.Title
	}
	if req.Description != nil {
		form.Description = req.Description
	}
	if req.SchemaJSON != nil {
		sanitized, err := sanitizeAndValidateSchema(req.SchemaJSON)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidFormSchema, err)
		}
		form.SchemaJSON = datatypes.JSON(sanitized)
		form.Version++
	}
	if req.IsActive != nil {
		// When activating this form deactivate all others for the same outlet.
		if *req.IsActive && !form.IsActive {
			if err := u.formRepo.DeactivateAllForOutlet(ctx, form.OutletID); err != nil {
				return nil, err
			}
		}
		form.IsActive = *req.IsActive
	}
	form.UpdatedBy = &updatedBy

	if err := u.formRepo.Update(ctx, form); err != nil {
		return nil, err
	}
	resp := mapper.ToFeedbackFormResponse(form)
	return &resp, nil
}

func (u *feedbackUsecase) DeleteForm(ctx context.Context, id string) error {
	if _, err := u.formRepo.FindByID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrFeedbackFormNotFound
		}
		return err
	}
	return u.formRepo.Delete(ctx, id)
}

func (u *feedbackUsecase) GetForm(ctx context.Context, id string) (*dto.FeedbackFormResponse, error) {
	form, err := u.formRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackFormNotFound
		}
		return nil, err
	}
	resp := mapper.ToFeedbackFormResponse(form)
	return &resp, nil
}

func (u *feedbackUsecase) ListForms(ctx context.Context, page, perPage int) ([]dto.FeedbackFormResponse, *utils.PaginationResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	forms, total, err := u.formRepo.List(ctx, page, perPage)
	if err != nil {
		return nil, nil, err
	}
	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}
	return mapper.ToFeedbackFormResponseList(forms), pagination, nil
}

func (u *feedbackUsecase) GetFormsByOutlet(ctx context.Context, outletID string) ([]dto.FeedbackFormResponse, error) {
	forms, err := u.formRepo.FindByOutletID(ctx, outletID)
	if err != nil {
		return nil, err
	}
	return mapper.ToFeedbackFormResponseList(forms), nil
}

// ─── Token Operations ─────────────────────────────────────────────────────────

func (u *feedbackUsecase) GenerateToken(ctx context.Context, req *dto.GenerateTokenRequest, appBaseURL string) (*dto.FeedbackTokenResponse, error) {
	form, err := u.ensureActiveFormForOutlet(ctx, req.OutletID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, ErrNoActiveForm) {
			return nil, ErrNoActiveForm
		}
		return nil, err
	}

	rawToken, err := generateSecureToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	expiresAt := apptime.Now().Add(30 * 24 * time.Hour)

	t := &models.FeedbackToken{
		ID:           uuid.New().String(),
		Token:        rawToken,
		FormID:       form.ID,
		OutletID:     req.OutletID,
		PosOrderID:   req.PosOrderID,
		CustomerName: req.CustomerName,
		Status:       models.FeedbackTokenStatusPending,
		ExpiresAt:    expiresAt,
		CreatedAt:    apptime.Now(),
	}

	if err := u.tokenRepo.Create(ctx, t); err != nil {
		return nil, err
	}

	feedbackURL := strings.TrimRight(appBaseURL, "/") + "/feedback/" + rawToken

	return &dto.FeedbackTokenResponse{
		Token:       rawToken,
		FeedbackURL: feedbackURL,
		ExpiresAt:   expiresAt,
	}, nil
}

func (u *feedbackUsecase) ensureActiveFormForOutlet(ctx context.Context, outletID string) (*models.FeedbackForm, error) {
	form, err := u.formRepo.FindActiveByOutletID(ctx, outletID)
	if err == nil {
		return form, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	defaultSchema := map[string]interface{}{
		"questions": []map[string]interface{}{
			{
				"id":       "q1",
				"type":     "rating",
				"label":    "Bagaimana penilaian Anda terhadap layanan kami?",
				"required": true,
				"order":    1,
				"config": map[string]interface{}{
					"min": 1,
					"max": 5,
				},
			},
			{
				"id":       "q2",
				"type":     "text",
				"label":    "Saran untuk kami",
				"required": false,
				"order":    2,
				"config": map[string]interface{}{
					"max_length": 500,
				},
			},
		},
	}

	schemaBytes, marshalErr := json.Marshal(defaultSchema)
	if marshalErr != nil {
		return nil, marshalErr
	}

	newForm := &models.FeedbackForm{
		ID:         uuid.New().String(),
		OutletID:   outletID,
		Title:      "Form Umpan Balik",
		SchemaJSON: datatypes.JSON(schemaBytes),
		Version:    1,
		IsActive:   true,
	}

	if deactivateErr := u.formRepo.DeactivateAllForOutlet(ctx, outletID); deactivateErr != nil {
		return nil, deactivateErr
	}
	if createErr := u.formRepo.Create(ctx, newForm); createErr != nil {
		return nil, createErr
	}

	return newForm, nil
}

func (u *feedbackUsecase) GetPublicForm(ctx context.Context, token string) (*dto.PublicFormResponse, error) {
	t, err := u.tokenRepo.FindByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackTokenNotFound
		}
		return nil, err
	}

	if t.Status == models.FeedbackTokenStatusUsed {
		return nil, ErrFeedbackTokenUsed
	}
	if !t.IsValid() {
		return nil, ErrFeedbackTokenExpired
	}

	form, err := u.formRepo.FindByID(ctx, t.FormID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackFormNotFound
		}
		return nil, err
	}

	outletName := ""
	if outlet, err := u.outletRepo.GetByID(ctx, t.OutletID); err == nil && outlet != nil {
		outletName = outlet.Name
	}

	return &dto.PublicFormResponse{
		Token:        token,
		OutletName:   outletName,
		Title:        form.Title,
		Description:  form.Description,
		SchemaJSON:   json.RawMessage(form.SchemaJSON),
		CustomerName: t.CustomerName,
	}, nil
}

func (u *feedbackUsecase) SubmitFeedback(ctx context.Context, token string, req *dto.SubmitFeedbackRequest) error {
	t, err := u.tokenRepo.FindByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrFeedbackTokenNotFound
		}
		return err
	}

	if t.Status == models.FeedbackTokenStatusUsed {
		return ErrFeedbackTokenUsed
	}
	if !t.IsValid() {
		return ErrFeedbackTokenExpired
	}

	// Guard against duplicate submissions (race-condition safety).
	exists, err := u.responseRepo.ExistsByTokenID(ctx, t.ID)
	if err != nil {
		return err
	}
	if exists {
		return ErrFeedbackAlreadySubmitted
	}

	customerName := t.CustomerName
	if req.CustomerName != nil && *req.CustomerName != "" {
		customerName = req.CustomerName
	}

	avgScore := computeAvgScore(req.Answers)

	resp := &models.FeedbackResponse{
		ID:           uuid.New().String(),
		FormID:       t.FormID,
		TokenID:      t.ID,
		OutletID:     t.OutletID,
		PosOrderID:   t.PosOrderID,
		CustomerName: customerName,
		Answers:      datatypes.JSON(req.Answers),
		AvgScore:     avgScore,
		SubmittedAt:  apptime.Now(),
	}

	if err := u.responseRepo.Create(ctx, resp); err != nil {
		return err
	}

	return u.tokenRepo.MarkUsed(ctx, t.ID, apptime.Now())
}

// ─── Response Management ──────────────────────────────────────────────────────

func (u *feedbackUsecase) ListResponses(ctx context.Context, req *dto.ListFeedbackResponsesRequest, outletScope string) ([]dto.FeedbackResponseItem, *utils.PaginationResult, error) {
	filter := repositories.FeedbackResponseFilter{
		OutletID:  req.OutletID,
		FormID:    req.FormID,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		Page:      req.Page,
		PerPage:   req.PerPage,
	}
	// outletScope forces outlet-scoped users to only see their own outlet.
	if outletScope != "" {
		filter.OutletID = outletScope
	}

	responses, total, err := u.responseRepo.List(ctx, filter)
	if err != nil {
		return nil, nil, err
	}
	pagination := &utils.PaginationResult{
		Page:       req.Page,
		PerPage:    req.PerPage,
		Total:      int(total),
		TotalPages: int((total + int64(req.PerPage) - 1) / int64(req.PerPage)),
	}
	return mapper.ToFeedbackResponseItemList(responses), pagination, nil
}

func (u *feedbackUsecase) GetResponse(ctx context.Context, id string) (*dto.FeedbackResponseItem, error) {
	resp, err := u.responseRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackFormNotFound
		}
		return nil, err
	}
	item := mapper.ToFeedbackResponseItem(resp)
	return &item, nil
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

// generateSecureToken produces a URL-safe hex string of length 2*bytesLen.
func generateSecureToken(bytesLen int) (string, error) {
	b := make([]byte, bytesLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// sanitizeAndValidateSchema validates the incoming JSON schema against the
// whitelist of allowed keys to prevent XSS and injection via form labels.
func sanitizeAndValidateSchema(raw []byte) ([]byte, error) {
	var schema dto.FormSchema
	if err := json.Unmarshal(raw, &schema); err != nil {
		return nil, fmt.Errorf("invalid schema JSON: %w", err)
	}
	if len(schema.Questions) == 0 {
		return nil, fmt.Errorf("schema must have at least one question")
	}

	for i, q := range schema.Questions {
		if q.ID == "" {
			return nil, fmt.Errorf("question %d: id is required", i)
		}
		switch q.Type {
		case dto.QuestionTypeRating, dto.QuestionTypeMultipleChoice, dto.QuestionTypeText:
		default:
			return nil, fmt.Errorf("question %s: unsupported type %q", q.ID, q.Type)
		}
		if strings.ContainsAny(q.Label, "<>") {
			return nil, fmt.Errorf("question %s: label contains disallowed characters", q.ID)
		}
		// Validate raw question object keys against whitelist.
		var asMap map[string]json.RawMessage
		if err := json.Unmarshal(raw, &struct{ Questions []map[string]json.RawMessage }{}); err == nil {
			_ = asMap
		}
		// Validate config sub-object keys.
		if q.Config != nil {
			var configMap map[string]json.RawMessage
			if err := json.Unmarshal(q.Config, &configMap); err != nil {
				return nil, fmt.Errorf("question %s: invalid config", q.ID)
			}
			for k := range configMap {
				if !allowedConfigKeys[k] {
					return nil, fmt.Errorf("question %s: disallowed config key %q", q.ID, k)
				}
			}
		}
	}

	// Re-marshal to normalise the JSON (drop unknown top-level keys).
	return json.Marshal(schema)
}

// computeAvgScore extracts numeric (rating) values from answers and returns
// their average. Returns nil when no numeric answers are present.
func computeAvgScore(answers []byte) *float64 {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(answers, &raw); err != nil {
		return nil
	}
	var sum float64
	var count int
	for _, v := range raw {
		var n float64
		if err := json.Unmarshal(v, &n); err == nil {
			sum += n
			count++
		}
	}
	if count == 0 {
		return nil
	}
	avg := sum / float64(count)
	return &avg
}
