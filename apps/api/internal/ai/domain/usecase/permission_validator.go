package usecase

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/ai/data/repositories"
)

// PermissionValidationResult holds the result of a permission check
type PermissionValidationResult struct {
	Allowed            bool   `json:"allowed"`
	RequiredPermission string `json:"required_permission"`
	Reason             string `json:"reason,omitempty"`
}

// PermissionValidator checks whether a user has the required permission for an AI intent
type PermissionValidator struct {
	intentRepo repositories.IntentRegistryRepository
}

// NewPermissionValidator creates a new PermissionValidator
func NewPermissionValidator(intentRepo repositories.IntentRegistryRepository) *PermissionValidator {
	return &PermissionValidator{
		intentRepo: intentRepo,
	}
}

// Validate checks if the user has permission to execute the resolved intent
func (v *PermissionValidator) Validate(ctx context.Context, intentCode string, userPermissions map[string]bool, isAdmin bool) (*PermissionValidationResult, error) {
	// General chat does not require specific permissions
	if intentCode == "GENERAL_CHAT" {
		return &PermissionValidationResult{
			Allowed:            true,
			RequiredPermission: "",
			Reason:             "",
		}, nil
	}

	// Admin users bypass permission checks
	if isAdmin {
		return &PermissionValidationResult{
			Allowed:            true,
			RequiredPermission: "",
			Reason:             "admin bypass",
		}, nil
	}

	// Look up the intent in the registry
	intent, err := v.intentRepo.FindByIntentCode(ctx, intentCode)
	if err != nil {
		return nil, fmt.Errorf("AI_PERMISSION_CHECK_FAILED: intent not found in registry: %w", err)
	}

	if !intent.IsActive {
		return &PermissionValidationResult{
			Allowed:            false,
			RequiredPermission: intent.RequiredPermission,
			Reason:             fmt.Sprintf("Intent '%s' is currently disabled", intent.DisplayName),
		}, nil
	}

	requiredPerm := intent.RequiredPermission
	if requiredPerm == "" {
		// No specific permission required for this intent
		return &PermissionValidationResult{
			Allowed:            true,
			RequiredPermission: "",
			Reason:             "",
		}, nil
	}

	// Check if user has the required permission
	if userPermissions[requiredPerm] {
		return &PermissionValidationResult{
			Allowed:            true,
			RequiredPermission: requiredPerm,
			Reason:             "",
		}, nil
	}

	return &PermissionValidationResult{
		Allowed:            false,
		RequiredPermission: requiredPerm,
		Reason:             fmt.Sprintf("You do not have the '%s' permission required for this action", requiredPerm),
	}, nil
}

// NeedsConfirmation checks whether the intent requires user confirmation before execution
func (v *PermissionValidator) NeedsConfirmation(ctx context.Context, intentCode string) (bool, error) {
	if intentCode == "GENERAL_CHAT" {
		return false, nil
	}

	intent, err := v.intentRepo.FindByIntentCode(ctx, intentCode)
	if err != nil {
		// If intent is not found, require confirmation as a safety measure
		return true, nil
	}

	return intent.RequiresConfirmation, nil
}
