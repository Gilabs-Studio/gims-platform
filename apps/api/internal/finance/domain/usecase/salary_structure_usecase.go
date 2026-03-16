package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
)

var (
	ErrSalaryStructureNotFound = errors.New("salary structure not found")
)

const salaryStructureIDCondition = "id = ?"

type SalaryStructureUsecase interface {
	Create(ctx context.Context, req *dto.CreateSalaryStructureRequest) (*dto.SalaryStructureResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalaryStructureRequest) (*dto.SalaryStructureResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.SalaryStructureResponse, error)
	List(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryStructureResponse, int64, error)
	Approve(ctx context.Context, id string) (*dto.SalaryStructureResponse, error)
	ToggleStatus(ctx context.Context, id string) (*dto.SalaryStructureResponse, error)
	GetStats(ctx context.Context) (*dto.SalaryStructureStatsResponse, error)
	ListGrouped(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryEmployeeGroup, int64, error)
	GetFormData(ctx context.Context) (*dto.SalaryFormDataResponse, error)
}

type salaryStructureUsecase struct {
	db     *gorm.DB
	repo   repositories.SalaryStructureRepository
	mapper *mapper.SalaryStructureMapper
}

func NewSalaryStructureUsecase(db *gorm.DB, repo repositories.SalaryStructureRepository, mapper *mapper.SalaryStructureMapper) SalaryStructureUsecase {
	return &salaryStructureUsecase{db: db, repo: repo, mapper: mapper}
}

func (uc *salaryStructureUsecase) Create(ctx context.Context, req *dto.CreateSalaryStructureRequest) (*dto.SalaryStructureResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	eff, err := time.Parse("2006-01-02", strings.TrimSpace(req.EffectiveDate))
	if err != nil {
		return nil, errors.New("invalid effective_date")
	}

	item := &financeModels.SalaryStructure{
		EmployeeID:    strings.TrimSpace(req.EmployeeID),
		EffectiveDate: eff,
		BasicSalary:   req.BasicSalary,
		Notes:         strings.TrimSpace(req.Notes),
		Status:        financeModels.SalaryStructureStatusDraft,
		CreatedBy:     &actorID,
	}

	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	// Reload with preloads
	full, _ := uc.repo.FindByID(ctx, item.ID)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *salaryStructureUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalaryStructureRequest) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}

	if existing.Status != financeModels.SalaryStructureStatusDraft {
		return nil, errors.New("only draft salary structure can be updated")
	}

	eff, err := time.Parse("2006-01-02", strings.TrimSpace(req.EffectiveDate))
	if err != nil {
		return nil, errors.New("invalid effective_date")
	}

	if err := uc.db.WithContext(ctx).Model(&financeModels.SalaryStructure{}).Where(salaryStructureIDCondition, id).Updates(map[string]interface{}{
		"employee_id":    strings.TrimSpace(req.EmployeeID),
		"effective_date": eff,
		"basic_salary":   req.BasicSalary,
		"notes":          strings.TrimSpace(req.Notes),
	}).Error; err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, id)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *salaryStructureUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSalaryStructureNotFound
		}
		return err
	}
	if existing.Status != financeModels.SalaryStructureStatusDraft {
		return errors.New("only draft salary structure can be deleted")
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.SalaryStructure{}, salaryStructureIDCondition, id).Error
}

