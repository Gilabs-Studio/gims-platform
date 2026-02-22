package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/customer/data/models"
	"github.com/gilabs/gims/api/internal/customer/data/repositories"
	"github.com/gilabs/gims/api/internal/customer/domain/dto"
	"github.com/gilabs/gims/api/internal/customer/domain/mapper"
	"github.com/google/uuid"
)

// CustomerUsecase defines the interface for customer business logic
type CustomerUsecase interface {
	Create(ctx context.Context, userID string, req dto.CreateCustomerRequest) (dto.CustomerResponse, error)
	GetByID(ctx context.Context, id string) (dto.CustomerResponse, error)
	List(ctx context.Context, params repositories.CustomerListParams) ([]dto.CustomerResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateCustomerRequest) (dto.CustomerResponse, error)
	Delete(ctx context.Context, id string) error
	// Approval workflow
	Submit(ctx context.Context, id string) (dto.CustomerResponse, error)
	Approve(ctx context.Context, id string, userID string, req dto.ApproveCustomerRequest) (dto.CustomerResponse, error)
	// Nested operations
	AddPhoneNumber(ctx context.Context, customerID string, req dto.CreatePhoneNumberRequest) (dto.PhoneNumberResponse, error)
	UpdatePhoneNumber(ctx context.Context, id string, req dto.UpdatePhoneNumberRequest) (dto.PhoneNumberResponse, error)
	DeletePhoneNumber(ctx context.Context, id string) error
	AddBankAccount(ctx context.Context, customerID string, req dto.CreateCustomerBankRequest) (dto.CustomerBankResponse, error)
	UpdateBankAccount(ctx context.Context, id string, req dto.UpdateCustomerBankRequest) (dto.CustomerBankResponse, error)
	DeleteBankAccount(ctx context.Context, id string) error
	// Form data for dropdowns
	GetFormData(ctx context.Context) (*dto.CustomerFormDataResponse, error)
}

type customerUsecase struct {
	repo         repositories.CustomerRepository
	typeRepo     repositories.CustomerTypeRepository
}

// NewCustomerUsecase creates a new CustomerUsecase
func NewCustomerUsecase(repo repositories.CustomerRepository, typeRepo repositories.CustomerTypeRepository) CustomerUsecase {
	return &customerUsecase{repo: repo, typeRepo: typeRepo}
}

func (u *customerUsecase) Create(ctx context.Context, userID string, req dto.CreateCustomerRequest) (dto.CustomerResponse, error) {
	// Check if code already exists
	existing, _ := u.repo.FindByCode(ctx, req.Code)
	if existing != nil {
		return dto.CustomerResponse{}, errors.New("customer code already exists")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	customer := &models.Customer{
		ID:            uuid.New().String(),
		Code:          req.Code,
		Name:          req.Name,
		Address:       req.Address,
		Email:         req.Email,
		Website:       req.Website,
		NPWP:          req.NPWP,
		ContactPerson: req.ContactPerson,
		Notes:         req.Notes,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		Status:        models.CustomerStatusDraft,
		IsApproved:    false,
		CreatedBy:     &userID,
		IsActive:      isActive,
	}

	// Set optional FK relations
	if req.CustomerTypeID != "" {
		customer.CustomerTypeID = &req.CustomerTypeID
	}
	if req.VillageID != "" {
		customer.VillageID = &req.VillageID
	}

	if err := u.repo.Create(ctx, customer); err != nil {
		return dto.CustomerResponse{}, err
	}

	// Create nested phone numbers
	for _, phone := range req.PhoneNumbers {
		phoneModel := &models.CustomerPhoneNumber{
			ID:          uuid.New().String(),
			CustomerID:  customer.ID,
			PhoneNumber: phone.PhoneNumber,
			Label:       phone.Label,
			IsPrimary:   phone.IsPrimary,
		}
		if err := u.repo.CreatePhoneNumber(ctx, phoneModel); err != nil {
			return dto.CustomerResponse{}, err
		}
	}

	// Create nested bank accounts
	for _, bank := range req.BankAccounts {
		bankModel := &models.CustomerBank{
			ID:            uuid.New().String(),
			CustomerID:    customer.ID,
			BankID:        bank.BankID,
			AccountNumber: bank.AccountNumber,
			AccountName:   bank.AccountName,
			Branch:        bank.Branch,
			IsPrimary:     bank.IsPrimary,
		}
		if err := u.repo.CreateBankAccount(ctx, bankModel); err != nil {
			return dto.CustomerResponse{}, err
		}
	}

	// Reload to get all populated relations
	customer, err := u.repo.FindByID(ctx, customer.ID)
	if err != nil {
		return dto.CustomerResponse{}, err
	}

	return mapper.ToCustomerResponse(customer), nil
}

func (u *customerUsecase) GetByID(ctx context.Context, id string) (dto.CustomerResponse, error) {
	customer, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.CustomerResponse{}, err
	}
	return mapper.ToCustomerResponse(customer), nil
}

