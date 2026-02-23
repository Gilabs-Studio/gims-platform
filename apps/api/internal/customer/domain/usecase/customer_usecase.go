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
	"gorm.io/gorm"
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
	db           *gorm.DB
}

// NewCustomerUsecase creates a new CustomerUsecase
func NewCustomerUsecase(repo repositories.CustomerRepository, typeRepo repositories.CustomerTypeRepository, db *gorm.DB) CustomerUsecase {
	return &customerUsecase{repo: repo, typeRepo: typeRepo, db: db}
}

func (u *customerUsecase) Create(ctx context.Context, userID string, req dto.CreateCustomerRequest) (dto.CustomerResponse, error) {
	// Auto-generate code if not provided
	if req.Code == "" {
		genCode, err := u.repo.GetNextCode(ctx)
		if err != nil {
			return dto.CustomerResponse{}, err
		}
		req.Code = genCode
	}

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
	// Set sales defaults
	customer.DefaultBusinessTypeID = req.DefaultBusinessTypeID
	customer.DefaultAreaID = req.DefaultAreaID
	customer.DefaultSalesRepID = req.DefaultSalesRepID
	customer.DefaultPaymentTermsID = req.DefaultPaymentTermsID
	customer.DefaultTaxRate = req.DefaultTaxRate

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
	// Update sales defaults (nil pointer means "clear the value")
	if req.DefaultBusinessTypeID != nil {
		customer.DefaultBusinessTypeID = req.DefaultBusinessTypeID
	}
	if req.DefaultAreaID != nil {
		customer.DefaultAreaID = req.DefaultAreaID
	}
	if req.DefaultSalesRepID != nil {
		customer.DefaultSalesRepID = req.DefaultSalesRepID
	}
	if req.DefaultPaymentTermsID != nil {
		customer.DefaultPaymentTermsID = req.DefaultPaymentTermsID
	}
	if req.DefaultTaxRate != nil {
		customer.DefaultTaxRate = req.DefaultTaxRate
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

	// Load business types
	type btRow struct {
		ID   string
		Name string
	}
	var btRows []btRow
	u.db.WithContext(ctx).Table("business_types").
		Select("id, name").Where("deleted_at IS NULL").
		Order("name").Scan(&btRows)
	btOptions := make([]dto.SalesDefaultOptionBrief, 0, len(btRows))
	for _, r := range btRows {
		btOptions = append(btOptions, dto.SalesDefaultOptionBrief{ID: r.ID, Name: r.Name})
	}

	// Load areas
	type areaRow struct {
		ID   string
		Name string
	}
	var areaRows []areaRow
	u.db.WithContext(ctx).Table("areas").
		Select("id, name").Where("deleted_at IS NULL").
		Order("name").Scan(&areaRows)
	areaOptions := make([]dto.SalesDefaultOptionBrief, 0, len(areaRows))
	for _, r := range areaRows {
		areaOptions = append(areaOptions, dto.SalesDefaultOptionBrief{ID: r.ID, Name: r.Name})
	}

	// Load employees (sales reps)
	type empRow struct {
		ID           string
		EmployeeCode string
		Name         string
	}
	var empRows []empRow
	u.db.WithContext(ctx).Table("employees").
		Select("id, employee_code, name").Where("deleted_at IS NULL").
		Order("name").Scan(&empRows)
	salesRepOptions := make([]dto.SalesRepBrief, 0, len(empRows))
	for _, r := range empRows {
		salesRepOptions = append(salesRepOptions, dto.SalesRepBrief{
			ID:           r.ID,
			EmployeeCode: r.EmployeeCode,
			Name:         r.Name,
		})
	}

	// Load payment terms
	type ptRow struct {
		ID   string
		Code string
		Name string
		Days int
	}
	var ptRows []ptRow
	u.db.WithContext(ctx).Table("payment_terms").
		Select("id, code, name, days").Where("deleted_at IS NULL AND is_active = true").
		Order("days").Scan(&ptRows)
	ptOptions := make([]dto.PaymentTermsFormOption, 0, len(ptRows))
	for _, r := range ptRows {
		ptOptions = append(ptOptions, dto.PaymentTermsFormOption{
			ID:   r.ID,
			Code: r.Code,
			Name: r.Name,
			Days: r.Days,
		})
	}

	return &dto.CustomerFormDataResponse{
		CustomerTypes: mapper.ToCustomerTypeResponseList(customerTypes),
		BusinessTypes: btOptions,
		Areas:         areaOptions,
		SalesReps:     salesRepOptions,
		PaymentTerms:  ptOptions,
	}, nil
}
