package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/mapper"
	roleModels "github.com/gilabs/gims/api/internal/role/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	warehouseRepo "github.com/gilabs/gims/api/internal/warehouse/data/repositories"
	"gorm.io/gorm"
)

var (
	ErrOutletNotFound = errors.New("OUTLET_NOT_FOUND")
)

// OutletUsecase defines business logic for outlets
type OutletUsecase interface {
	Create(ctx context.Context, req dto.CreateOutletRequest) (*dto.OutletResponse, error)
	GetByID(ctx context.Context, id string) (*dto.OutletResponse, error)
	List(ctx context.Context, params repositories.OutletListParams) ([]*dto.OutletResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateOutletRequest) (*dto.OutletResponse, error)
	Delete(ctx context.Context, id string) error
	GetFormData(ctx context.Context) (*dto.OutletFormDataResponse, error)
}

type outletUsecase struct {
	db            *gorm.DB
	repo          repositories.OutletRepository
	warehouseRepo warehouseRepo.WarehouseRepository
	employeeRepo  repositories.EmployeeRepository
	companyRepo   repositories.CompanyRepository
	mapper        *mapper.OutletMapper
}

// NewOutletUsecase creates a new outlet usecase
func NewOutletUsecase(
	db *gorm.DB,
	repo repositories.OutletRepository,
	whRepo warehouseRepo.WarehouseRepository,
	employeeRepo repositories.EmployeeRepository,
	companyRepo repositories.CompanyRepository,
) OutletUsecase {
	return &outletUsecase{
		db:            db,
		repo:          repo,
		warehouseRepo: whRepo,
		employeeRepo:  employeeRepo,
		companyRepo:   companyRepo,
		mapper:        mapper.NewOutletMapper(),
	}
}

// Create creates a new outlet and optionally a linked warehouse
func (uc *outletUsecase) Create(ctx context.Context, req dto.CreateOutletRequest) (*dto.OutletResponse, error) {
	code, err := uc.repo.GetNextCode(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate outlet code: %w", err)
	}

	outlet := uc.mapper.FromCreateRequest(req)
	outlet.Code = code

	// Use transaction so outlet + warehouse are atomic
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(outlet).Error; err != nil {
			return err
		}

		// Optionally create a linked warehouse
		if req.CreateWarehouse {
			whCode, err := uc.warehouseRepo.GetNextCode(ctx)
			if err != nil {
				return fmt.Errorf("failed to generate warehouse code: %w", err)
			}

			warehouse := &warehouseModels.Warehouse{
				Code:        whCode,
				Name:        fmt.Sprintf("%s Warehouse", outlet.Name),
				Address:     outlet.Address,
				ProvinceID:  outlet.ProvinceID,
				CityID:      outlet.CityID,
				DistrictID:  outlet.DistrictID,
				VillageID:   outlet.VillageID,
				Latitude:    outlet.Latitude,
				Longitude:   outlet.Longitude,
				IsPosOutlet: true,
				OutletID:    &outlet.ID,
				IsActive:    true,
			}

			if err := tx.Create(warehouse).Error; err != nil {
				return fmt.Errorf("failed to create linked warehouse: %w", err)
			}

			// Store warehouse reference on outlet
			outlet.WarehouseID = &warehouse.ID
			if err := tx.Model(outlet).Update("warehouse_id", warehouse.ID).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Reload with relations
	outlet, err = uc.repo.GetByID(ctx, outlet.ID)
	if err != nil {
		return nil, err
	}

	return uc.mapper.ToResponse(outlet), nil
}

// GetByID retrieves an outlet by ID
func (uc *outletUsecase) GetByID(ctx context.Context, id string) (*dto.OutletResponse, error) {
	outlet, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOutletNotFound
		}
		return nil, err
	}
	return uc.mapper.ToResponse(outlet), nil
}

// List retrieves outlets with pagination
func (uc *outletUsecase) List(ctx context.Context, params repositories.OutletListParams) ([]*dto.OutletResponse, int64, error) {
	outlets, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToResponseList(outlets), total, nil
}

// Update updates an existing outlet. When is_active is set to false,
// the linked warehouse is also deactivated.
func (uc *outletUsecase) Update(ctx context.Context, id string, req dto.UpdateOutletRequest) (*dto.OutletResponse, error) {
	outlet, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOutletNotFound
		}
		return nil, err
	}

	wasActive := outlet.IsActive
	uc.mapper.ApplyUpdateRequest(outlet, req)

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(outlet).Error; err != nil {
			return err
		}

		// Cascade deactivation: if outlet goes from active to inactive, deactivate linked warehouse
		if wasActive && !outlet.IsActive && outlet.WarehouseID != nil {
			if err := tx.Model(&warehouseModels.Warehouse{}).
				Where("id = ?", *outlet.WarehouseID).
				Update("is_active", false).Error; err != nil {
				return fmt.Errorf("failed to deactivate linked warehouse: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Reload with relations
	outlet, err = uc.repo.GetByID(ctx, outlet.ID)
	if err != nil {
		return nil, err
	}

	return uc.mapper.ToResponse(outlet), nil
}

// Delete soft-deletes an outlet
func (uc *outletUsecase) Delete(ctx context.Context, id string) error {
	if _, err := uc.repo.GetByID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOutletNotFound
		}
		return err
	}
	return uc.repo.Delete(ctx, id)
}

// GetFormData returns form data (managers and companies) for outlet create/edit forms.
// Managers are filtered to only include employees whose role has OUTLET data scope.
func (uc *outletUsecase) GetFormData(ctx context.Context) (*dto.OutletFormDataResponse, error) {
	// Fetch only employees whose role has OUTLET data scope for the manager dropdown
	employees, err := uc.employeeRepo.FindByRoleDataScope(ctx, roleModels.DataScopeOutlet)
	if err != nil {
		return nil, err
	}

	managers := make([]dto.ManagerResponse, 0, len(employees))
	for _, emp := range employees {
		managers = append(managers, dto.ManagerResponse{
			ID:   emp.ID,
			Name: emp.Name,
		})
	}

	// Fetch companies for company dropdown
	companies, err := uc.companyRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	companyOptions := make([]dto.CompanySimpleResponse, 0, len(companies))
	for _, c := range companies {
		companyOptions = append(companyOptions, dto.CompanySimpleResponse{
			ID:   c.ID,
			Name: c.Name,
		})
	}

	return &dto.OutletFormDataResponse{
		Managers:  managers,
		Companies: companyOptions,
	}, nil
}
