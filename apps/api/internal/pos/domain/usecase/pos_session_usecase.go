package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/apptime"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
	"gorm.io/gorm"
)

// POSSessionUsecase defines business logic for POS shift sessions.
// Error sentinels (ErrPOSSessionNotFound, ErrPOSSessionAlreadyOpen) are
// declared in pos_order_usecase.go to keep all POS errors in one place.
type POSSessionUsecase interface {
Open(ctx context.Context, req *dto.OpenSessionRequest, userID string) (*dto.POSSessionResponse, error)
Close(ctx context.Context, id string, req *dto.CloseSessionRequest, cashierID string) (*dto.POSSessionResponse, error)
GetByID(ctx context.Context, id string) (*dto.POSSessionResponse, error)
GetActiveSession(ctx context.Context, userID string) (*dto.POSSessionResponse, error)
List(ctx context.Context, params repositories.POSSessionListParams) ([]dto.POSSessionResponse, int64, error)
}

type posSessionUsecase struct {
sessionRepo repositories.PosSessionRepository
outletRepo  orgRepos.OutletRepository
}

// NewPOSSessionUsecase constructs a POSSessionUsecase.
func NewPOSSessionUsecase(sessionRepo repositories.PosSessionRepository, outletRepo orgRepos.OutletRepository) POSSessionUsecase {
return &posSessionUsecase{
sessionRepo: sessionRepo,
outletRepo:  outletRepo,
}
}

// Open creates a new cashier session for the given outlet.
// Rejects if an active session already exists for the outlet.
func (u *posSessionUsecase) Open(ctx context.Context, req *dto.OpenSessionRequest, userID string) (*dto.POSSessionResponse, error) {
// Verify outlet exists
if _, err := u.outletRepo.GetByID(ctx, req.OutletID); err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("outlet not found")
}
return nil, err
}

// Prevent double-opening a session for the same outlet
existing, err := u.sessionRepo.FindActiveByOutlet(ctx, req.OutletID)
if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
return nil, err
}
if existing != nil {
return nil, ErrPOSSessionAlreadyOpen
}

code, err := u.sessionRepo.GetNextSessionCode(ctx)
if err != nil {
return nil, err
}

now := apptime.Now()
session := &models.PosSession{
Code:        code,
OutletID:    req.OutletID,
WarehouseID: req.WarehouseID,
CashierID:   userID,
OpeningCash: req.OpeningCash,
Status:      models.PosSessionStatusOpen,
OpenedAt:    now,
Notes:       req.Notes,
CreatedBy:   userID,
}
if err := u.sessionRepo.Create(ctx, session); err != nil {
return nil, err
}
return mapper.ToPOSSessionResponse(session), nil
}

// Close finalises a session and records the closing cash amount.
func (u *posSessionUsecase) Close(ctx context.Context, id string, req *dto.CloseSessionRequest, cashierID string) (*dto.POSSessionResponse, error) {
session, err := u.sessionRepo.GetByID(ctx, id)
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, ErrPOSSessionNotFound
}
return nil, err
}
if session.Status == models.PosSessionStatusClosed {
return nil, errors.New("session is already closed")
}

now := apptime.Now()
session.Status = models.PosSessionStatusClosed
session.ClosingCash = &req.ClosingCash
session.ClosedAt = &now
session.Notes = req.Notes

if err := u.sessionRepo.Update(ctx, session); err != nil {
return nil, err
}
return mapper.ToPOSSessionResponse(session), nil
}

// GetByID returns a session by its UUID.
func (u *posSessionUsecase) GetByID(ctx context.Context, id string) (*dto.POSSessionResponse, error) {
session, err := u.sessionRepo.GetByID(ctx, id)
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, ErrPOSSessionNotFound
}
return nil, err
}
return mapper.ToPOSSessionResponse(session), nil
}

// GetActiveSession returns the currently open session for the given cashier user.
func (u *posSessionUsecase) GetActiveSession(ctx context.Context, userID string) (*dto.POSSessionResponse, error) {
session, err := u.sessionRepo.FindActiveByCashier(ctx, userID)
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, ErrPOSSessionNotFound
}
return nil, err
}
return mapper.ToPOSSessionResponse(session), nil
}

// List returns paginated sessions filtered by the provided parameters.
func (u *posSessionUsecase) List(ctx context.Context, params repositories.POSSessionListParams) ([]dto.POSSessionResponse, int64, error) {
sessions, total, err := u.sessionRepo.ListByParams(ctx, params)
if err != nil {
return nil, 0, err
}
resps := make([]dto.POSSessionResponse, 0, len(sessions))
for i := range sessions {
resps = append(resps, *mapper.ToPOSSessionResponse(&sessions[i]))
}
return resps, total, nil
}