func (u *customerUsecase) List(ctx context.Context, params repositories.CustomerListParams) ([]dto.CustomerResponse, int64, error) {
	customers, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToCustomerResponseList(customers), total, nil
}

func (u *customerUsecase) Update(ctx context.Context, id string, req dto.UpdateCustomerRequest) (dto.CustomerResponse, error) {
	customer, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.CustomerResponse{}, err
	}

	// Only allow updates on draft, rejected, or approved status
	if customer.Status != models.CustomerStatusDraft && customer.Status != models.CustomerStatusRejected && customer.Status != models.CustomerStatusApproved {
		return dto.CustomerResponse{}, errors.New("cannot update customer in current status")
	}

	if req.Code != "" {
		existing, _ := u.repo.FindByCode(ctx, req.Code)
		if existing != nil && existing.ID != id {
			return dto.CustomerResponse{}, errors.New("customer code already exists")
		}
		customer.Code = req.Code
	}
	if req.Name != "" {
		customer.Name = req.Name
	}
	if req.Address != "" {
		customer.Address = req.Address
	}
	if req.Email != "" {
		customer.Email = req.Email
	}
	if req.Website != "" {
		customer.Website = req.Website
	}
	if req.NPWP != "" {
		customer.NPWP = req.NPWP
	}
	if req.ContactPerson != "" {
		customer.ContactPerson = req.ContactPerson
	}
	if req.Notes != "" {
		customer.Notes = req.Notes
	}
	if req.CustomerTypeID != "" {
		customer.CustomerTypeID = &req.CustomerTypeID
	}
	if req.VillageID != "" {
		customer.VillageID = &req.VillageID
	}
	if req.Latitude != nil {
		customer.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		customer.Longitude = req.Longitude
	}
	if req.IsActive != nil {
		customer.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, customer); err != nil {
		return dto.CustomerResponse{}, err
	}

	// Reload for fresh relations
	customer, _ = u.repo.FindByID(ctx, id)
	return mapper.ToCustomerResponse(customer), nil
}

func (u *customerUsecase) Delete(ctx context.Context, id string) error {
	customer, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("customer not found")
	}

	// Only allow deletion of draft customers
	if customer.Status != models.CustomerStatusDraft {
		return errors.New("can only delete draft customers")
	}

	return u.repo.Delete(ctx, id)
}

// Submit transitions customer from draft/rejected to pending status
func (u *customerUsecase) Submit(ctx context.Context, id string) (dto.CustomerResponse, error) {
	customer, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.CustomerResponse{}, err
	}

	if customer.Status != models.CustomerStatusDraft && customer.Status != models.CustomerStatusRejected {
		return dto.CustomerResponse{}, errors.New("customer can only be submitted from draft or rejected status")
	}

	customer.Status = models.CustomerStatusPending
	if err := u.repo.Update(ctx, customer); err != nil {
		return dto.CustomerResponse{}, err
	}

	return mapper.ToCustomerResponse(customer), nil
}

