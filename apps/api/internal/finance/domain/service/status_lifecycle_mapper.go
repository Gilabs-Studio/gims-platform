package service

import (
	"fmt"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

var statusLifecycleMap = map[financeModels.AssetStatus][]financeModels.AssetLifecycleStage{
	financeModels.AssetStatusActive: {
		financeModels.AssetLifecycleInUse,
		financeModels.AssetLifecycleActive,
	},
	financeModels.AssetStatusInUse: {
		financeModels.AssetLifecycleInUse,
	},
	financeModels.AssetStatusIdle: {
		financeModels.AssetLifecycleActive,
	},
	financeModels.AssetStatusUnderMaintenance: {
		financeModels.AssetLifecycleUnderMaintenance,
	},
	financeModels.AssetStatusDisposed: {
		financeModels.AssetLifecycleDisposed,
		financeModels.AssetLifecycleWrittenOff,
	},
}

func ResolveLifecycleStage(status financeModels.AssetStatus, preferred *financeModels.AssetLifecycleStage) (financeModels.AssetLifecycleStage, error) {
	allowed, ok := statusLifecycleMap[status]
	if !ok {
		return "", fmt.Errorf("unsupported asset status mapping: %s", status)
	}

	if preferred != nil {
		for _, candidate := range allowed {
			if candidate == *preferred {
				return candidate, nil
			}
		}
		return "", fmt.Errorf("lifecycle stage %s is invalid for status %s", *preferred, status)
	}

	return allowed[0], nil
}

func ApplyStatusLifecycle(asset *financeModels.Asset, status financeModels.AssetStatus, preferred *financeModels.AssetLifecycleStage) error {
	lifecycle, err := ResolveLifecycleStage(status, preferred)
	if err != nil {
		return err
	}

	asset.Status = status
	asset.LifecycleStage = lifecycle
	return nil
}
