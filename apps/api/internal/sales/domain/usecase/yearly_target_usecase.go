package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/utils"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrYearlyTargetNotFound = errors.New("yearly target not found")
)

// YearlyTargetUsecase defines the interface for yearly target business logic
type YearlyTargetUsecase interface {
	List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]dto.YearlyTargetResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.YearlyTargetResponse, error)
	Create(ctx context.Context, req *dto.CreateYearlyTargetRequest) (*dto.YearlyTargetResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateYearlyTargetRequest) (*dto.YearlyTargetResponse, error)
	Delete(ctx context.Context, id string) error
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesTargetAuditTrailEntry, int64, error)
}

type yearlyTargetUsecase struct {
	db           *gorm.DB
	targetRepo   salesRepos.YearlyTargetRepository
	auditService audit.AuditService
}

// NewYearlyTargetUsecase creates a new YearlyTargetUsecase
func NewYearlyTargetUsecase(db *gorm.DB, targetRepo salesRepos.YearlyTargetRepository, auditService audit.AuditService) YearlyTargetUsecase {
	return &yearlyTargetUsecase{db: db, targetRepo: targetRepo, auditService: auditService}
}

func (u *yearlyTargetUsecase) List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]dto.YearlyTargetResponse, *utils.PaginationResult, error) {
	targets, total, err := u.targetRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.YearlyTargetResponse, len(targets))
	for i := range targets {
		responses[i] = mapper.ToYearlyTargetResponse(&targets[i])
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *yearlyTargetUsecase) GetByID(ctx context.Context, id string) (*dto.YearlyTargetResponse, error) {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrYearlyTargetNotFound
		}
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(target)
	return &response, nil
}

func (u *yearlyTargetUsecase) Create(ctx context.Context, req *dto.CreateYearlyTargetRequest) (*dto.YearlyTargetResponse, error) {
	code, err := u.targetRepo.GetNextTargetNumber(ctx, "YT")
	if err != nil {
		return nil, err
	}

	target := mapper.ToYearlyTargetModel(req, code)
	if err := u.targetRepo.Create(ctx, target); err != nil {
		return nil, err
	}

	created, err := u.targetRepo.FindByID(ctx, target.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(created)
	u.auditService.Log(ctx, "sales_target.create", created.ID, map[string]interface{}{"after": salesTargetAuditSnapshot(created)})
	return &response, nil
}

func (u *yearlyTargetUsecase) Update(ctx context.Context, id string, req *dto.UpdateYearlyTargetRequest) (*dto.YearlyTargetResponse, error) {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrYearlyTargetNotFound
		}
		return nil, err
	}

	before := salesTargetAuditSnapshot(target)
	mapper.UpdateYearlyTargetModel(target, req)

	if err := u.targetRepo.Update(ctx, target); err != nil {
		return nil, err
	}

	updated, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(updated)
	u.auditService.Log(ctx, "sales_target.update", id, map[string]interface{}{
		"before": before,
		"after":  salesTargetAuditSnapshot(updated),
	})
	return &response, nil
}

func (u *yearlyTargetUsecase) Delete(ctx context.Context, id string) error {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrYearlyTargetNotFound
		}
		return err
	}

	before := salesTargetAuditSnapshot(target)
	if err := u.targetRepo.Delete(ctx, id); err != nil {
		return err
	}

	u.auditService.Log(ctx, "sales_target.delete", id, map[string]interface{}{"before": before})
	return nil
}

func (u *yearlyTargetUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesTargetAuditTrailEntry, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	tx := u.db.WithContext(ctx).Model(&coreModels.AuditLog{}).
		Where("audit_logs.target_id = ?", id).
		Where("audit_logs.permission_code LIKE ?", "sales_target.%")

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type auditRow struct {
		ID             string          `gorm:"column:id"`
		ActorID        string          `gorm:"column:actor_id"`
		PermissionCode string          `gorm:"column:permission_code"`
		TargetID       string          `gorm:"column:target_id"`
		Action         string          `gorm:"column:action"`
		Metadata       json.RawMessage `gorm:"column:metadata"`
		CreatedAt      time.Time       `gorm:"column:created_at"`
		ActorEmail     *string         `gorm:"column:actor_email"`
		ActorName      *string         `gorm:"column:actor_name"`
	}

	rows := make([]auditRow, 0)
	if err := tx.
		Select("audit_logs.id, audit_logs.actor_id, audit_logs.permission_code, audit_logs.target_id, audit_logs.action, audit_logs.metadata, audit_logs.created_at, users.email as actor_email, users.name as actor_name").
		Joins("LEFT JOIN users ON users.id = audit_logs.actor_id").
		Order("audit_logs.created_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	entries := make([]dto.SalesTargetAuditTrailEntry, 0, len(rows))
	for _, r := range rows {
		meta := map[string]interface{}{}
		if len(r.Metadata) > 0 {
			_ = json.Unmarshal(r.Metadata, &meta)
		}

		var usr *dto.AuditTrailUser
		if r.ActorID != "" || r.ActorEmail != nil || r.ActorName != nil {
			email := ""
			name := ""
			if r.ActorEmail != nil {
				email = *r.ActorEmail
			}
			if r.ActorName != nil {
				name = *r.ActorName
			}
			usr = &dto.AuditTrailUser{ID: r.ActorID, Email: email, Name: name}
		}

		entries = append(entries, dto.SalesTargetAuditTrailEntry{
			ID:             r.ID,
			Action:         r.Action,
			PermissionCode: r.PermissionCode,
			TargetID:       r.TargetID,
			Metadata:       meta,
			User:           usr,
			CreatedAt:      r.CreatedAt,
		})
	}

	return entries, total, nil
}

func salesTargetAuditSnapshot(target interface{}) map[string]interface{} {
	m := map[string]interface{}{}
	b, err := json.Marshal(target)
	if err != nil {
		return m
	}
	_ = json.Unmarshal(b, &m)
	return m
}
