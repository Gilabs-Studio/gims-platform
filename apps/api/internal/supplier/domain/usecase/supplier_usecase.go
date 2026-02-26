package usecase

import (
	"context"
	"errors"
	"net/mail"
	"time"

	"github.com/gilabs/gims/api/internal/supplier/data/models"
	"github.com/gilabs/gims/api/internal/supplier/data/repositories"
	"github.com/gilabs/gims/api/internal/supplier/domain/dto"
	"github.com/gilabs/gims/api/internal/supplier/domain/mapper"
	"github.com/google/uuid"
)

// SupplierUsecase defines the interface for supplier business logic
type SupplierUsecase interface {
	Create(ctx context.Context, userID string, req dto.CreateSupplierRequest) (dto.SupplierResponse, error)
	GetByID(ctx context.Context, id string) (dto.SupplierResponse, error)
	List(ctx context.Context, params repositories.SupplierListParams) ([]dto.SupplierResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateSupplierRequest) (dto.SupplierResponse, error)
	Delete(ctx context.Context, id string) error
	// Approval workflow
	Submit(ctx context.Context, id string) (dto.SupplierResponse, error)
	Approve(ctx context.Context, id string, userID string, req dto.ApproveSupplierRequest) (dto.SupplierResponse, error)
	// Nested operations
	AddPhoneNumber(ctx context.Context, supplierID string, req dto.CreatePhoneNumberRequest) (dto.PhoneNumberResponse, error)
	UpdatePhoneNumber(ctx context.Context, id string, req dto.UpdatePhoneNumberRequest) (dto.PhoneNumberResponse, error)
	DeletePhoneNumber(ctx context.Context, id string) error
	AddBankAccount(ctx context.Context, supplierID string, req dto.CreateSupplierBankRequest) (dto.SupplierBankResponse, error)
	UpdateBankAccount(ctx context.Context, id string, req dto.UpdateSupplierBankRequest) (dto.SupplierBankResponse, error)
	DeleteBankAccount(ctx context.Context, id string) error
}

type supplierUsecase struct {
	repo repositories.SupplierRepository
}

// NewSupplierUsecase creates a new SupplierUsecase
func NewSupplierUsecase(repo repositories.SupplierRepository) SupplierUsecase {
	return &supplierUsecase{repo: repo}
}

func (u *supplierUsecase) Create(ctx context.Context, userID string, req dto.CreateSupplierRequest) (dto.SupplierResponse, error) {
	// Auto-generate supplier code
	code, err := u.repo.GetNextCode(ctx)
	if err != nil {
		return dto.SupplierResponse{}, errors.New("failed to generate supplier code")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	supplier := &models.Supplier{
		ID:            uuid.New().String(),
		Code:          code,
		Name:          req.Name,
		Address:       req.Address,
		Email:         req.Email,
		Website:       req.Website,
		NPWP:          req.NPWP,
		ContactPerson: req.ContactPerson,
		Notes:         req.Notes,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		Status:        models.SupplierStatusApproved,
		IsApproved:    true,
		CreatedBy:     &userID,
		IsActive:      isActive,
	}

	// Set optional relations
	if req.SupplierTypeID != "" {
		supplier.SupplierTypeID = &req.SupplierTypeID
	}
	if req.ProvinceID != "" {
		supplier.ProvinceID = &req.ProvinceID
	}
	if req.CityID != "" {
		supplier.CityID = &req.CityID
	}
	if req.DistrictID != "" {
		supplier.DistrictID = &req.DistrictID
	}
	if req.VillageID != "" {
		supplier.VillageID = &req.VillageID
	}
	if req.VillageName != "" {
		supplier.VillageName = &req.VillageName
	}

	if err := u.repo.Create(ctx, supplier); err != nil {
		return dto.SupplierResponse{}, err
	}

	// Create phone numbers
	for _, phone := range req.PhoneNumbers {
		phoneModel := &models.SupplierPhoneNumber{
			ID:          uuid.New().String(),
			SupplierID:  supplier.ID,
			PhoneNumber: phone.PhoneNumber,
			Label:       phone.Label,
			IsPrimary:   phone.IsPrimary,
		}
		if err := u.repo.CreatePhoneNumber(ctx, phoneModel); err != nil {
			return dto.SupplierResponse{}, err
		}
	}

	// Create bank accounts
	for _, bank := range req.BankAccounts {
		bankModel := &models.SupplierBank{
			ID:            uuid.New().String(),
			SupplierID:    supplier.ID,
			BankID:        bank.BankID,
			AccountNumber: bank.AccountNumber,
			AccountName:   bank.AccountName,
			Branch:        bank.Branch,
			IsPrimary:     bank.IsPrimary,
		}
		if err := u.repo.CreateBankAccount(ctx, bankModel); err != nil {
			return dto.SupplierResponse{}, err
		}
	}

	// Reload to get all relations
	reloaded, err := u.repo.FindByID(ctx, supplier.ID)
	if err != nil {
		return dto.SupplierResponse{}, err
	}

	return mapper.ToSupplierResponse(reloaded), nil
}

func (u *supplierUsecase) GetByID(ctx context.Context, id string) (dto.SupplierResponse, error) {
	supplier, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.SupplierResponse{}, err
	}
	return mapper.ToSupplierResponse(supplier), nil
}

