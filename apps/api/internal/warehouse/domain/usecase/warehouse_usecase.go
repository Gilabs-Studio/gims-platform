package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/crm-healthcare/api/internal/warehouse/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/warehouse/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/warehouse/domain/mapper"
	"gorm.io/gorm"
)

// WarehouseUsecase defines business logic for warehouses
type WarehouseUsecase interface {
	Create(ctx context.Context, req dto.CreateWarehouseRequest) (*dto.WarehouseResponse, error)
	GetByID(ctx context.Context, id string) (*dto.WarehouseResponse, error)
	List(ctx context.Context, params repositories.WarehouseListParams) ([]*dto.WarehouseResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateWarehouseRequest) (*dto.WarehouseResponse, error)
	Delete(ctx context.Context, id string) error
}

type warehouseUsecase struct {
	repo   repositories.WarehouseRepository
	mapper *mapper.WarehouseMapper
}

// NewWarehouseUsecase creates a new warehouse usecase
func NewWarehouseUsecase(repo repositories.WarehouseRepository) WarehouseUsecase {
	return &warehouseUsecase{
		repo:   repo,
		mapper: mapper.NewWarehouseMapper(),
	}
}

// Create creates a new warehouse
func (uc *warehouseUsecase) Create(ctx context.Context, req dto.CreateWarehouseRequest) (*dto.WarehouseResponse, error) {
	// Check if code already exists
	existing, err := uc.repo.GetByCode(ctx, req.Code)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("warehouse code already exists")
	}

	// Create warehouse
	warehouse := uc.mapper.FromCreateRequest(req)
	if err := uc.repo.Create(ctx, warehouse); err != nil {
		return nil, err
	}

	// Reload with relations
	warehouse, err = uc.repo.GetByID(ctx, warehouse.ID)
	if err != nil {
		return nil, err
	}

	return uc.mapper.ToResponse(warehouse), nil
}

// GetByID retrieves a warehouse by ID
func (uc *warehouseUsecase) GetByID(ctx context.Context, id string) (*dto.WarehouseResponse, error) {
	warehouse, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return uc.mapper.ToResponse(warehouse), nil
}

// List retrieves warehouses with pagination and filtering
func (uc *warehouseUsecase) List(ctx context.Context, params repositories.WarehouseListParams) ([]*dto.WarehouseResponse, int64, error) {
	warehouses, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	return uc.mapper.ToResponseList(warehouses), total, nil
}

// Update updates an existing warehouse
func (uc *warehouseUsecase) Update(ctx context.Context, id string, req dto.UpdateWarehouseRequest) (*dto.WarehouseResponse, error) {
	warehouse, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check code uniqueness if code is being updated
	if req.Code != nil && *req.Code != warehouse.Code {
		existing, err := uc.repo.GetByCode(ctx, *req.Code)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("warehouse code already exists")
		}
	}

	// Apply updates
	uc.mapper.ApplyUpdateRequest(warehouse, req)

	if err := uc.repo.Update(ctx, warehouse); err != nil {
		return nil, err
	}

	// Reload with relations
	warehouse, err = uc.repo.GetByID(ctx, warehouse.ID)
	if err != nil {
		return nil, err
	}

	return uc.mapper.ToResponse(warehouse), nil
}

// Delete deletes a warehouse
func (uc *warehouseUsecase) Delete(ctx context.Context, id string) error {
	// Check if warehouse exists
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	return uc.repo.Delete(ctx, id)
}
