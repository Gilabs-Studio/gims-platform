package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type employeeAssetUsecase struct {
	assetRepo    repositories.EmployeeAssetRepository
	employeeRepo orgRepos.EmployeeRepository
}

// NewEmployeeAssetUsecase creates a new instance of EmployeeAssetUsecase
func NewEmployeeAssetUsecase(
	assetRepo repositories.EmployeeAssetRepository,
	employeeRepo orgRepos.EmployeeRepository,
) EmployeeAssetUsecase {
	return &employeeAssetUsecase{
		assetRepo:    assetRepo,
		employeeRepo: employeeRepo,
	}
}

func (u *employeeAssetUsecase) GetAll(ctx context.Context, page, perPage int, search, employeeID, status string) ([]*dto.EmployeeAssetResponse, *response.PaginationMeta, error) {
	// Validate pagination
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	// Fetch assets
	assets, total, err := u.assetRepo.FindAll(ctx, page, perPage, search, employeeID, status)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch employee assets: %w", err)
	}

	// Fetch employee data for all assets
	employeeIDs := make([]string, 0, len(assets))
	for _, asset := range assets {
		employeeIDs = append(employeeIDs, asset.EmployeeID)
	}

	employeeMap := make(map[string]*orgModels.Employee)
	if len(employeeIDs) > 0 {
		employees, err := u.employeeRepo.FindByIDs(ctx, employeeIDs)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to fetch employees: %w", err)
		}
		for i := range employees {
			employeeMap[employees[i].ID] = &employees[i]
		}
	}

	// Map to response
	responses := mapper.ToEmployeeAssetResponseList(assets, employeeMap)

	// Create pagination meta
	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	meta := &response.PaginationMeta{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	return responses, meta, nil
}

func (u *employeeAssetUsecase) GetByID(ctx context.Context, id string) (*dto.EmployeeAssetResponse, error) {
	asset, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee asset not found")
		}
		return nil, err
	}
	if asset == nil {
		return nil, errors.New("employee asset not found")
	}

	// Fetch employee data
	employee, err := u.employeeRepo.FindByID(ctx, asset.EmployeeID)
	if err != nil {
		return nil, err
	}

	return mapper.ToEmployeeAssetResponse(asset, employee), nil
}

func (u *employeeAssetUsecase) GetByEmployeeID(ctx context.Context, employeeID string) ([]*dto.EmployeeAssetResponse, error) {
	// Validate employee exists
	employee, err := u.employeeRepo.FindByID(ctx, employeeID)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	// Fetch assets
	assets, err := u.assetRepo.FindByEmployeeID(ctx, employeeID)
	if err != nil {
		return nil, err
	}

	// Map to response
	employeeMap := map[string]*orgModels.Employee{employee.ID: employee}
	return mapper.ToEmployeeAssetResponseList(assets, employeeMap), nil
}

func (u *employeeAssetUsecase) GetBorrowed(ctx context.Context) ([]*dto.EmployeeAssetResponse, error) {
	assets, err := u.assetRepo.FindBorrowed(ctx)
	if err != nil {
		return nil, err
	}

	// Fetch employee data for all assets
	employeeIDs := make([]string, 0, len(assets))
	for _, asset := range assets {
		employeeIDs = append(employeeIDs, asset.EmployeeID)
	}

	employeeMap := make(map[string]*orgModels.Employee)
	if len(employeeIDs) > 0 {
		employees, err := u.employeeRepo.FindByIDs(ctx, employeeIDs)
		if err != nil {
			return nil, err
		}
		for i := range employees {
			employeeMap[employees[i].ID] = &employees[i]
		}
	}

	return mapper.ToEmployeeAssetResponseList(assets, employeeMap), nil
}

