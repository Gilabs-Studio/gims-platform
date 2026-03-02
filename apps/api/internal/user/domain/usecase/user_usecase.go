package usecase

import (
	"context"
	"errors"
	"net/url"

	"encoding/json"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/events"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	"github.com/gilabs/gims/api/internal/core/utils"
	roleRepositories "github.com/gilabs/gims/api/internal/role/data/repositories"
	"github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/gilabs/gims/api/internal/user/data/repositories"
	"github.com/gilabs/gims/api/internal/user/domain/dto"
	"github.com/gilabs/gims/api/internal/user/domain/mapper"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrRoleNotFound      = errors.New("role not found")
)

type UserUsecase interface {
	List(ctx context.Context, req *dto.ListUsersRequest) ([]dto.UserResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.UserResponse, error)
	// GetAvailable returns active users not yet linked to an employee.
	GetAvailable(ctx context.Context, search string, excludeEmployeeID string) ([]dto.AvailableUserResponse, error)
	Create(ctx context.Context, req *dto.CreateUserRequest) (*dto.UserResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateUserRequest) (*dto.UserResponse, error)
	UpdateProfile(ctx context.Context, id string, req *dto.UpdateProfileRequest) (*dto.UserResponse, error)
	ChangePassword(ctx context.Context, id string, req *dto.ChangePasswordRequest) error
	UpdateAvatar(ctx context.Context, id string, avatarURL string) error
	Delete(ctx context.Context, id string) error
}

type userUsecase struct {
	userRepo       repositories.UserRepository
	roleRepo       roleRepositories.RoleRepository
	auditService   audit.AuditService
	eventPublisher infraEvents.EventPublisher
	redis          *redis.Client
}

func NewUserUsecase(
	userRepo repositories.UserRepository,
	roleRepo roleRepositories.RoleRepository,
	auditService audit.AuditService,
	eventPublisher infraEvents.EventPublisher,
	redis *redis.Client,
) UserUsecase {
	return &userUsecase{
		userRepo:       userRepo,
		roleRepo:       roleRepo,
		auditService:   auditService,
		eventPublisher: eventPublisher,
		redis:          redis,
	}
}

func (u *userUsecase) List(ctx context.Context, req *dto.ListUsersRequest) ([]dto.UserResponse, *utils.PaginationResult, error) {
	// Generate cache key
	cacheKey := fmt.Sprintf("users:list:page:%d:perPage:%d:search:%s:status:%s:roleID:%s",
		req.Page, req.PerPage, req.Search, req.Status, req.RoleID)

	// Try to get from cache
	val, err := u.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedResult struct {
			Users      []dto.UserResponse      `json:"users"`
			Pagination *utils.PaginationResult `json:"pagination"`
		}
		if err := json.Unmarshal([]byte(val), &cachedResult); err == nil {
			return cachedResult.Users, cachedResult.Pagination, nil
		}
	}

	// Fetch from DB
	users, total, err := u.userRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.UserResponse, len(users))
	for i, usr := range users {
		responses[i] = *mapper.ToUserResponse(&usr)
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	// Cache result (TTL 5 minutes)
	cacheData := struct {
		Users      []dto.UserResponse      `json:"users"`
		Pagination *utils.PaginationResult `json:"pagination"`
	}{
		Users:      responses,
		Pagination: pagination,
	}

	if data, err := json.Marshal(cacheData); err == nil {
		u.redis.Set(ctx, cacheKey, data, 5*time.Minute)
	}

	return responses, pagination, nil
}

func (u *userUsecase) GetByID(ctx context.Context, id string) (*dto.UserResponse, error) {
	cacheKey := fmt.Sprintf("users:id:%s", id)

	// Try to get from cache
	val, err := u.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedUser dto.UserResponse
		if err := json.Unmarshal([]byte(val), &cachedUser); err == nil {
			return &cachedUser, nil
		}
	}

	usr, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	resp := mapper.ToUserResponse(usr)

	// Cache result (TTL 15 minutes)
	if data, err := json.Marshal(resp); err == nil {
		u.redis.Set(ctx, cacheKey, data, 15*time.Minute)
	}

	return resp, nil
}

func (u *userUsecase) GetAvailable(ctx context.Context, search string, excludeEmployeeID string) ([]dto.AvailableUserResponse, error) {
	users, err := u.userRepo.FindAvailable(ctx, search, excludeEmployeeID)
	if err != nil {
		return nil, err
	}

	responses := make([]dto.AvailableUserResponse, len(users))
	for i, usr := range users {
		responses[i] = mapper.ToAvailableUserResponse(&usr)
	}
	return responses, nil
}

func (u *userUsecase) Create(ctx context.Context, req *dto.CreateUserRequest) (*dto.UserResponse, error) {
	// Check if role exists
	_, err := u.roleRepo.FindByID(ctx, req.RoleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	// Check if email already exists
	_, err = u.userRepo.FindByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrUserAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Set default status
	status := req.Status
	if status == "" {
		status = "active"
	}

	// Generate avatar URL using dicebear lorelei
	avatarURL := "https://api.dicebear.com/7.x/lorelei/svg?seed=" + url.QueryEscape(req.Email)

	// Create user
	usr := &models.User{
		Email:     req.Email,
		Password:  string(hashedPassword),
		Name:      req.Name,
		AvatarURL: avatarURL,
		RoleID:    req.RoleID,
		Status:    status,
	}

	if err := u.userRepo.Create(ctx, usr); err != nil {
		return nil, err
	}

	// Invalidate list cache
	pattern := "users:list:*"
	iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}

	// Audit Log
	u.auditService.Log(ctx, "user.create", usr.ID, map[string]interface{}{
		"email": req.Email,
		"name":  req.Name,
		"role":  req.RoleID,
	})

	// Reload with role
	createdUser, err := u.userRepo.FindByID(ctx, usr.ID)
	if err != nil {
		return nil, err
	}

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewUserCreatedEvent(ctx, events.UserCreatedPayload{
		UserID:    usr.ID,
		Email:     usr.Email,
		Name:      usr.Name,
		RoleID:    usr.RoleID,
		Status:    usr.Status,
		CreatedAt: usr.CreatedAt,
	}))

	return mapper.ToUserResponse(createdUser), nil
}

