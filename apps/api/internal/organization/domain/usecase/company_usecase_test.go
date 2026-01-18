package usecase_test

import (
	"context"
	"testing"

	"github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/usecase"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/usecase/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

func TestCompanyUsecase_GetByID(t *testing.T) {
	type fields struct {
		companyRepo *mocks.CompanyRepository
	}
	type args struct {
		ctx context.Context
		id  string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		mock    func(f fields)
		want    *dto.CompanyResponse
		wantErr bool
		err     error
	}{
		{
			name: "Success",
			fields: fields{
				companyRepo: mocks.NewCompanyRepository(t),
			},
			args: args{
				ctx: context.Background(),
				id:  "company-1",
			},
			mock: func(f fields) {
				company := &models.Company{
					ID:   "company-1",
					Name: "Test Company",
				}
				f.companyRepo.On("FindByIDWithVillage", mock.Anything, "company-1").Return(company, nil)
			},
			want: &dto.CompanyResponse{
				ID:   "company-1",
				Name: "Test Company",
			},
			wantErr: false,
		},
		{
			name: "Not Found",
			fields: fields{
				companyRepo: mocks.NewCompanyRepository(t),
			},
			args: args{
				ctx: context.Background(),
				id:  "company-99",
			},
			mock: func(f fields) {
				f.companyRepo.On("FindByIDWithVillage", mock.Anything, "company-99").Return(nil, gorm.ErrRecordNotFound)
			},
			want:    nil,
			wantErr: true,
			err:     usecase.ErrCompanyNotFound,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := usecase.NewCompanyUsecase(tt.fields.companyRepo)

			if tt.mock != nil {
				tt.mock(tt.fields)
			}

			got, err := u.GetByID(tt.args.ctx, tt.args.id)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.err != nil {
					assert.Equal(t, tt.err, err)
				}
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.want.ID, got.ID)
				assert.Equal(t, tt.want.Name, got.Name)
			}
		})
	}
}

func TestCompanyUsecase_Create(t *testing.T) {
	type fields struct {
		companyRepo *mocks.CompanyRepository
	}
	type args struct {
		ctx       context.Context
		req       *dto.CreateCompanyRequest
		createdBy *string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		mock    func(f fields)
		want    *dto.CompanyResponse
		wantErr bool
	}{
		{
			name: "Success",
			fields: fields{
				companyRepo: mocks.NewCompanyRepository(t),
			},
			args: args{
				ctx: context.Background(),
				req: &dto.CreateCompanyRequest{
					Name: "New Company",
				},
				createdBy: nil,
			},
			mock: func(f fields) {
				f.companyRepo.On("Create", mock.Anything, mock.MatchedBy(func(c *models.Company) bool {
					return c.Name == "New Company"
				})).Return(nil)
				f.companyRepo.On("FindByIDWithVillage", mock.Anything, mock.Anything).Return(&models.Company{
					ID:   "new-id",
					Name: "New Company",
				}, nil)
			},
			want: &dto.CompanyResponse{
				Name: "New Company",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := usecase.NewCompanyUsecase(tt.fields.companyRepo)

			if tt.mock != nil {
				tt.mock(tt.fields)
			}

			got, err := u.Create(tt.args.ctx, tt.args.req, tt.args.createdBy)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.want.Name, got.Name)
			}
		})
	}
}

func TestCompanyUsecase_Approve(t *testing.T) {
	type fields struct {
		companyRepo *mocks.CompanyRepository
	}
	type args struct {
		ctx        context.Context
		id         string
		req        *dto.ApproveCompanyRequest
		approvedBy string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		mock    func(f fields)
		want    *dto.CompanyResponse
		wantErr bool
		err     error
	}{
		{
			name: "Success Approve",
			fields: fields{
				companyRepo: mocks.NewCompanyRepository(t),
			},
			args: args{
				ctx: context.Background(),
				id:  "company-1",
				req: &dto.ApproveCompanyRequest{
					Action: "approve",
				},
				approvedBy: "admin",
			},
			mock: func(f fields) {
				f.companyRepo.On("FindByID", mock.Anything, "company-1").Return(&models.Company{
					ID:     "company-1",
					Status: models.CompanyStatusPending,
				}, nil)
				f.companyRepo.On("Update", mock.Anything, mock.MatchedBy(func(c *models.Company) bool {
					return c.Status == models.CompanyStatusApproved && c.IsApproved == true
				})).Return(nil)
				f.companyRepo.On("FindByIDWithVillage", mock.Anything, "company-1").Return(&models.Company{
					ID:         "company-1",
					Status:     models.CompanyStatusApproved,
					IsApproved: true,
				}, nil)
			},
			want: &dto.CompanyResponse{
				ID:         "company-1",
				Status:     string(models.CompanyStatusApproved),
				IsApproved: true,
			},
			wantErr: false,
		},
		{
			name: "Not Pending",
			fields: fields{
				companyRepo: mocks.NewCompanyRepository(t),
			},
			args: args{
				ctx: context.Background(),
				id:  "company-1",
				req: &dto.ApproveCompanyRequest{
					Action: "approve",
				},
				approvedBy: "admin",
			},
			mock: func(f fields) {
				f.companyRepo.On("FindByID", mock.Anything, "company-1").Return(&models.Company{
					ID:     "company-1",
					Status: models.CompanyStatusApproved,
				}, nil)
			},
			want:    nil,
			wantErr: true,
			err:     usecase.ErrCompanyNotPending,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := usecase.NewCompanyUsecase(tt.fields.companyRepo)

			if tt.mock != nil {
				tt.mock(tt.fields)
			}

			got, err := u.Approve(tt.args.ctx, tt.args.id, tt.args.req, tt.args.approvedBy)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.err != nil {
					assert.Equal(t, tt.err, err)
				}
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.want.Status, got.Status)
				assert.Equal(t, tt.want.IsApproved, got.IsApproved)
			}
		})
	}
}