func (u *employeeAssetUsecase) GetFormData(ctx context.Context) (*dto.EmployeeAssetFormDataResponse, error) {
	// Fetch all employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// Map to form options
	employeeOptions := make([]dto.EmployeeFormOption, 0, len(employees))
	for _, emp := range employees {
		employeeID, err := uuid.Parse(emp.ID)
		if err != nil {
			continue
		}
		employeeOptions = append(employeeOptions, dto.EmployeeFormOption{
			ID:           employeeID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	return &dto.EmployeeAssetFormDataResponse{
		Employees: employeeOptions,
	}, nil
}

func (u *employeeAssetUsecase) Create(ctx context.Context, req *dto.CreateEmployeeAssetRequest) (*dto.EmployeeAssetResponse, error) {
	// Validate employee exists
	employee, err := u.employeeRepo.FindByID(ctx, req.EmployeeID)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	// Check if asset code already exists
	existingAsset, err := u.assetRepo.FindByAssetCode(ctx, req.AssetCode)
	if err != nil {
		return nil, err
	}
	if existingAsset != nil && !existingAsset.IsReturned() {
		return nil, errors.New("asset code already exists and is currently borrowed")
	}

	// Validate borrow date format
	_, err = time.Parse("2006-01-02", req.BorrowDate)
	if err != nil {
		return nil, errors.New("invalid borrow date format, must be YYYY-MM-DD")
	}

	// Create asset
	id := uuid.New().String()
	asset, err := mapper.ToEmployeeAssetModel(req, id)
	if err != nil {
		return nil, err
	}

	if err := u.assetRepo.Create(ctx, asset); err != nil {
		return nil, err
	}

	return mapper.ToEmployeeAssetResponse(asset, employee), nil
}

func (u *employeeAssetUsecase) Update(ctx context.Context, id string, req *dto.UpdateEmployeeAssetRequest) (*dto.EmployeeAssetResponse, error) {
	// Fetch existing asset
	asset, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee asset not found")
		}
		return nil, err
	}
	if asset == nil {
		return nil, errors.New("employee asset not found")
	}

	// Check if asset already returned (cannot update returned assets)
	if asset.IsReturned() {
		return nil, errors.New("cannot update asset that has been returned")
	}

	// Check asset code uniqueness if being updated
	if req.AssetCode != nil && *req.AssetCode != asset.AssetCode {
		existingAsset, err := u.assetRepo.FindByAssetCode(ctx, *req.AssetCode)
		if err != nil {
			return nil, err
		}
		if existingAsset != nil && existingAsset.ID != id && !existingAsset.IsReturned() {
			return nil, errors.New("asset code already exists and is currently borrowed")
		}
	}

	// Update asset
	if err := mapper.UpdateEmployeeAssetModel(asset, req); err != nil {
		return nil, err
	}

	if err := u.assetRepo.Update(ctx, asset); err != nil {
		return nil, err
	}

	// Fetch employee data
	employee, err := u.employeeRepo.FindByID(ctx, asset.EmployeeID)
	if err != nil {
		return nil, err
	}

	return mapper.ToEmployeeAssetResponse(asset, employee), nil
}

func (u *employeeAssetUsecase) ReturnAsset(ctx context.Context, id string, req *dto.ReturnAssetRequest) (*dto.EmployeeAssetResponse, error) {
	// Fetch existing asset
	asset, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee asset not found")
		}
		return nil, err
	}
	if asset == nil {
		return nil, errors.New("employee asset not found")
	}

	// Check if asset already returned
	if asset.IsReturned() {
		return nil, errors.New("asset has already been returned")
	}

	// Parse return date
	returnDate, err := time.Parse("2006-01-02", req.ReturnDate)
	if err != nil {
		return nil, errors.New("invalid return date format, must be YYYY-MM-DD")
	}

	// Validate return date is after borrow date
	if returnDate.Before(asset.BorrowDate) {
		return nil, errors.New("return date must be after borrow date")
	}

	// Update asset with return data
	asset.ReturnDate = &returnDate
	returnCondition := models.AssetCondition(req.ReturnCondition)
	asset.ReturnCondition = &returnCondition

	// Merge notes if provided
	if req.Notes != nil {
		if asset.Notes != nil {
			mergedNotes := fmt.Sprintf("%s\n\nReturn notes: %s", *asset.Notes, *req.Notes)
			asset.Notes = &mergedNotes
		} else {
			returnNotes := fmt.Sprintf("Return notes: %s", *req.Notes)
			asset.Notes = &returnNotes
		}
	}

	if err := u.assetRepo.Update(ctx, asset); err != nil {
		return nil, err
	}

	// Fetch employee data
	employee, err := u.employeeRepo.FindByID(ctx, asset.EmployeeID)
	if err != nil {
		return nil, err
	}

	return mapper.ToEmployeeAssetResponse(asset, employee), nil
}

func (u *employeeAssetUsecase) Delete(ctx context.Context, id string) error {
	// Check if asset exists
	asset, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("employee asset not found")
		}
		return err
	}
	if asset == nil {
		return errors.New("employee asset not found")
	}

	// Soft delete
	if err := u.assetRepo.Delete(ctx, id); err != nil {
		return err
	}

	return nil
}