// Approve handles approval or rejection of a pending customer
func (u *customerUsecase) Approve(ctx context.Context, id string, userID string, req dto.ApproveCustomerRequest) (dto.CustomerResponse, error) {
	customer, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.CustomerResponse{}, err
	}

	if customer.Status != models.CustomerStatusPending {
		return dto.CustomerResponse{}, errors.New("customer must be in pending status to approve/reject")
	}

	now := time.Now()
	customer.ApprovedBy = &userID
	customer.ApprovedAt = &now

	if req.Action == "approve" {
		customer.Status = models.CustomerStatusApproved
		customer.IsApproved = true
	} else {
		customer.Status = models.CustomerStatusRejected
		customer.IsApproved = false
	}

	if err := u.repo.Update(ctx, customer); err != nil {
		return dto.CustomerResponse{}, err
	}

	return mapper.ToCustomerResponse(customer), nil
}

// Nested phone number operations
func (u *customerUsecase) AddPhoneNumber(ctx context.Context, customerID string, req dto.CreatePhoneNumberRequest) (dto.PhoneNumberResponse, error) {
	phone := &models.CustomerPhoneNumber{
		ID:          uuid.New().String(),
		CustomerID:  customerID,
		PhoneNumber: req.PhoneNumber,
		Label:       req.Label,
		IsPrimary:   req.IsPrimary,
	}

	if err := u.repo.CreatePhoneNumber(ctx, phone); err != nil {
		return dto.PhoneNumberResponse{}, err
	}

	return dto.PhoneNumberResponse{
		ID:          phone.ID,
		CustomerID:  phone.CustomerID,
		PhoneNumber: phone.PhoneNumber,
		Label:       phone.Label,
		IsPrimary:   phone.IsPrimary,
		CreatedAt:   phone.CreatedAt,
		UpdatedAt:   phone.UpdatedAt,
	}, nil
}

func (u *customerUsecase) UpdatePhoneNumber(ctx context.Context, id string, req dto.UpdatePhoneNumberRequest) (dto.PhoneNumberResponse, error) {
	phone := &models.CustomerPhoneNumber{ID: id}
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

func (u *customerUsecase) DeletePhoneNumber(ctx context.Context, id string) error {
	return u.repo.DeletePhoneNumber(ctx, id)
}

// Nested bank account operations
func (u *customerUsecase) AddBankAccount(ctx context.Context, customerID string, req dto.CreateCustomerBankRequest) (dto.CustomerBankResponse, error) {
	bank := &models.CustomerBank{
		ID:            uuid.New().String(),
		CustomerID:    customerID,
		BankID:        req.BankID,
		AccountNumber: req.AccountNumber,
		AccountName:   req.AccountName,
		Branch:        req.Branch,
		IsPrimary:     req.IsPrimary,
	}

	if err := u.repo.CreateBankAccount(ctx, bank); err != nil {
		return dto.CustomerBankResponse{}, err
	}

	return dto.CustomerBankResponse{
		ID:            bank.ID,
		CustomerID:    bank.CustomerID,
		BankID:        bank.BankID,
		AccountNumber: bank.AccountNumber,
		AccountName:   bank.AccountName,
		Branch:        bank.Branch,
		IsPrimary:     bank.IsPrimary,
		CreatedAt:     bank.CreatedAt,
		UpdatedAt:     bank.UpdatedAt,
	}, nil
}

func (u *customerUsecase) UpdateBankAccount(ctx context.Context, id string, req dto.UpdateCustomerBankRequest) (dto.CustomerBankResponse, error) {
	bank := &models.CustomerBank{ID: id}
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
		return dto.CustomerBankResponse{}, err
	}

	return dto.CustomerBankResponse{
		ID:            bank.ID,
		BankID:        bank.BankID,
		AccountNumber: bank.AccountNumber,
		AccountName:   bank.AccountName,
		Branch:        bank.Branch,
		IsPrimary:     bank.IsPrimary,
	}, nil
}

func (u *customerUsecase) DeleteBankAccount(ctx context.Context, id string) error {
	return u.repo.DeleteBankAccount(ctx, id)
}

// GetFormData returns dropdown options for customer forms
func (u *customerUsecase) GetFormData(ctx context.Context) (*dto.CustomerFormDataResponse, error) {
	customerTypes, _, err := u.typeRepo.List(ctx, repositories.ListParams{
		Limit: 100,
	})
	if err != nil {
		return nil, err
	}

	return &dto.CustomerFormDataResponse{
		CustomerTypes: mapper.ToCustomerTypeResponseList(customerTypes),
	}, nil
}