func (u *supplierUsecase) List(ctx context.Context, params repositories.SupplierListParams) ([]dto.SupplierResponse, int64, error) {
	suppliers, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToSupplierResponseList(suppliers), total, nil
}

func (u *supplierUsecase) Update(ctx context.Context, id string, req dto.UpdateSupplierRequest) (dto.SupplierResponse, error) {
	supplier, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.SupplierResponse{}, err
	}

	// Validate email format when a non-empty email is provided.
	// (Binding tag removed from DTO because omitempty on *string doesn't skip
	// for non-nil pointer to "", which blocks the entire request.)
	if req.Email != nil && *req.Email != "" {
		if _, err := mail.ParseAddress(*req.Email); err != nil {
			return dto.SupplierResponse{}, errors.New("invalid email format")
		}
	}

	// Update fields when explicitly sent (pointer non-nil)
	if req.Name != nil {
		supplier.Name = *req.Name
	}
	if req.Address != nil {
		supplier.Address = *req.Address
	}
	if req.Email != nil {
		supplier.Email = *req.Email
	}
	if req.Website != nil {
		supplier.Website = *req.Website
	}
	if req.NPWP != nil {
		supplier.NPWP = *req.NPWP
	}
	if req.ContactPerson != nil {
		supplier.ContactPerson = *req.ContactPerson
	}
	if req.Notes != nil {
		supplier.Notes = *req.Notes
	}

	// Nullable FK fields: empty string means clear, non-empty means set
	if req.SupplierTypeID != nil {
		if *req.SupplierTypeID == "" {
			supplier.SupplierTypeID = nil
		} else {
			supplier.SupplierTypeID = req.SupplierTypeID
		}
	}
	if req.ProvinceID != nil {
		if *req.ProvinceID == "" {
			supplier.ProvinceID = nil
		} else {
			supplier.ProvinceID = req.ProvinceID
		}
	}
	if req.CityID != nil {
		if *req.CityID == "" {
			supplier.CityID = nil
		} else {
			supplier.CityID = req.CityID
		}
	}
	if req.DistrictID != nil {
		if *req.DistrictID == "" {
			supplier.DistrictID = nil
		} else {
			supplier.DistrictID = req.DistrictID
		}
	}
	if req.VillageID != nil {
		if *req.VillageID == "" {
			supplier.VillageID = nil
		} else {
			supplier.VillageID = req.VillageID
		}
	}
	if req.VillageName != nil {
		supplier.VillageName = req.VillageName
	}

	if req.Latitude != nil {
		supplier.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		supplier.Longitude = req.Longitude
	}
	if req.IsActive != nil {
		supplier.IsActive = *req.IsActive
	}

	// Detach preloaded belongs_to associations so GORM uses FK field values directly.
	// Without this, GORM syncs FK columns back to the loaded association's PK,
	// reverting any FK changes made above.
	supplier.SupplierType = nil
	supplier.Province = nil
	supplier.City = nil
	supplier.District = nil
	supplier.Village = nil
	supplier.PhoneNumbers = nil
	supplier.BankAccounts = nil

	if err := u.repo.Update(ctx, supplier); err != nil {
		return dto.SupplierResponse{}, err
	}

	// Reload
	supplier, _ = u.repo.FindByID(ctx, id)
	return mapper.ToSupplierResponse(supplier), nil
}

func (u *supplierUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("supplier not found")
	}

	return u.repo.Delete(ctx, id)
}

// Approval workflow
func (u *supplierUsecase) Submit(ctx context.Context, id string) (dto.SupplierResponse, error) {
	supplier, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.SupplierResponse{}, err
	}

	if supplier.Status != models.SupplierStatusDraft && supplier.Status != models.SupplierStatusRejected {
		return dto.SupplierResponse{}, errors.New("supplier can only be submitted from draft or rejected status")
	}

	supplier.Status = models.SupplierStatusPending
	if err := u.repo.Update(ctx, supplier); err != nil {
		return dto.SupplierResponse{}, err
	}

	return mapper.ToSupplierResponse(supplier), nil
}

