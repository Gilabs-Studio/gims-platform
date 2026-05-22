implementasikan reset password by email hapus reset password dari system admin dan by user management admin berikut refrensinya terutama yang perlu dihapus 

kevin@kevin-ThinkPad-T480:~/Documents/GiLabs/Projects/GIMS by GILABS$ git diff
diff --git a/apps/api/cmd/api/main.go b/apps/api/cmd/api/main.go
index 8a6e296c..5a6d1947 100644
--- a/apps/api/cmd/api/main.go
+++ b/apps/api/cmd/api/main.go
@@ -292,7 +292,7 @@ func main() {
        userUC := userUsecase.NewUserUsecase(userRepository, roleRepository, tenantRepository, subscriptionRepository, auditService, eventPublisher, redis.GetClient())
        roleUC := roleUsecase.NewRoleUsecase(roleRepository, eventPublisher, redis.GetClient(), permissionService, database.DB, subscriptionPlanRepository)
        permissionUC := permissionUsecase.NewPermissionUsecase(permissionRepository, userRepository)
-       passwordResetUC := passwordResetUsecase.NewPasswordResetUsecase(passwordResetRepository, userRepository, roleRepository, notificationRepository, auditService, eventPublisher, redis.GetClient())
+       passwordResetUC := passwordResetUsecase.NewPasswordResetUsecase(passwordResetRepository, userRepository, roleRepository, tenantRepository, sysAdminRepository, notificationRepository, auditService, eventPublisher, redis.GetClient())
 
        // Setup Handlers
        authH := authHandler.NewAuthHandler(authUC, couponUC, planUC)
@@ -305,7 +305,7 @@ func main() {
        // SaaS: System admin usecases & handler
        sysAdminUC := tenantUsecase.NewSystemAdminUsecase(sysAdminRepository, jwtManager)
        sysAdminTenantUC := tenantUsecase.NewTenantUsecase(tenantRepository)
-       sysAdminH := tenantHandler.NewSystemAdminHandler(sysAdminUC, sysAdminTenantUC, couponUC, subUC, planUC, permissionRepository)
+       sysAdminH := tenantHandler.NewSystemAdminHandler(sysAdminUC, sysAdminTenantUC, couponUC, subUC, planUC, passwordResetUC, permissionRepository, notificationWs.DefaultNotificationHub())
 
        // Payment transaction usecase
        paymentTxnRepository := tenantRepos.NewPaymentTransactionRepository(database.DB)
diff --git a/apps/api/internal/password_reset/data/repositories/password_reset_request_repository.go b/apps/api/internal/password_reset/data/repositories/password_reset_request_repository.go
index 609df87f..37588eab 100644
--- a/apps/api/internal/password_reset/data/repositories/password_reset_request_repository.go
+++ b/apps/api/internal/password_reset/data/repositories/password_reset_request_repository.go
@@ -2,18 +2,34 @@ package repositories
 
 import (
        "context"
+       "time"
 
        "github.com/gilabs/gims/api/internal/core/infrastructure/database"
        "github.com/gilabs/gims/api/internal/password_reset/data/models"
        "gorm.io/gorm"
 )
 
+type TenantOwnerPendingRequest struct {
+       RequestID   string
+       Token       string
+       UserID      string
+       UserName    string
+       UserEmail   string
+       TenantID    string
+       TenantName  string
+       Status      string
+       RequestedAt time.Time
+       ExpiresAt   time.Time
+}
+
 // PasswordResetRequestRepository defines data access for password reset requests.
 type PasswordResetRequestRepository interface {
        Create(ctx context.Context, req *models.PasswordResetRequest) error
        FindByToken(ctx context.Context, token string) (*models.PasswordResetRequest, error)
        FindByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error)
        FindPendingByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error)
+       ListPendingTenantOwner(ctx context.Context, search string, page, perPage int) ([]TenantOwnerPendingRequest, int64, error)
+       CountPendingTenantOwner(ctx context.Context) (int64, error)
        Update(ctx context.Context, req *models.PasswordResetRequest) error
        DeleteByUserID(ctx context.Context, userID string) error
        DeleteExpired(ctx context.Context) error
@@ -68,6 +84,73 @@ func (r *passwordResetRequestRepository) FindPendingByUserID(ctx context.Context
        return &req, nil
 }
 
+func (r *passwordResetRequestRepository) ListPendingTenantOwner(ctx context.Context, search string, page, perPage int) ([]TenantOwnerPendingRequest, int64, error) {
+       if page < 1 {
+               page = 1
+       }
+       if perPage < 1 {
+               perPage = 20
+       }
+
+       query := r.getDB(ctx).
+               Table("password_reset_requests pr").
+               Joins("JOIN users u ON u.id = pr.user_id AND u.deleted_at IS NULL").
+               Joins("JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL").
+               Where("pr.status = ?", models.PasswordResetStatusPending).
+               Where("t.owner_user_id = u.id")
+
+       if search != "" {
+               like := "%" + search + "%"
+               query = query.Where("u.email ILIKE ? OR u.name ILIKE ? OR t.name ILIKE ?", like, like, like)
+       }
+
+       var total int64
+       if err := query.Count(&total).Error; err != nil {
+               return nil, 0, err
+       }
+
+       offset := (page - 1) * perPage
+       rows := make([]TenantOwnerPendingRequest, 0)
+       err := query.
+               Select(`
+                       pr.id AS request_id,
+                       pr.token AS token,
+                       u.id AS user_id,
+                       u.name AS user_name,
+                       u.email AS user_email,
+                       t.id AS tenant_id,
+                       t.name AS tenant_name,
+                       pr.status AS status,
+                       pr.created_at AS requested_at,
+                       pr.expires_at AS expires_at
+               `).
+               Order("pr.created_at DESC").
+               Offset(offset).
+               Limit(perPage).
+               Scan(&rows).Error
+       if err != nil {
+               return nil, 0, err
+       }
+
+       return rows, total, nil
+}
+
+func (r *passwordResetRequestRepository) CountPendingTenantOwner(ctx context.Context) (int64, error) {
+       var total int64
+       err := r.getDB(ctx).
+               Table("password_reset_requests pr").
+               Joins("JOIN users u ON u.id = pr.user_id AND u.deleted_at IS NULL").
+               Joins("JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL").
+               Where("pr.status = ?", models.PasswordResetStatusPending).
+               Where("t.owner_user_id = u.id").
+               Count(&total).Error
+       if err != nil {
+               return 0, err
+       }
+
+       return total, nil
+}
+
 func (r *passwordResetRequestRepository) Update(ctx context.Context, req *models.PasswordResetRequest) error {
        return r.getDB(ctx).Save(req).Error
 }
diff --git a/apps/api/internal/password_reset/domain/dto/password_reset_dto.go b/apps/api/internal/password_reset/domain/dto/password_reset_dto.go
index 7bc23e53..b8b06152 100644
--- a/apps/api/internal/password_reset/domain/dto/password_reset_dto.go
+++ b/apps/api/internal/password_reset/domain/dto/password_reset_dto.go
@@ -35,3 +35,22 @@ type PasswordResetRequestResponse struct {
        UsedAt    *time.Time `json:"used_at"`
        CreatedAt time.Time  `json:"created_at"`
 }
+
+// TenantOwnerPasswordResetQueueItem represents a pending tenant-owner reset request for system admin queue.
+type TenantOwnerPasswordResetQueueItem struct {
+       RequestID   string    `json:"request_id"`
+       Token       string    `json:"token"`
+       UserID      string    `json:"user_id"`
+       UserName    string    `json:"user_name"`
+       UserEmail   string    `json:"user_email"`
+       TenantID    string    `json:"tenant_id"`
+       TenantName  string    `json:"tenant_name"`
+       Status      string    `json:"status"`
+       RequestedAt time.Time `json:"requested_at"`
+       ExpiresAt   time.Time `json:"expires_at"`
+}
+
+// TenantOwnerPasswordResetPendingCountResponse represents pending queue count for system admins.
+type TenantOwnerPasswordResetPendingCountResponse struct {
+       PendingCount int64 `json:"pending_count"`
+}
diff --git a/apps/api/internal/password_reset/domain/usecase/password_reset_usecase.go b/apps/api/internal/password_reset/domain/usecase/password_reset_usecase.go
index 53136c03..018e6d7b 100644
--- a/apps/api/internal/password_reset/domain/usecase/password_reset_usecase.go
+++ b/apps/api/internal/password_reset/domain/usecase/password_reset_usecase.go
@@ -6,6 +6,7 @@ import (
        "encoding/hex"
        "errors"
        "fmt"
+       "strings"
        "time"
 
        "github.com/gilabs/gims/api/internal/core/apptime"
@@ -18,6 +19,7 @@ import (
        resetDto "github.com/gilabs/gims/api/internal/password_reset/domain/dto"
        "github.com/gilabs/gims/api/internal/password_reset/domain/mapper"
        roleRepo "github.com/gilabs/gims/api/internal/role/data/repositories"
+       tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
        userModels "github.com/gilabs/gims/api/internal/user/data/models"
        userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
        userDto "github.com/gilabs/gims/api/internal/user/domain/dto"
@@ -37,12 +39,24 @@ type PasswordResetUsecase interface {
        ForgotPassword(ctx context.Context, req *resetDto.ForgotPasswordRequest) (*resetDto.ForgotPasswordResponse, error)
        ResetPassword(ctx context.Context, req *resetDto.ResetPasswordRequest) (*resetDto.ResetPasswordResponse, error)
        ValidateResetToken(ctx context.Context, token string) error
+       ListTenantOwnerRequests(ctx context.Context, page, perPage int, search string) ([]resetDto.TenantOwnerPasswordResetQueueItem, int64, error)
+       GetTenantOwnerPendingCount(ctx context.Context) (*resetDto.TenantOwnerPasswordResetPendingCountResponse, error)
+}
+
+type tenantLookupRepository interface {
+       FindByID(ctx context.Context, id string) (*tenantModels.Tenant, error)
+}
+
+type systemAdminLookupRepository interface {
+       ListActive(ctx context.Context) ([]tenantModels.SystemAdmin, error)
 }
 
 type passwordResetUsecase struct {
        passwordResetRepo repositories.PasswordResetRequestRepository
        userRepo          userRepo.UserRepository
        roleRepo          roleRepo.RoleRepository
+       tenantRepo        tenantLookupRepository
+       systemAdminRepo   systemAdminLookupRepository
        notificationRepo  notificationRepo.NotificationRepository
        auditService      audit.AuditService
        eventPublisher    infraEvents.EventPublisher
@@ -53,6 +67,8 @@ func NewPasswordResetUsecase(
        passwordResetRepo repositories.PasswordResetRequestRepository,
        userRepo userRepo.UserRepository,
        roleRepo roleRepo.RoleRepository,
+       tenantRepo tenantLookupRepository,
+       systemAdminRepo systemAdminLookupRepository,
        notificationRepo notificationRepo.NotificationRepository,
        auditService audit.AuditService,
        eventPublisher infraEvents.EventPublisher,
@@ -62,6 +78,8 @@ func NewPasswordResetUsecase(
                passwordResetRepo: passwordResetRepo,
                userRepo:          userRepo,
                roleRepo:          roleRepo,
+               tenantRepo:        tenantRepo,
+               systemAdminRepo:   systemAdminRepo,
                notificationRepo:  notificationRepo,
                auditService:      auditService,
                eventPublisher:    eventPublisher,
@@ -102,10 +120,25 @@ func (u *passwordResetUsecase) ForgotPassword(ctx context.Context, req *resetDto
        }
        u.invalidateUserCaches(ctx, user.ID)
 
-       if err := u.notifyAdminPasswordResetRequest(ctx, user, token); err != nil {
+       isTenantOwner, ownerCheckErr := u.isTenantOwnerRequester(ctx, user)
+       if ownerCheckErr != nil {
+               u.auditService.Log(ctx, "password_reset.tenant_owner_check_failed", user.ID, map[string]interface{}{
+                       "email": user.Email,
+                       "error": ownerCheckErr.Error(),
+               })
+       }
+
+       var notifyErr error
+       if isTenantOwner {
+               notifyErr = u.notifySystemAdminPasswordResetRequest(ctx, user, token)
+       } else {
+               notifyErr = u.notifyAdminPasswordResetRequest(ctx, user, token)
+       }
+
+       if notifyErr != nil {
                u.auditService.Log(ctx, "password_reset.notify_admin_failed", user.ID, map[string]interface{}{
                        "email": user.Email,
-                       "error": err.Error(),
+                       "error": notifyErr.Error(),
                })
        }
 
@@ -221,6 +254,84 @@ func (u *passwordResetUsecase) notifyAdminPasswordResetRequest(ctx context.Conte
        return u.notificationRepo.CreateBulk(ctx, notifications)
 }
 
+func (u *passwordResetUsecase) notifySystemAdminPasswordResetRequest(ctx context.Context, user *userModels.User, token string) error {
+       admins, err := u.systemAdminRepo.ListActive(ctx)
+       if err != nil {
+               return err
+       }
+
+       notifications := make([]notificationModels.Notification, 0, len(admins))
+       for _, admin := range admins {
+               notifications = append(notifications, notificationModels.Notification{
+                       UserID:     admin.ID,
+                       TenantID:   user.TenantID,
+                       Type:       notificationModels.NotificationTypeInfo,
+                       Title:      fmt.Sprintf("Tenant Owner Password Reset Request - %s", user.Name),
+                       Message:    fmt.Sprintf("Tenant owner %s (%s) requested password reset. Token: %s (expires in 24 hours)", user.Name, user.Email, token),
+                       EntityType: "password_reset_request",
+                       EntityID:   user.ID,
+                       IsRead:     false,
+               })
+       }
+
+       if len(notifications) == 0 {
+               return nil
+       }
+
+       return u.notificationRepo.CreateBulk(ctx, notifications)
+}
+
+func (u *passwordResetUsecase) isTenantOwnerRequester(ctx context.Context, user *userModels.User) (bool, error) {
+       if user == nil || strings.TrimSpace(user.TenantID) == "" {
+               return false, nil
+       }
+
+       tenant, err := u.tenantRepo.FindByID(ctx, user.TenantID)
+       if err != nil {
+               return false, err
+       }
+
+       if tenant.OwnerUserID == nil {
+               return false, nil
+       }
+
+       return strings.TrimSpace(*tenant.OwnerUserID) == strings.TrimSpace(user.ID), nil
+}
+
+func (u *passwordResetUsecase) ListTenantOwnerRequests(ctx context.Context, page, perPage int, search string) ([]resetDto.TenantOwnerPasswordResetQueueItem, int64, error) {
+       rows, total, err := u.passwordResetRepo.ListPendingTenantOwner(ctx, strings.TrimSpace(search), page, perPage)
+       if err != nil {
+               return nil, 0, err
+       }
+
+       items := make([]resetDto.TenantOwnerPasswordResetQueueItem, 0, len(rows))
+       for _, row := range rows {
+               items = append(items, resetDto.TenantOwnerPasswordResetQueueItem{
+                       RequestID:   row.RequestID,
+                       Token:       row.Token,
+                       UserID:      row.UserID,
+                       UserName:    row.UserName,
+                       UserEmail:   row.UserEmail,
+                       TenantID:    row.TenantID,
+                       TenantName:  row.TenantName,
+                       Status:      row.Status,
+                       RequestedAt: row.RequestedAt,
+                       ExpiresAt:   row.ExpiresAt,
+               })
+       }
+
+       return items, total, nil
+}
+
+func (u *passwordResetUsecase) GetTenantOwnerPendingCount(ctx context.Context) (*resetDto.TenantOwnerPasswordResetPendingCountResponse, error) {
+       total, err := u.passwordResetRepo.CountPendingTenantOwner(ctx)
+       if err != nil {
+               return nil, err
+       }
+
+       return &resetDto.TenantOwnerPasswordResetPendingCountResponse{PendingCount: total}, nil
+}
+
 func generateSecureToken(length int) (string, error) {
        b := make([]byte, length)
        if _, err := rand.Read(b); err != nil {
diff --git a/apps/api/internal/password_reset/domain/usecase/password_reset_usecase_test.go b/apps/api/internal/password_reset/domain/usecase/password_reset_usecase_test.go
index ce0f8329..116b94da 100644
--- a/apps/api/internal/password_reset/domain/usecase/password_reset_usecase_test.go
+++ b/apps/api/internal/password_reset/domain/usecase/password_reset_usecase_test.go
@@ -13,8 +13,10 @@ import (
        notificationModels "github.com/gilabs/gims/api/internal/notification/data/models"
        notificationRepo "github.com/gilabs/gims/api/internal/notification/data/repositories"
        passwordResetModels "github.com/gilabs/gims/api/internal/password_reset/data/models"
+       passwordResetRepo "github.com/gilabs/gims/api/internal/password_reset/data/repositories"
        resetDto "github.com/gilabs/gims/api/internal/password_reset/domain/dto"
        roleModels "github.com/gilabs/gims/api/internal/role/data/models"
+       tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
        userModels "github.com/gilabs/gims/api/internal/user/data/models"
        userDto "github.com/gilabs/gims/api/internal/user/domain/dto"
 )
@@ -40,6 +42,14 @@ func (f *fakePasswordResetRepo) FindPendingByUserID(ctx context.Context, userID
        return nil, gorm.ErrRecordNotFound
 }
 
+func (f *fakePasswordResetRepo) ListPendingTenantOwner(ctx context.Context, search string, page, perPage int) ([]passwordResetRepo.TenantOwnerPendingRequest, int64, error) {
+       return nil, 0, nil
+}
+
+func (f *fakePasswordResetRepo) CountPendingTenantOwner(ctx context.Context) (int64, error) {
+       return 0, nil
+}
+
 func (f *fakePasswordResetRepo) Update(ctx context.Context, req *passwordResetModels.PasswordResetRequest) error {
        return nil
 }
@@ -179,17 +189,40 @@ func (f *fakeNotificationRepo) CreateBulk(ctx context.Context, notifications []n
        return nil
 }
 
+type fakeTenantRepo struct {
+       tenant *tenantModels.Tenant
+}
+
+func (f *fakeTenantRepo) FindByID(ctx context.Context, id string) (*tenantModels.Tenant, error) {
+       if f.tenant == nil || f.tenant.ID != id {
+               return nil, gorm.ErrRecordNotFound
+       }
+       return f.tenant, nil
+}
+
+type fakeSystemAdminRepo struct {
+       admins []tenantModels.SystemAdmin
+}
+
+func (f *fakeSystemAdminRepo) ListActive(ctx context.Context) ([]tenantModels.SystemAdmin, error) {
+       return f.admins, nil
+}
+
 type noopAuditService struct{}
 
-func (noopAuditService) Log(ctx context.Context, action string, targetID string, metadata map[string]interface{}) {}
-func (noopAuditService) LogWithReason(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{}) {}
-func (noopAuditService) LogWithChanges(ctx context.Context, action string, targetID string, metadata map[string]interface{}, changes interface{}) {}
-func (noopAuditService) LogWithChangesFull(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{}, changes interface{}) {}
+func (noopAuditService) Log(ctx context.Context, action string, targetID string, metadata map[string]interface{}) {
+}
+func (noopAuditService) LogWithReason(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{}) {
+}
+func (noopAuditService) LogWithChanges(ctx context.Context, action string, targetID string, metadata map[string]interface{}, changes interface{}) {
+}
+func (noopAuditService) LogWithChangesFull(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{}, changes interface{}) {
+}
 
 type noopEventPublisher struct{}
 
 func (noopEventPublisher) Publish(ctx context.Context, event infraEvents.Event) error { return nil }
-func (noopEventPublisher) PublishAsync(ctx context.Context, event infraEvents.Event) {}
+func (noopEventPublisher) PublishAsync(ctx context.Context, event infraEvents.Event)  {}
 
 func TestForgotPasswordSetsTenantIDOnNotifications(t *testing.T) {
        ctx := context.Background()
@@ -212,11 +245,18 @@ func TestForgotPasswordSetsTenantIDOnNotifications(t *testing.T) {
        userRepo := &fakeUserRepo{user: requestingUser, users: []userModels.User{adminUser}}
        roleRepo := &fakeRoleRepo{role: adminRole}
        notificationRepo := &fakeNotificationRepo{}
+       tenantRepo := &fakeTenantRepo{tenant: &tenantModels.Tenant{ID: requestingUser.TenantID, OwnerUserID: func() *string {
+               notOwner := uuid.NewString()
+               return &notOwner
+       }()}}
+       systemAdminRepo := &fakeSystemAdminRepo{}
 
        uc := NewPasswordResetUsecase(
                passwordResetRepo,
                userRepo,
                roleRepo,
+               tenantRepo,
+               systemAdminRepo,
                notificationRepo,
                noopAuditService{},
                noopEventPublisher{},
@@ -252,4 +292,68 @@ func TestForgotPasswordSetsTenantIDOnNotifications(t *testing.T) {
        if len(passwordResetRepo.created) != 1 {
                t.Fatalf("expected 1 password reset record, got %d", len(passwordResetRepo.created))
        }
-}
\ No newline at end of file
+}
+
+func TestForgotPasswordTenantOwnerNotifiesSystemAdmins(t *testing.T) {
+       ctx := context.Background()
+       tenantID := uuid.NewString()
+       requestingUser := &userModels.User{
+               ID:       uuid.NewString(),
+               TenantID: tenantID,
+               Email:    "owner@example.com",
+               Name:     "Tenant Owner",
+               RoleID:   uuid.NewString(),
+       }
+       adminRole := &roleModels.Role{ID: uuid.NewString(), Code: "admin"}
+       tenantAdmin := userModels.User{
+               ID:     uuid.NewString(),
+               Email:  "tenant-admin@example.com",
+               Name:   "Tenant Admin Recipient",
+               RoleID: adminRole.ID,
+       }
+       sysAdminOne := tenantModels.SystemAdmin{ID: uuid.NewString(), Name: "System Admin 1", Status: "active"}
+       sysAdminTwo := tenantModels.SystemAdmin{ID: uuid.NewString(), Name: "System Admin 2", Status: "active"}
+
+       passwordResetRepo := &fakePasswordResetRepo{}
+       userRepo := &fakeUserRepo{user: requestingUser, users: []userModels.User{tenantAdmin}}
+       roleRepo := &fakeRoleRepo{role: adminRole}
+       notificationRepo := &fakeNotificationRepo{}
+       tenantRepo := &fakeTenantRepo{tenant: &tenantModels.Tenant{ID: tenantID, OwnerUserID: &requestingUser.ID}}
+       systemAdminRepo := &fakeSystemAdminRepo{admins: []tenantModels.SystemAdmin{sysAdminOne, sysAdminTwo}}
+
+       uc := NewPasswordResetUsecase(
+               passwordResetRepo,
+               userRepo,
+               roleRepo,
+               tenantRepo,
+               systemAdminRepo,
+               notificationRepo,
+               noopAuditService{},
+               noopEventPublisher{},
+               (*redis.Client)(nil),
+       )
+
+       _, err := uc.ForgotPassword(ctx, &resetDto.ForgotPasswordRequest{Email: requestingUser.Email})
+       if err != nil {
+               t.Fatalf("ForgotPassword returned error: %v", err)
+       }
+
+       if len(notificationRepo.created) != 2 {
+               t.Fatalf("expected 2 notifications for system admins, got %d", len(notificationRepo.created))
+       }
+
+       recipients := map[string]bool{}
+       for _, n := range notificationRepo.created {
+               recipients[n.UserID] = true
+               if n.TenantID != tenantID {
+                       t.Fatalf("expected tenant_id %s, got %s", tenantID, n.TenantID)
+               }
+       }
+
+       if !recipients[sysAdminOne.ID] || !recipients[sysAdminTwo.ID] {
+               t.Fatalf("expected recipients to include system admins %s and %s", sysAdminOne.ID, sysAdminTwo.ID)
+       }
+       if recipients[tenantAdmin.ID] {
+               t.Fatalf("did not expect tenant admin recipient %s for tenant-owner request", tenantAdmin.ID)
+       }
+}
diff --git a/apps/api/internal/tenant/data/repositories/system_admin_repository.go b/apps/api/internal/tenant/data/repositories/system_admin_repository.go
index c217c39d..0875374a 100644
--- a/apps/api/internal/tenant/data/repositories/system_admin_repository.go
+++ b/apps/api/internal/tenant/data/repositories/system_admin_repository.go
@@ -12,6 +12,7 @@ import (
 type SystemAdminRepository interface {
        FindByID(ctx context.Context, id string) (*models.SystemAdmin, error)
        FindByEmail(ctx context.Context, email string) (*models.SystemAdmin, error)
+       ListActive(ctx context.Context) ([]models.SystemAdmin, error)
        Create(ctx context.Context, admin *models.SystemAdmin) error
        Update(ctx context.Context, admin *models.SystemAdmin) error
 }
@@ -41,6 +42,19 @@ func (r *systemAdminRepository) FindByEmail(ctx context.Context, email string) (
        return &admin, err
 }
 
+func (r *systemAdminRepository) ListActive(ctx context.Context) ([]models.SystemAdmin, error) {
+       rows := make([]models.SystemAdmin, 0)
+       err := r.getDB(ctx).
+               Where("status = ?", "active").
+               Order("created_at ASC").
+               Find(&rows).Error
+       if err != nil {
+               return nil, err
+       }
+
+       return rows, nil
+}
+
 func (r *systemAdminRepository) Create(ctx context.Context, admin *models.SystemAdmin) error {
        return r.getDB(ctx).Create(admin).Error
 }
diff --git a/apps/api/internal/tenant/presentation/handler/system_admin_handler.go b/apps/api/internal/tenant/presentation/handler/system_admin_handler.go
index 8ca47343..e170c4ac 100644
--- a/apps/api/internal/tenant/presentation/handler/system_admin_handler.go
+++ b/apps/api/internal/tenant/presentation/handler/system_admin_handler.go
@@ -14,6 +14,9 @@ import (
        "github.com/gilabs/gims/api/internal/core/infrastructure/database"
        "github.com/gilabs/gims/api/internal/core/middleware"
        "github.com/gilabs/gims/api/internal/core/response"
+       notificationWS "github.com/gilabs/gims/api/internal/notification/infrastructure/ws"
+       passwordResetDto "github.com/gilabs/gims/api/internal/password_reset/domain/dto"
+       passwordResetUsecase "github.com/gilabs/gims/api/internal/password_reset/domain/usecase"
        permissionModels "github.com/gilabs/gims/api/internal/permission/data/models"
        permissionRepos "github.com/gilabs/gims/api/internal/permission/data/repositories"
        tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
@@ -21,6 +24,7 @@ import (
        "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
        "github.com/gin-gonic/gin"
        "github.com/go-playground/validator/v10"
+       "github.com/gorilla/websocket"
        "gorm.io/gorm"
 )
 
@@ -82,12 +86,15 @@ func clearSystemAdminAccessTokenCookies(c *gin.Context) {
 
 // SystemAdminHandler handles system admin HTTP requests.
 type SystemAdminHandler struct {
-       sysAdminUC     usecase.SystemAdminUsecase
-       tenantUC       usecase.TenantUsecase
-       couponUC       usecase.CouponUsecase
-       subUC          usecase.SubscriptionUsecase
-       planUC         usecase.SubscriptionPlanUsecase
-       permissionRepo permissionRepos.PermissionRepository
+       sysAdminUC      usecase.SystemAdminUsecase
+       tenantUC        usecase.TenantUsecase
+       couponUC        usecase.CouponUsecase
+       subUC           usecase.SubscriptionUsecase
+       planUC          usecase.SubscriptionPlanUsecase
+       passwordResetUC passwordResetUsecase.PasswordResetUsecase
+       permissionRepo  permissionRepos.PermissionRepository
+       notificationHub *notificationWS.NotificationHub
+       upgrader        websocket.Upgrader
 }
 
 type dashboardBusinessHealth struct {
@@ -167,15 +174,24 @@ func NewSystemAdminHandler(
        couponUC usecase.CouponUsecase,
        subUC usecase.SubscriptionUsecase,
        planUC usecase.SubscriptionPlanUsecase,
+       passwordResetUC passwordResetUsecase.PasswordResetUsecase,
        permissionRepo permissionRepos.PermissionRepository,
+       notificationHub *notificationWS.NotificationHub,
 ) *SystemAdminHandler {
        return &SystemAdminHandler{
-               sysAdminUC:     sysAdminUC,
-               tenantUC:       tenantUC,
-               couponUC:       couponUC,
-               subUC:          subUC,
-               planUC:         planUC,
-               permissionRepo: permissionRepo,
+               sysAdminUC:      sysAdminUC,
+               tenantUC:        tenantUC,
+               couponUC:        couponUC,
+               subUC:           subUC,
+               planUC:          planUC,
+               passwordResetUC: passwordResetUC,
+               permissionRepo:  permissionRepo,
+               notificationHub: notificationHub,
+               upgrader: websocket.Upgrader{
+                       CheckOrigin: func(r *http.Request) bool {
+                               return true
+                       },
+               },
        }
 }
 
@@ -603,6 +619,110 @@ func (h *SystemAdminHandler) RecoverTenantDeletion(c *gin.Context) {
        response.SuccessResponse(c, tenant, nil)
 }
 
+// SubscribeNotificationWS registers a system-admin websocket client for realtime notification events.
+func (h *SystemAdminHandler) SubscribeNotificationWS(c *gin.Context) {
+       userIDRaw, ok := c.Get("user_id")
+       if !ok {
+               errors.UnauthorizedResponse(c, "token missing")
+               return
+       }
+
+       userID, ok := userIDRaw.(string)
+       if !ok || strings.TrimSpace(userID) == "" {
+               errors.UnauthorizedResponse(c, "invalid user id")
+               return
+       }
+
+       conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
+       if err != nil {
+               errors.InternalServerErrorResponse(c, "failed to upgrade websocket")
+               return
+       }
+
+       clientID := h.notificationHub.Register(conn, "", userID)
+       defer h.notificationHub.Unregister(clientID)
+
+       for {
+               if _, _, err := conn.ReadMessage(); err != nil {
+                       break
+               }
+       }
+}
+
+// ListTenantOwnerPasswordResetRequests returns paginated pending password reset requests submitted by tenant owners.
+func (h *SystemAdminHandler) ListTenantOwnerPasswordResetRequests(c *gin.Context) {
+       page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
+       perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
+       search := strings.TrimSpace(c.Query("search"))
+
+       if page < 1 {
+               page = 1
+       }
+       if perPage < 1 {
+               perPage = 20
+       }
+       if perPage > 100 {
+               perPage = 100
+       }
+
+       items, total, err := h.passwordResetUC.ListTenantOwnerRequests(c.Request.Context(), page, perPage, search)
+       if err != nil {
+               errors.InternalServerErrorResponse(c, err.Error())
+               return
+       }
+
+       meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
+       meta.Filters = map[string]interface{}{"search": search}
+       response.SuccessResponse(c, items, meta)
+}
+
+// GetTenantOwnerPasswordResetPendingCount returns pending queue count for system-admin menu badges.
+func (h *SystemAdminHandler) GetTenantOwnerPasswordResetPendingCount(c *gin.Context) {
+       res, err := h.passwordResetUC.GetTenantOwnerPendingCount(c.Request.Context())
+       if err != nil {
+               errors.InternalServerErrorResponse(c, err.Error())
+               return
+       }
+
+       response.SuccessResponse(c, res, nil)
+}
+
+// SystemAdminResetTenantOwnerPassword resets tenant-owner password using reset token + new password.
+func (h *SystemAdminHandler) SystemAdminResetTenantOwnerPassword(c *gin.Context) {
+       var req passwordResetDto.ResetPasswordRequest
+       if err := c.ShouldBindJSON(&req); err != nil {
+               if validationErrors, ok := err.(validator.ValidationErrors); ok {
+                       errors.HandleValidationError(c, validationErrors)
+                       return
+               }
+               errors.InvalidRequestBodyResponse(c)
+               return
+       }
+
+       result, err := h.passwordResetUC.ResetPassword(c.Request.Context(), &req)
+       if err != nil {
+               switch err {
+               case passwordResetUsecase.ErrInvalidResetToken:
+                       errors.ErrorResponse(c, "INVALID_RESET_TOKEN", map[string]interface{}{"reason": err.Error()}, nil)
+                       return
+               case passwordResetUsecase.ErrResetTokenExpired:
+                       errors.ErrorResponse(c, "RESET_TOKEN_EXPIRED", map[string]interface{}{"reason": err.Error()}, nil)
+                       return
+               case passwordResetUsecase.ErrResetTokenAlreadyUsed:
+                       errors.ErrorResponse(c, "RESET_TOKEN_ALREADY_USED", map[string]interface{}{"reason": err.Error()}, nil)
+                       return
+               case passwordResetUsecase.ErrUserNotFound:
+                       errors.ErrorResponse(c, "USER_NOT_FOUND", nil, nil)
+                       return
+               default:
+                       errors.InternalServerErrorResponse(c, err.Error())
+                       return
+               }
+       }
+
+       response.SuccessResponse(c, result, nil)
+}
+
 // Dashboard returns system admin dashboard summary
 func (h *SystemAdminHandler) Dashboard(c *gin.Context) {
        tenants, err := h.tenantUC.ListTenants(c.Request.Context())
diff --git a/apps/api/internal/tenant/presentation/router/system_admin_router.go b/apps/api/internal/tenant/presentation/router/system_admin_router.go
index 9ce1acf5..b7a95a8b 100644
--- a/apps/api/internal/tenant/presentation/router/system_admin_router.go
+++ b/apps/api/internal/tenant/presentation/router/system_admin_router.go
@@ -20,6 +20,7 @@ func RegisterSystemAdminRoutes(r *gin.Engine, h *handler.SystemAdminHandler, jwt
                protected := internal.Group("")
                protected.Use(middleware.SystemAdminAuthMiddleware(jwtManager, sysAdminRepo))
                {
+                       protected.GET("/ws/notifications", h.SubscribeNotificationWS)
                        protected.GET("/me", h.Me)
                        protected.PATCH("/me", h.UpdateProfile)
                        protected.PATCH("/me/password", h.ChangePassword)
@@ -32,6 +33,10 @@ func RegisterSystemAdminRoutes(r *gin.Engine, h *handler.SystemAdminHandler, jwt
                        protected.POST("/tenants/:id/recover-deletion", h.RecoverTenantDeletion)
                        protected.GET("/tenants/:id/subscription", h.GetTenantSubscription)
 
+                       tenantMgt := protected.Group("/system/tenants")
+                       tenantMgt.GET("/owner-password-reset-requests", h.ListTenantOwnerPasswordResetRequests)
+                       tenantMgt.GET("/owner-password-reset-requests/pending-count", h.GetTenantOwnerPasswordResetPendingCount)
+                       tenantMgt.POST("/owner-password-reset-requests/reset", h.SystemAdminResetTenantOwnerPassword)
                        // Coupon management
                        protected.POST("/coupons", h.CreateCoupon)
                        protected.GET("/coupons", h.ListCoupons)
diff --git a/apps/web/src/features/system-admin/components/system-admin-layout.tsx b/apps/web/src/features/system-admin/components/system-admin-layout.tsx
index 1b1bf011..614ccb74 100644
--- a/apps/web/src/features/system-admin/components/system-admin-layout.tsx
+++ b/apps/web/src/features/system-admin/components/system-admin-layout.tsx
@@ -12,12 +12,18 @@ import {
   Package,
   UserCircle,
   KeyRound,
+  ShieldAlert,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
+import { Badge } from "@/components/ui/badge";
 import { useSystemAdminStore } from "../stores/use-system-admin-store";
 import { systemAdminService } from "../services/system-admin-service";
 import { clearCSRFTokenMemory } from "@/lib/api-client";
+import {
+  useSystemAdminTenantOwnerResetRealtime,
+  useTenantOwnerPasswordResetPendingCount,
+} from "../hooks/use-tenants";
 
 interface SystemAdminLayoutProps {
   readonly children: ReactNode;
@@ -34,6 +40,11 @@ const sidebarLinks = [
     href: "/system/tenants",
     icon: Building2,
   },
+  {
+    label: "Reset Password Tenant",
+    href: "/system/tenants/owner-password-reset-requests",
+    icon: ShieldAlert,
+  },
   {
     label: "Coupons",
     href: "/system/coupons",
@@ -65,6 +76,9 @@ export function SystemAdminLayout({ children }: SystemAdminLayoutProps) {
   const pathname = usePathname();
   const router = useRouter();
   const { admin, logout: storeLogout } = useSystemAdminStore();
+  const { data: pendingResetCount = 0 } = useTenantOwnerPasswordResetPendingCount();
+
+  useSystemAdminTenantOwnerResetRealtime();
 
   const handleLogout = async () => {
     try {
@@ -111,7 +125,12 @@ export function SystemAdminLayout({ children }: SystemAdminLayoutProps) {
                 )}
               >
                 <link.icon className="h-4 w-4" />
-                {link.label}
+                <span className="flex-1">{link.label}</span>
+                {link.href === "/system/tenants/owner-password-reset-requests" && pendingResetCount > 0 && (
+                  <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
+                    {pendingResetCount > 99 ? "99+" : pendingResetCount}
+                  </Badge>
+                )}
               </Link>
             );
           })}
diff --git a/apps/web/src/features/system-admin/hooks/use-tenants.ts b/apps/web/src/features/system-admin/hooks/use-tenants.ts
index aeaf6701..db28b627 100644
--- a/apps/web/src/features/system-admin/hooks/use-tenants.ts
+++ b/apps/web/src/features/system-admin/hooks/use-tenants.ts
@@ -1,7 +1,36 @@
+import { useEffect } from "react";
 import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 import { toast } from "sonner";
 import { systemAdminService } from "../services/system-admin-service";
-import type { TenantListParams } from "../types";
+import { useSystemAdminStore } from "../stores/use-system-admin-store";
+import type {
+  TenantListParams,
+  TenantOwnerPasswordResetQueueParams,
+  SystemAdminResetTenantOwnerPasswordRequest,
+} from "../types";
+
+const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087";
+
+function toWebsocketBaseUrl(baseUrl: string): string {
+  const normalized = baseUrl.trim();
+  if (normalized.startsWith("https://")) {
+    return `wss://${normalized.slice(8)}`;
+  }
+  if (normalized.startsWith("http://")) {
+    return `ws://${normalized.slice(7)}`;
+  }
+  if (normalized.startsWith("wss://") || normalized.startsWith("ws://")) {
+    return normalized;
+  }
+  return `ws://${normalized}`;
+}
+
+export const systemAdminTenantResetQueryKeys = {
+  all: ["system-admin", "tenant-owner-password-reset"] as const,
+  list: (params?: TenantOwnerPasswordResetQueueParams) =>
+    ["system-admin", "tenant-owner-password-reset", "list", params] as const,
+  pendingCount: ["system-admin", "tenant-owner-password-reset", "pending-count"] as const,
+};
 
 export function useTenants(params?: TenantListParams) {
   return useQuery({
@@ -48,3 +77,94 @@ export function useRecoverTenantDeletion() {
     },
   });
 }
+
+export function useTenantOwnerPasswordResetQueue(params?: TenantOwnerPasswordResetQueueParams) {
+  return useQuery({
+    queryKey: systemAdminTenantResetQueryKeys.list(params),
+    queryFn: async () => {
+      const res = await systemAdminService.getTenantOwnerPasswordResetQueue(params);
+      return res;
+    },
+  });
+}
+
+export function useTenantOwnerPasswordResetPendingCount() {
+  return useQuery({
+    queryKey: systemAdminTenantResetQueryKeys.pendingCount,
+    queryFn: async () => {
+      const res = await systemAdminService.getTenantOwnerPasswordResetPendingCount();
+      return res.data.pending_count;
+    },
+    staleTime: 30_000,
+  });
+}
+
+export function useSystemAdminResetTenantOwnerPassword() {
+  const queryClient = useQueryClient();
+
+  return useMutation({
+    mutationFn: (payload: SystemAdminResetTenantOwnerPasswordRequest) =>
+      systemAdminService.resetTenantOwnerPassword(payload),
+    onSuccess: async () => {
+      toast.success("Password reset berhasil diproses.");
+      await queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
+    },
+    onError: () => {
+      toast.error("Gagal memproses reset password.");
+    },
+  });
+}
+
+export function useSystemAdminTenantOwnerResetRealtime() {
+  const queryClient = useQueryClient();
+  const { isAuthenticated } = useSystemAdminStore();
+
+  useEffect(() => {
+    if (!isAuthenticated) {
+      return;
+    }
+
+    const wsBase = toWebsocketBaseUrl(API_BASE_URL);
+    const wsUrl = `${wsBase}/internal/ws/notifications`;
+    const ws = new WebSocket(wsUrl);
+
+    ws.onmessage = (event) => {
+      try {
+        const payload = JSON.parse(event.data) as {
+          type?: string;
+          event?: string;
+          data?: {
+            entity_type?: string;
+          };
+        };
+        const eventType = payload.type ?? payload.event;
+        const entityType = payload.data?.entity_type;
+
+        if (entityType !== "password_reset_request") {
+          return;
+        }
+
+        if (eventType === "notification.created") {
+          queryClient.setQueryData<number>(
+            systemAdminTenantResetQueryKeys.pendingCount,
+            (current) => (current ?? 0) + 1,
+          );
+          queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
+          return;
+        }
+
+        if (eventType === "notification.updated" || eventType === "notification.deleted") {
+          queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
+        }
+      } catch {
+        // Ignore malformed event payloads from unrelated channels.
+      }
+    };
+
+    return () => {
+      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
+        ws.close(1000, "component_unmount");
+      }
+    };
+  }, [isAuthenticated, queryClient]);
+}
diff --git a/apps/web/src/features/system-admin/i18n/en.ts b/apps/web/src/features/system-admin/i18n/en.ts
index bd8319af..2cd01c25 100644
--- a/apps/web/src/features/system-admin/i18n/en.ts
+++ b/apps/web/src/features/system-admin/i18n/en.ts
@@ -129,5 +129,33 @@ export const systemAdminEn = {
         bundle: "Bundle",
       },
     },
+    tenantOwnerReset: {
+      title: "Tenant Owner Password Reset",
+      description: "Click a tenant request, then set the new password directly.",
+      newPasswordPlaceholder: "New password",
+      confirmPasswordPlaceholder: "Confirm new password",
+      submit: "Reset Password",
+      processing: "Processing...",
+      queueTitle: "Pending Requests",
+      queueDescription: "Requests created by tenant owners are listed here.",
+      searchPlaceholder: "Search by tenant, owner, or email...",
+      tenant: "Tenant",
+      owner: "Owner",
+      email: "Email",
+      requestedAt: "Requested At",
+      expiresAt: "Expires At",
+      status: "Status",
+      actions: "Actions",
+      openResetDialog: "Change Password",
+      dialogTitle: "Reset Tenant Owner Password",
+      dialogDescription: "Set a new password for {owner} in {tenant}.",
+      dialogDescriptionFallback: "Set a new password for the selected tenant owner.",
+      newPasswordLabel: "New Password",
+      confirmPasswordLabel: "Confirm Password",
+      passwordMismatch: "Password confirmation does not match.",
+      cancel: "Cancel",
+      empty: "No pending tenant-owner reset requests.",
+      failedToLoad: "Failed to load tenant-owner reset requests.",
+    },
   },
 };
diff --git a/apps/web/src/features/system-admin/i18n/id.ts b/apps/web/src/features/system-admin/i18n/id.ts
index a56c83e0..8d51f7e7 100644
--- a/apps/web/src/features/system-admin/i18n/id.ts
+++ b/apps/web/src/features/system-admin/i18n/id.ts
@@ -129,5 +129,33 @@ export const systemAdminId = {
         bundle: "Bundle",
       },
     },
+    tenantOwnerReset: {
+      title: "Reset Password Owner Tenant",
+      description: "Klik request tenant, lalu tetapkan password baru secara langsung.",
+      newPasswordPlaceholder: "Password baru",
+      confirmPasswordPlaceholder: "Konfirmasi password baru",
+      submit: "Reset Password",
+      processing: "Memproses...",
+      queueTitle: "Daftar Pending",
+      queueDescription: "Permintaan yang dibuat owner tenant akan muncul di sini.",
+      searchPlaceholder: "Cari tenant, owner, atau email...",
+      tenant: "Tenant",
+      owner: "Owner",
+      email: "Email",
+      requestedAt: "Diminta Pada",
+      expiresAt: "Kedaluwarsa Pada",
+      status: "Status",
+      actions: "Aksi",
+      openResetDialog: "Ganti Password",
+      dialogTitle: "Reset Password Owner Tenant",
+      dialogDescription: "Tetapkan password baru untuk {owner} di {tenant}.",
+      dialogDescriptionFallback: "Tetapkan password baru untuk owner tenant terpilih.",
+      newPasswordLabel: "Password Baru",
+      confirmPasswordLabel: "Konfirmasi Password",
+      passwordMismatch: "Konfirmasi password tidak cocok.",
+      cancel: "Batal",
+      empty: "Belum ada permintaan reset owner tenant.",
+      failedToLoad: "Gagal memuat permintaan reset owner tenant.",
+    },
   },
 };
diff --git a/apps/web/src/features/system-admin/services/system-admin-service.ts b/apps/web/src/features/system-admin/services/system-admin-service.ts
index ed7d3c61..af1ae58c 100644
--- a/apps/web/src/features/system-admin/services/system-admin-service.ts
+++ b/apps/web/src/features/system-admin/services/system-admin-service.ts
@@ -35,6 +35,11 @@ import type {
   PermissionListParams,
   CreatePermissionRequest,
   UpdatePermissionRequest,
+  TenantOwnerPasswordResetQueueParams,
+  TenantOwnerPasswordResetQueueResponse,
+  TenantOwnerPasswordResetPendingCountResponse,
+  SystemAdminResetTenantOwnerPasswordRequest,
+  SystemAdminResetTenantOwnerPasswordResponse,
 } from "../types";
 
 const API_BASE_URL =
@@ -358,4 +363,33 @@ export const systemAdminService = {
     const { data } = await sysAdminClient.delete<{ success: boolean }>(`/permissions/${id}`);
     return data;
   },
+
+  // ── Tenant owner password reset queue ────────────────────────────────────
+
+  async getTenantOwnerPasswordResetQueue(
+    params?: TenantOwnerPasswordResetQueueParams,
+  ): Promise<TenantOwnerPasswordResetQueueResponse> {
+    const { data } = await sysAdminClient.get<TenantOwnerPasswordResetQueueResponse>(
+      "/system/tenants/owner-password-reset-requests",
+      { params },
+    );
+    return data;
+  },
+
+  async getTenantOwnerPasswordResetPendingCount(): Promise<TenantOwnerPasswordResetPendingCountResponse> {
+    const { data } = await sysAdminClient.get<TenantOwnerPasswordResetPendingCountResponse>(
+      "/system/tenants/owner-password-reset-requests/pending-count",
+    );
+    return data;
+  },
+
+  async resetTenantOwnerPassword(
+    payload: SystemAdminResetTenantOwnerPasswordRequest,
+  ): Promise<SystemAdminResetTenantOwnerPasswordResponse> {
+    const { data } = await sysAdminClient.post<SystemAdminResetTenantOwnerPasswordResponse>(
+      "/system/tenants/owner-password-reset-requests/reset",
+      payload,
+    );
+    return data;
+  },
 };
diff --git a/apps/web/src/features/system-admin/types/index.d.ts b/apps/web/src/features/system-admin/types/index.d.ts
index 67a7af4e..a068f091 100644
--- a/apps/web/src/features/system-admin/types/index.d.ts
+++ b/apps/web/src/features/system-admin/types/index.d.ts
@@ -444,3 +444,53 @@ export interface CreatePermissionRequest {
 }
 
 export type UpdatePermissionRequest = CreatePermissionRequest;
+
+// ── Tenant Owner Password Reset Queue ──────────────────────────────────────
+
+export interface TenantOwnerPasswordResetQueueItem {
+  request_id: string;
+  user_id: string;
+  user_name: string;
+  user_email: string;
+  tenant_id: string;
+  tenant_name: string;
+  status: string;
+  requested_at: string;
+  expires_at: string;
+  token?: string;
+  reset_token?: string;
+}
+
+export interface TenantOwnerPasswordResetQueueParams {
+  page?: number;
+  per_page?: number;
+  search?: string;
+}
+
+export interface TenantOwnerPasswordResetQueueResponse {
+  success: boolean;
+  data: TenantOwnerPasswordResetQueueItem[];
+  meta?: {
+    pagination?: PaginationMeta;
+  };
+}
+
+export interface TenantOwnerPasswordResetPendingCountResponse {
+  success: boolean;
+  data: {
+    pending_count: number;
+  };
+}
+
+export interface SystemAdminResetTenantOwnerPasswordRequest {
+  token: string;
+  new_password: string;
+  confirm_password: string;
+}
+
+export interface SystemAdminResetTenantOwnerPasswordResponse {
+  success: boolean;
+  data: {
+    message: string;
+  };
+}
(END)
