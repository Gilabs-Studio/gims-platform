package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
)

// ToEmployeeAssetResponse converts EmployeeAsset model to response DTO
func ToEmployeeAssetResponse(asset *models.EmployeeAsset, employee *orgModels.Employee) *dto.EmployeeAssetResponse {
	if asset == nil {
		return nil
	}

	response := &dto.EmployeeAssetResponse{
		ID:              asset.ID,
		EmployeeID:      asset.EmployeeID,
		AssetName:       asset.AssetName,
		AssetCode:       asset.AssetCode,
		AssetCategory:   asset.AssetCategory,
		BorrowDate:      asset.BorrowDate.Format("2006-01-02"),
		BorrowCondition: string(asset.BorrowCondition),
		Notes:           asset.Notes,
		Status:          string(asset.GetStatus()),
		DaysBorrowed:    asset.DaysBorrowed(),
		CreatedAt:       asset.CreatedAt,
		UpdatedAt:       asset.UpdatedAt,
	}

	// Format return date if exists
	if asset.ReturnDate != nil {
		returnDateStr := asset.ReturnDate.Format("2006-01-02")
		response.ReturnDate = &returnDateStr
	}

	// Format return condition if exists
	if asset.ReturnCondition != nil {
		conditionStr := string(*asset.ReturnCondition)
		response.ReturnCondition = &conditionStr
	}

	// Include employee data if provided
	if employee != nil {
		employeeID, _ := uuid.Parse(employee.ID)
		response.Employee = &dto.EmployeeSimpleResponse{
			ID:           employeeID,
			EmployeeCode: employee.EmployeeCode,
			Name:         employee.Name,
		}
	}

	return response
}

// ToEmployeeAssetResponseList converts slice of EmployeeAsset models to response DTOs
func ToEmployeeAssetResponseList(assets []models.EmployeeAsset, employeeMap map[string]*orgModels.Employee) []*dto.EmployeeAssetResponse {
	responses := make([]*dto.EmployeeAssetResponse, 0, len(assets))
	for i := range assets {
		employee := employeeMap[assets[i].EmployeeID]
		responses = append(responses, ToEmployeeAssetResponse(&assets[i], employee))
	}
	return responses
}

// ToEmployeeAssetModel converts CreateEmployeeAssetRequest to EmployeeAsset model
func ToEmployeeAssetModel(req *dto.CreateEmployeeAssetRequest, id string) (*models.EmployeeAsset, error) {
	borrowDate, err := time.Parse("2006-01-02", req.BorrowDate)
	if err != nil {
		return nil, err
	}

	asset := &models.EmployeeAsset{
		ID:              id,
		EmployeeID:      req.EmployeeID,
		AssetName:       req.AssetName,
		AssetCode:       req.AssetCode,
		AssetCategory:   req.AssetCategory,
		BorrowDate:      borrowDate,
		BorrowCondition: models.AssetCondition(req.BorrowCondition),
		Notes:           req.Notes,
	}

	return asset, nil
}

// UpdateEmployeeAssetModel updates EmployeeAsset model from UpdateEmployeeAssetRequest
func UpdateEmployeeAssetModel(asset *models.EmployeeAsset, req *dto.UpdateEmployeeAssetRequest) error {
	if req.AssetName != nil {
		asset.AssetName = *req.AssetName
	}
	if req.AssetCode != nil {
		asset.AssetCode = *req.AssetCode
	}
	if req.AssetCategory != nil {
		asset.AssetCategory = *req.AssetCategory
	}
	if req.BorrowDate != nil {
		borrowDate, err := time.Parse("2006-01-02", *req.BorrowDate)
		if err != nil {
			return err
		}
		asset.BorrowDate = borrowDate
	}
	if req.BorrowCondition != nil {
		asset.BorrowCondition = models.AssetCondition(*req.BorrowCondition)
	}
	if req.Notes != nil {
		asset.Notes = req.Notes
	}

	return nil
}