func (u *supplierUsecase) Approve(ctx context.Context, id string, userID string, req dto.ApproveSupplierRequest) (dto.SupplierResponse, error) {
	supplier, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.SupplierResponse{}, err
	}

	if supplier.Status != models.SupplierStatusPending {
		return dto.SupplierResponse{}, errors.New("supplier must be in pending status to approve/reject")
	}

	now := time.Now()
	supplier.ApprovedBy = &userID
	supplier.ApprovedAt = &now

	if req.Action == "approve" {
		supplier.Status = models.SupplierStatusApproved
		supplier.IsApproved = true
	} else {
		supplier.Status = models.SupplierStatusRejected
		supplier.IsApproved = false
	}

	if err := u.repo.Update(ctx, supplier); err != nil {
		return dto.SupplierResponse{}, err
	}

	return mapper.ToSupplierResponse(supplier), nil
}

// Nested phone number operations
func (u *supplierUsecase) AddPhoneNumber(ctx context.Context, supplierID string, req dto.CreatePhoneNumberRequest) (dto.PhoneNumberResponse, error) {
	phone := &models.SupplierPhoneNumber{
		ID:          uuid.New().String(),
		SupplierID:  supplierID,
		PhoneNumber: req.PhoneNumber,
		Label:       req.Label,
		IsPrimary:   req.IsPrimary,
	}

	if err := u.repo.CreatePhoneNumber(ctx, phone); err != nil {
		return dto.PhoneNumberResponse{}, err
	}

	return dto.PhoneNumberResponse{
		ID:          phone.ID,
		SupplierID:  phone.SupplierID,
		PhoneNumber: phone.PhoneNumber,
		Label:       phone.Label,
		IsPrimary:   phone.IsPrimary,
		CreatedAt:   phone.CreatedAt,
		UpdatedAt:   phone.UpdatedAt,
	}, nil
}

func (u *supplierUsecase) UpdatePhoneNumber(ctx context.Context, id string, req dto.UpdatePhoneNumberRequest) (dto.PhoneNumberResponse, error) {
	// For simplicity, we'll update directly. In production, you'd want a FindPhoneByID method
	phone := &models.SupplierPhoneNumber{ID: id}
	if req.PhoneNumber != "" {
		phone.PhoneNumber = req.PhoneNumber
	}
	if req.Label != "" {
		phone.Label = req.Label
	}
	if req.IsPrimary != nil {
		phone.IsPrimary = *req.IsPrimary
	}

	if err := u.repo.UpdatePhoneNumber(ctx, phone); err != nil {
		return dto.PhoneNumberResponse{}, err
	}

	return dto.PhoneNumberResponse{
		ID:          phone.ID,
		PhoneNumber: phone.PhoneNumber,
		Label:       phone.Label,
		IsPrimary:   phone.IsPrimary,
	}, nil
}

func (u *supplierUsecase) DeletePhoneNumber(ctx context.Context, id string) error {
	return u.repo.DeletePhoneNumber(ctx, id)
}

// Nested bank account operations
func (u *supplierUsecase) AddBankAccount(ctx context.Context, supplierID string, req dto.CreateSupplierBankRequest) (dto.SupplierBankResponse, error) {
	bank := &models.SupplierBank{
		ID:            uuid.New().String(),
		SupplierID:    supplierID,
		BankID:        req.BankID,
		AccountNumber: req.AccountNumber,
		AccountName:   req.AccountName,
		Branch:        req.Branch,
		IsPrimary:     req.IsPrimary,
	}

	if err := u.repo.CreateBankAccount(ctx, bank); err != nil {
		return dto.SupplierBankResponse{}, err
	}

	return dto.SupplierBankResponse{
		ID:            bank.ID,
		SupplierID:    bank.SupplierID,
		BankID:        bank.BankID,
		AccountNumber: bank.AccountNumber,
		AccountName:   bank.AccountName,
		Branch:        bank.Branch,
		IsPrimary:     bank.IsPrimary,
		CreatedAt:     bank.CreatedAt,
		UpdatedAt:     bank.UpdatedAt,
	}, nil
}

func (u *supplierUsecase) UpdateBankAccount(ctx context.Context, id string, req dto.UpdateSupplierBankRequest) (dto.SupplierBankResponse, error) {
	bank := &models.SupplierBank{ID: id}
	if req.BankID != "" {
		bank.BankID = req.BankID
	}
	if req.AccountNumber != "" {
		bank.AccountNumber = req.AccountNumber
	}
	if req.AccountName != "" {
		bank.AccountName = req.AccountName
	}
	if req.Branch != "" {
		bank.Branch = req.Branch
	}
	if req.IsPrimary != nil {
		bank.IsPrimary = *req.IsPrimary
	}

	if err := u.repo.UpdateBankAccount(ctx, bank); err != nil {
		return dto.SupplierBankResponse{}, err
	}

	return dto.SupplierBankResponse{
		ID:            bank.ID,
		BankID:        bank.BankID,
		AccountNumber: bank.AccountNumber,
		AccountName:   bank.AccountName,
		Branch:        bank.Branch,
		IsPrimary:     bank.IsPrimary,
	}, nil
}

func (u *supplierUsecase) DeleteBankAccount(ctx context.Context, id string) error {
	return u.repo.DeleteBankAccount(ctx, id)
}
