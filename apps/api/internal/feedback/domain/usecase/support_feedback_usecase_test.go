package usecase_test

import (
	"context"
	"testing"

	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"github.com/gilabs/gims/api/internal/feedback/domain/dto"
	"github.com/gilabs/gims/api/internal/feedback/domain/usecase"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	userDto "github.com/gilabs/gims/api/internal/user/domain/dto"
)

type mockSupportFeedbackRepository struct {
	createdFeedback *models.SupportFeedback
}

func (m *mockSupportFeedbackRepository) Create(ctx context.Context, feedback *models.SupportFeedback) error {
	m.createdFeedback = feedback
	return nil
}

func (m *mockSupportFeedbackRepository) List(ctx context.Context, page, perPage int) ([]models.SupportFeedback, int64, error) {
	return nil, 0, nil
}

func (m *mockSupportFeedbackRepository) Delete(ctx context.Context, id string) error {
	return nil
}

type mockUserRepository struct{}

func (m *mockUserRepository) FindByID(ctx context.Context, id string) (*userModels.User, error) {
	return &userModels.User{ID: id, Name: "Test User", Email: "test@user.com"}, nil
}
func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (*userModels.User, error) {
	return nil, nil
}
func (m *mockUserRepository) List(ctx context.Context, req *userDto.ListUsersRequest) ([]userModels.User, int64, error) {
	return nil, 0, nil
}
func (m *mockUserRepository) FindAvailable(ctx context.Context, search string, excludeEmployeeID string) ([]userModels.User, error) {
	return nil, nil
}
func (m *mockUserRepository) Count(ctx context.Context) (int64, error) {
	return 0, nil
}
func (m *mockUserRepository) Create(ctx context.Context, u *userModels.User) error {
	return nil
}
func (m *mockUserRepository) Update(ctx context.Context, u *userModels.User) error {
	return nil
}
func (m *mockUserRepository) Delete(ctx context.Context, id string) error {
	return nil
}

type mockTenantRepository struct{}

func (m *mockTenantRepository) FindByID(ctx context.Context, id string) (*tenantModels.Tenant, error) {
	return &tenantModels.Tenant{ID: id, Name: "Test Tenant"}, nil
}
func (m *mockTenantRepository) FindBySlug(ctx context.Context, slug string) (*tenantModels.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepository) FindAll(ctx context.Context) ([]tenantModels.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepository) FindPaginated(ctx context.Context, search string, page, perPage int) ([]tenantModels.Tenant, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepository) FindPaginatedWithCounts(ctx context.Context, search string, page, perPage int) ([]tenantRepos.TenantWithCounts, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepository) FindByIDWithCounts(ctx context.Context, id string) (*tenantRepos.TenantWithCounts, error) {
	return nil, nil
}
func (m *mockTenantRepository) CountActiveUsers(ctx context.Context, tenantID string) (int64, error) {
	return 0, nil
}
func (m *mockTenantRepository) Create(ctx context.Context, tenant *tenantModels.Tenant) error {
	return nil
}
func (m *mockTenantRepository) Update(ctx context.Context, tenant *tenantModels.Tenant) error {
	return nil
}

func TestSupportFeedbackSanitization(t *testing.T) {
	supportRepo := &mockSupportFeedbackRepository{}
	userRepo := &mockUserRepository{}
	tenantRepo := &mockTenantRepository{}

	uc := usecase.NewSupportFeedbackUsecase(supportRepo, userRepo, tenantRepo)

	req := &dto.SubmitSupportFeedbackRequest{
		Message: "Hello **world** <script>alert('xss')</script> and inline <img src=x onerror=alert(1)>",
	}

	_, err := uc.SubmitFeedback(context.Background(), "user-123", "tenant-123", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := "Hello **world** &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; and inline &lt;img src=x onerror=alert(1)&gt;"
	if supportRepo.createdFeedback.Message != expected {
		t.Errorf("expected sanitized message:\n%s\ngot:\n%s", expected, supportRepo.createdFeedback.Message)
	}
}