func (u *userUsecase) Update(ctx context.Context, id string, req *dto.UpdateUserRequest) (*dto.UserResponse, error) {
	// Find user
	usr, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Update fields
	if req.Email != "" {
		// Check if email already exists (excluding current user)
		existingUser, err := u.userRepo.FindByEmail(ctx, req.Email)
		if err == nil && existingUser.ID != id {
			return nil, ErrUserAlreadyExists
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		usr.Email = req.Email
	}

	if req.Name != "" {
		usr.Name = req.Name
	}

	if req.RoleID != "" {
		// Check if role exists
		_, err := u.roleRepo.FindByID(ctx, req.RoleID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrRoleNotFound
			}
			return nil, err
		}
		usr.RoleID = req.RoleID
	}

	if req.Status != "" {
		usr.Status = req.Status
	}

	if err := u.userRepo.Update(ctx, usr); err != nil {
		return nil, err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf("users:id:%s", id))

	// Invalidate list cache
	pattern := "users:list:*"
	iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}

	// Audit Log
	u.auditService.Log(ctx, "user.update", id, map[string]interface{}{
		"updates": req,
	})

	// Reload with role
	updatedUser, err := u.userRepo.FindByID(ctx, usr.ID)
	if err != nil {
		return nil, err
	}

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewUserUpdatedEvent(ctx, events.UserUpdatedPayload{
		UserID:    usr.ID,
		Email:     usr.Email,
		Name:      usr.Name,
		RoleID:    usr.RoleID,
		Status:    usr.Status,
		UpdatedAt: usr.UpdatedAt,
	}))

	return mapper.ToUserResponse(updatedUser), nil
}

func (u *userUsecase) Delete(ctx context.Context, id string) error {
	// Check if user exists
	_, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if err := u.userRepo.Delete(ctx, id); err != nil {
		return err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf("users:id:%s", id))

	// Invalidate list cache
	pattern := "users:list:*"
	iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}

	// Audit Log
	u.auditService.Log(ctx, "user.delete", id, nil)

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewUserDeletedEvent(ctx, events.UserDeletedPayload{
		UserID:    id,
		DeletedAt: apptime.Now(),
	}))

	return nil
}

func (u *userUsecase) UpdateProfile(ctx context.Context, id string, req *dto.UpdateProfileRequest) (*dto.UserResponse, error) {
	// Find user
	usr, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Update fields
	if req.Email != "" {
		// Check if email already exists (excluding current user)
		existingUser, err := u.userRepo.FindByEmail(ctx, req.Email)
		if err == nil && existingUser.ID != id {
			return nil, ErrUserAlreadyExists
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		// If email changed, regenerate avatar
		if usr.Email != req.Email {
			usr.Email = req.Email
			// Regenerate avatar URL using dicebear lorelei
			usr.AvatarURL = "https://api.dicebear.com/7.x/lorelei/svg?seed=" + url.QueryEscape(req.Email)
		}
	}

	if req.Name != "" {
		usr.Name = req.Name
	}

	if err := u.userRepo.Update(ctx, usr); err != nil {
		return nil, err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf("users:id:%s", id))

	// Invalidate list cache
	pattern := "users:list:*"
	iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}

	// Audit Log
	u.auditService.Log(ctx, "user.profile_update", id, map[string]interface{}{
		"updates": req,
	})

	// Reload with role
	updatedUser, err := u.userRepo.FindByID(ctx, usr.ID)
	if err != nil {
		return nil, err
	}

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewUserUpdatedEvent(ctx, events.UserUpdatedPayload{
		UserID:    usr.ID,
		Email:     usr.Email,
		Name:      usr.Name,
		RoleID:    usr.RoleID,
		Status:    usr.Status,
		UpdatedAt: usr.UpdatedAt,
	}))

	return mapper.ToUserResponse(updatedUser), nil
}

func (u *userUsecase) ChangePassword(ctx context.Context, id string, req *dto.ChangePasswordRequest) error {
	// Find user
	usr, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(usr.Password), []byte(req.OldPassword)); err != nil {
		return errors.New("invalid old password")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	usr.Password = string(hashedPassword)
	if err := u.userRepo.Update(ctx, usr); err != nil {
		return err
	}

	// Audit Log
	u.auditService.Log(ctx, "user.change_password", id, nil)

	return nil
}

func (u *userUsecase) UpdateAvatar(ctx context.Context, id string, avatarURL string) error {
	// Find user
	usr, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Update avatar URL
	usr.AvatarURL = avatarURL
	if err := u.userRepo.Update(ctx, usr); err != nil {
		return err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf("users:id:%s", id))

	// Invalidate list cache
	pattern := "users:list:*"
	iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}

	// Audit Log
	u.auditService.Log(ctx, "user.update_avatar", id, map[string]interface{}{
		"avatar_url": avatarURL,
	})

	return nil
}

