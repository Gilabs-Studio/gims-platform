package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/data/models"
	"gorm.io/gorm"
)

type AuditService interface {
	Log(ctx context.Context, action string, targetID string, metadata map[string]interface{})
}

type databaseAuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) AuditService {
	return &databaseAuditService{
		db: db,
	}
}

func (s *databaseAuditService) Log(ctx context.Context, action string, targetID string, metadata map[string]interface{}) {
	// Extract actor from context (assumes AuthMiddleware sets "user_id" and "user_email")
	actorID := ""
	if v := ctx.Value("user_id"); v != nil {
		actorID = fmt.Sprintf("%v", v)
	}

	ip := ""
	userAgent := ""
	// Gin Context might not be available here directly if using pure context. 
	// But usually we pass context from Gin handler.
	// NOTE: Gin context methods regarding request headers aren't available on standard context.Background().
	// We might need to pass IP/UA explicitly or rely on middleware putting them in context values.
	// Assuming middleware puts "client_ip" and "user_agent" in context.
	if v := ctx.Value("client_ip"); v != nil {
		ip = fmt.Sprintf("%v", v)
	}
	if v := ctx.Value("user_agent"); v != nil {
		userAgent = fmt.Sprintf("%v", v)
	}

	// Permission Code is often "resource.action". 
	// We can infer it or pass it. Using action as PermissionCode for now.
	
	if metadata == nil {
		metadata = map[string]interface{}{}
	}

	metaJSON, _ := json.Marshal(metadata)

	log := &models.AuditLog{
		ActorID:        actorID,
		PermissionCode: action, // Using action name as permission code ref
		TargetID:       targetID,
		Action:         action,
		IPAddress:      ip,
		UserAgent:      userAgent,
		Metadata:       string(metaJSON),
		ResultStatus:   "success", // Default to success if logged after action
		CreatedAt:      apptime.Now(),
	}

	// Synchronous write to ensure audit trail consistency.
	// Use a background context to avoid request cancellation dropping audit entries.
	dbCtx := context.Background()
	s.db.WithContext(dbCtx).Create(log)
}