func (uc *salaryStructureUsecase) GetByID(ctx context.Context, id string) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *salaryStructureUsecase) List(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryStructureResponse, int64, error) {
	if req == nil {
		req = &dto.ListSalaryStructuresRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}

	var status *financeModels.SalaryStructureStatus
	if req.Status != nil && *req.Status != "" {
		s := financeModels.SalaryStructureStatus(*req.Status)
		status = &s
	}

	items, total, err := uc.repo.List(ctx, repositories.SalaryStructureListParams{
		Search:     req.Search,
		EmployeeID: req.EmployeeID,
		Status:     status,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.SalaryStructureResponse, 0, len(items))
	for i := range items {
		res = append(res, uc.mapper.ToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *salaryStructureUsecase) Approve(ctx context.Context, id string) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}

	if item.Status != financeModels.SalaryStructureStatusDraft {
		return nil, errors.New("only draft salary structure can be approved")
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deactivate others
		if err := uc.repo.DeactivateAllByEmployeeID(ctx, tx, item.EmployeeID); err != nil {
			return err
		}
		// Activate this one
		if err := tx.Model(&financeModels.SalaryStructure{}).Where(salaryStructureIDCondition, id).Update("status", financeModels.SalaryStructureStatusActive).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, id)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *salaryStructureUsecase) ToggleStatus(ctx context.Context, id string) (*dto.SalaryStructureResponse, error) {
	id = strings.TrimSpace(id)
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalaryStructureNotFound
		}
		return nil, err
	}

	if item.Status == financeModels.SalaryStructureStatusDraft {
		return nil, errors.New("cannot toggle status of draft salary structure")
	}

	if item.Status == financeModels.SalaryStructureStatusActive {
		// Deactivate this record only
		if err := uc.repo.UpdateStatus(ctx, id, financeModels.SalaryStructureStatusInactive); err != nil {
			return nil, err
		}
	} else {
		// Activate this inactive salary, deactivating any other active salary for the employee
		err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := uc.repo.DeactivateAllByEmployeeID(ctx, tx, item.EmployeeID); err != nil {
				return err
			}
			if err := uc.repo.UpdateStatus(ctx, id, financeModels.SalaryStructureStatusActive); err != nil {
				return err
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	full, _ := uc.repo.FindByID(ctx, id)
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *salaryStructureUsecase) GetStats(ctx context.Context) (*dto.SalaryStructureStatsResponse, error) {
	stats, err := uc.repo.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	series := make([]dto.SalaryStructureTotalSalaryOverTime, 0, len(stats.TotalSalaryOverTime))
	for _, p := range stats.TotalSalaryOverTime {
		series = append(series, dto.SalaryStructureTotalSalaryOverTime{
			Period:      p.Period.Format("2006-01-02"),
			TotalSalary: p.TotalSalary,
		})
	}

	return &dto.SalaryStructureStatsResponse{
		Total:               stats.Total,
		Active:              stats.Active,
		Draft:               stats.Draft,
		Inactive:            stats.Inactive,
		AverageSalary:       stats.AverageSalary,
		MinSalary:           stats.MinSalary,
		MaxSalary:           stats.MaxSalary,
		TotalSalaryOverTime: series,
	}, nil
}

func (uc *salaryStructureUsecase) ListGrouped(ctx context.Context, req *dto.ListSalaryStructuresRequest) ([]dto.SalaryEmployeeGroup, int64, error) {
	if req == nil {
		req = &dto.ListSalaryStructuresRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}

	// 1. Fetch Employees first to ensure all employees are listed
	var employees []orgModels.Employee
	var total int64

	empQ := uc.db.WithContext(ctx).Model(&orgModels.Employee{}).Where("is_active = ?", true)

	if req.Search != "" {
		like := "%" + req.Search + "%"
		empQ = empQ.Where("name ILIKE ? OR employee_code ILIKE ?", like, like)
	}

	if err := empQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := empQ.Order("name ASC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Preload("User").
		Find(&employees).Error; err != nil {
		return nil, 0, err
	}

	if len(employees) == 0 {
		return []dto.SalaryEmployeeGroup{}, total, nil
	}

	// 2. Fetch all salary structures for these specific employees
	empIDs := make([]string, 0, len(employees))
	for _, e := range employees {
		empIDs = append(empIDs, e.ID)
	}

	var salaries []financeModels.SalaryStructure
	if err := uc.db.WithContext(ctx).
		Where("employee_id IN ?", empIDs).
		Order("effective_date DESC").
		Find(&salaries).Error; err != nil {
		return nil, 0, err
	}

	// 3. Map into groups
	salaryMap := make(map[string][]dto.SalaryStructureResponse)
	for i := range salaries {
		empID := salaries[i].EmployeeID
		salaryMap[empID] = append(salaryMap[empID], uc.mapper.ToResponse(&salaries[i]))
	}

	res := make([]dto.SalaryEmployeeGroup, 0, len(employees))
	for _, emp := range employees {
		empSalaries := salaryMap[emp.ID]
		group := dto.SalaryEmployeeGroup{
			EmployeeID: emp.ID,
			Employee: dto.EmployeeInfo{
				ID:           emp.ID,
				Name:         emp.Name,
				EmployeeCode: emp.EmployeeCode,
				Email:        emp.Email,
			},
			Salaries:    empSalaries,
			SalaryCount: len(empSalaries),
		}
		if emp.User != nil {
			group.Employee.AvatarURL = emp.User.AvatarURL
		}
		if group.Salaries == nil {
			group.Salaries = []dto.SalaryStructureResponse{}
		}
		res = append(res, group)
	}

	return res, total, nil
}

func (uc *salaryStructureUsecase) GetFormData(ctx context.Context) (*dto.SalaryFormDataResponse, error) {
	var employees []orgModels.Employee
	if err := uc.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("name ASC").
		Select("id, name, employee_code").
		Find(&employees).Error; err != nil {
		return nil, err
	}

	options := make([]dto.EmployeeFormOption, 0, len(employees))
	for _, e := range employees {
		options = append(options, dto.EmployeeFormOption{
			ID:           e.ID,
			EmployeeCode: e.EmployeeCode,
			Name:         e.Name,
		})
	}

	return &dto.SalaryFormDataResponse{Employees: options}, nil
}
