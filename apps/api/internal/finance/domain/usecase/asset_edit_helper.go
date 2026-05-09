package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"gorm.io/gorm"
)

// FieldGroup represents the classification of an editable field
type FieldGroup string

const (
	GroupA FieldGroup = "A" // Non-accounting (free to change)
	GroupB FieldGroup = "B" // Accounting-sensitive (need recalc & confirmation)
	GroupC FieldGroup = "C" // Immutable after active status
)

// FieldClassification tracks which group a field belongs to
var fieldToGroup = map[string]FieldGroup{
	// Group A: Non-accounting fields
	"name":                    GroupA,
	"description":             GroupA,
	"asset_tag":               GroupA,
	"location_id":             GroupA,
	"department_id":           GroupA,
	"custodian_user_id":       GroupA,
	"serial_number":           GroupA,
	"barcode":                 GroupA,
	"vendor_id":               GroupA,
	"purchase_invoice_id":     GroupA,
	"warranty_start":          GroupA,
	"warranty_end":            GroupA,
	"warranty_provider":       GroupA,
	"warranty_terms":          GroupA,
	"insurance_policy_number": GroupA,
	"insurance_provider":      GroupA,
	"insurance_start":         GroupA,
	"insurance_end":           GroupA,
	"insurance_value":         GroupA,
	"shipping_cost":           GroupA,
	"installation_cost":       GroupA,
	"tax_amount":              GroupA,
	"other_costs":             GroupA,

	// Group B: Accounting-sensitive
	"salvage_value":        GroupB,
	"useful_life_months":   GroupB,
	"depreciation_method":  GroupB,
	"category_id":          GroupB,

	// Group C: Immutable after active
	"code":              GroupC,
	"acquisition_date":  GroupC,
	"acquisition_cost":  GroupC,
	"asset_type_id":     GroupC,
}

// FieldChanges holds the changes classified by group
type FieldChanges struct {
	GroupA map[string]interface{}
	GroupB map[string]interface{}
	GroupC map[string]interface{}
}

// NewFieldChanges creates an empty field changes map
func NewFieldChanges() *FieldChanges {
	return &FieldChanges{
		GroupA: make(map[string]interface{}),
		GroupB: make(map[string]interface{}),
		GroupC: make(map[string]interface{}),
	}
}

// ClassifyChanges compares old and new asset values and classifies them
func ClassifyChanges(existing *financeModels.Asset, req *dto.EditAssetRequest) (*FieldChanges, error) {
	changes := NewFieldChanges()

	// Helper function to check if field changed
	checkAndClassify := func(fieldName string, oldVal interface{}, newVal interface{}) {
		// Compare values
		changed := false
		if oldVal != newVal {
			// Additional null check
			oldIsNil := oldVal == nil || (fmt.Sprintf("%v", oldVal) == "")
			newIsNil := newVal == nil || (fmt.Sprintf("%v", newVal) == "")
			if oldIsNil != newIsNil {
				changed = true
			} else if !oldIsNil && !newIsNil {
				changed = fmt.Sprintf("%v", oldVal) != fmt.Sprintf("%v", newVal)
			}
		}

		if !changed {
			return
		}

		group := fieldToGroup[fieldName]
		switch group {
		case GroupA:
			changes.GroupA[fieldName] = map[string]interface{}{
				"old": oldVal,
				"new": newVal,
			}
		case GroupB:
			changes.GroupB[fieldName] = map[string]interface{}{
				"old": oldVal,
				"new": newVal,
			}
		case GroupC:
			changes.GroupC[fieldName] = map[string]interface{}{
				"old": oldVal,
				"new": newVal,
			}
		}
	}

	// Check all fields
	checkAndClassify("code", existing.Code, req.Code)
	checkAndClassify("name", existing.Name, req.Name)
	checkAndClassify("description", existing.Description, req.Description)
	checkAndClassify("asset_type_id", existing.AssetTypeID, &req.AssetTypeID)
	checkAndClassify("category_id", existing.CategoryID, req.CategoryID)
	checkAndClassify("location_id", existing.LocationID, req.LocationID)
	checkAndClassify("acquisition_date", existing.AcquisitionDate.Format("2006-01-02"), req.AcquisitionDate)
	checkAndClassify("acquisition_cost", existing.AcquisitionCost, req.AcquisitionCost)
	checkAndClassify("salvage_value", existing.SalvageValue, req.SalvageValue)
	checkAndClassify("useful_life_months", existing.UsefulLifeMonths, req.UsefulLifeMonths)
	checkAndClassify("depreciation_method", existing.DepreciationMethod, req.DepreciationMethod)
	checkAndClassify("vendor_id", existing.SupplierID, req.VendorID)
	checkAndClassify("purchase_invoice_id", existing.SupplierInvoiceID, req.PurchaseInvoiceID)
	checkAndClassify("department_id", existing.DepartmentID, req.DepartmentID)
	checkAndClassify("custodian_user_id", existing.CustodianUserID, req.CustodianUserID)
	checkAndClassify("serial_number", existing.SerialNumber, req.SerialNumber)
	checkAndClassify("barcode", existing.Barcode, req.Barcode)
	checkAndClassify("asset_tag", existing.AssetTag, req.AssetTag)
	checkAndClassify("shipping_cost", existing.ShippingCost, req.ShippingCost)
	checkAndClassify("installation_cost", existing.InstallationCost, req.InstallationCost)
	checkAndClassify("tax_amount", existing.TaxAmount, req.TaxAmount)
	checkAndClassify("other_costs", existing.OtherCosts, req.OtherCosts)
	checkAndClassify("warranty_start", existing.WarrantyStart, parseStringToTime(req.WarrantyStart))
	checkAndClassify("warranty_end", existing.WarrantyEnd, parseStringToTime(req.WarrantyEnd))
	checkAndClassify("warranty_provider", existing.WarrantyProvider, req.WarrantyProvider)
	checkAndClassify("warranty_terms", existing.WarrantyTerms, req.WarrantyTerms)
	checkAndClassify("insurance_policy_number", existing.InsurancePolicyNumber, req.InsurancePolicyNumber)
	checkAndClassify("insurance_provider", existing.InsuranceProvider, req.InsuranceProvider)
	checkAndClassify("insurance_start", existing.InsuranceStart, parseStringToTime(req.InsuranceStart))
	checkAndClassify("insurance_end", existing.InsuranceEnd, parseStringToTime(req.InsuranceEnd))
	checkAndClassify("insurance_value", existing.InsuranceValue, req.InsuranceValue)

	return changes, nil
}

// ValidateGroupCChanges ensures Group C fields are not changed if asset is active
func ValidateGroupCChanges(existing *financeModels.Asset, changes *FieldChanges) error {
	if len(changes.GroupC) == 0 {
		return nil
	}

	// Group C is immutable for active/in_use assets
	if existing.Status == financeModels.AssetStatusActive ||
		existing.Status == financeModels.AssetStatusInUse {
		fields := make([]string, 0, len(changes.GroupC))
		for field := range changes.GroupC {
			fields = append(fields, field)
		}
		return fmt.Errorf("immutable fields cannot be changed for active assets: %v", fields)
	}

	return nil
}

// DepreciationRecalcInfo holds the depreciation recalculation details
type DepreciationRecalcInfo struct {
	OldMonthlyAmount    float64
	NewMonthlyAmount    float64
	RemainingMonths     int
	OldTotalRemaining   float64
	NewTotalRemaining   float64
	ImpactAmount        float64
	NewBookValue        float64
	EntriesToRegenerate int
	FirstAffectedPeriod string
	DepreciationMethod  string
}

// CalculateDepreciationImpact calculates the impact of Group B changes
func CalculateDepreciationImpact(
	ctx context.Context,
	existing *financeModels.Asset,
	changes *FieldChanges,
	db *gorm.DB,
) (*DepreciationRecalcInfo, error) {
	if len(changes.GroupB) == 0 {
		return nil, nil
	}

	// Get category to resolve defaults
	var category financeModels.AssetCategory
	if err := db.WithContext(ctx).First(&category, "id = ?", existing.CategoryID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("asset category not found")
		}
		return nil, err
	}

	// Determine new values (use existing if not changed)
	newSalvageValue := existing.SalvageValue
	if val, ok := changes.GroupB["salvage_value"]; ok {
		newSalvageValue = val.(map[string]interface{})["new"].(float64)
	}

	newUsefulLifeMonths := existing.UsefulLifeMonths
	if val, ok := changes.GroupB["useful_life_months"]; ok {
		monthsVal := val.(map[string]interface{})["new"]
		if monthsVal != nil {
			newUsefulLifeMonths = monthsVal.(*int)
		}
	}

	newDepMethod := existing.DepreciationMethod
	if val, ok := changes.GroupB["depreciation_method"]; ok {
		methodVal := val.(map[string]interface{})["new"]
		if methodVal != nil {
			newDepMethod = methodVal.(*string)
		}
	}

	// Calculate old values
	oldUsefulLife := 0
	if existing.UsefulLifeMonths != nil {
		oldUsefulLife = *existing.UsefulLifeMonths
	} else {
		oldUsefulLife = int(category.UsefulLifeMonths)
	}

	oldMethod := financeModels.DepreciationMethodStraightLine
	if existing.DepreciationMethod != nil {
		oldMethod = financeModels.DepreciationMethod(*existing.DepreciationMethod)
	} else {
		oldMethod = category.DepreciationMethod
	}

	// Calculate monthly depreciation for old and new
	oldMonthly := 0.0
	if oldUsefulLife > 0 {
		oldMonthly = round2(math.Max(0, existing.AcquisitionCost-existing.SalvageValue) / float64(oldUsefulLife))
	}

	newMonthly := 0.0
	newUsefulLifeVal := 0
	if newUsefulLifeMonths != nil {
		newUsefulLifeVal = *newUsefulLifeMonths
	} else {
		newUsefulLifeVal = int(category.UsefulLifeMonths)
	}

	if newUsefulLifeVal > 0 {
		newMonthly = round2(math.Max(0, existing.AcquisitionCost-newSalvageValue) / float64(newUsefulLifeVal))
	}

	// Count remaining months (prospective from now)
	now := apptime.Now()
	remainingMonths := calculateRemainingMonths(existing.AcquisitionDate, now, newUsefulLifeVal)

	oldTotalRemaining := round2(oldMonthly * float64(remainingMonths))
	newTotalRemaining := round2(newMonthly * float64(remainingMonths))
	impactAmount := round2(newTotalRemaining - oldTotalRemaining)

	newBookValue := round2(existing.AcquisitionCost - existing.AccumulatedDepreciation - newTotalRemaining)

	// Count how many depreciation entries need to be regenerated
	entriesToRegen := int64(0)
	var firstUnpostedPeriod string
	var firstUnpostedDep financeModels.AssetDepreciation
	if err := db.WithContext(ctx).
		Where("asset_id = ? AND journal_entry_id IS NULL", existing.ID).
		Order("period ASC").
		First(&firstUnpostedDep).Error; err == nil {
		firstUnpostedPeriod = firstUnpostedDep.Period
	}

	// Count total unposted entries
	db.WithContext(ctx).
		Model(&financeModels.AssetDepreciation{}).
		Where("asset_id = ? AND journal_entry_id IS NULL", existing.ID).
		Count(&entriesToRegen)

	if firstUnpostedPeriod == "" {
		now := apptime.Now()
		firstUnpostedPeriod = ymPeriod(now.AddDate(0, 1, 0)) // Next month
	}

	depMethod := string(oldMethod)
	if newDepMethod != nil {
		depMethod = *newDepMethod
	}

	return &DepreciationRecalcInfo{
		OldMonthlyAmount:    oldMonthly,
		NewMonthlyAmount:    newMonthly,
		RemainingMonths:     remainingMonths,
		OldTotalRemaining:   oldTotalRemaining,
		NewTotalRemaining:   newTotalRemaining,
		ImpactAmount:        impactAmount,
		NewBookValue:        newBookValue,
		EntriesToRegenerate: int(entriesToRegen),
		FirstAffectedPeriod: firstUnpostedPeriod,
		DepreciationMethod:  depMethod,
	}, nil
}

// RecalculateDepreciation regenerates depreciation schedule after Group B changes
// Returns the count of new entries created
func RecalculateDepreciation(
	ctx context.Context,
	db *gorm.DB,
	asset *financeModels.Asset,
	newSalvageValue float64,
	newUsefulLifeMonths *int,
	newDepMethod *string,
) (int, error) {
	// 1. Find first unposted entry (if any)
	var firstUnposted financeModels.AssetDepreciation
	hasUnposted := db.WithContext(ctx).
		Where("asset_id = ? AND journal_entry_id IS NULL", asset.ID).
		Order("period ASC").
		First(&firstUnposted).Error == nil

	if !hasUnposted {
		// All entries are posted, cannot recalculate (immutable)
		return 0, errors.New("all depreciation entries are posted, cannot recalculate")
	}

	// 2. Calculate affected period
	fromPeriod := firstUnposted.Period
	acqDate, _ := time.Parse("2006-01-02", asset.AcquisitionDate.Format("2006-01-02"))

	// 3. Soft-delete unposted entries from fromPeriod forward
	if err := db.WithContext(ctx).
		Where("asset_id = ? AND journal_entry_id IS NULL AND period >= ?", asset.ID, fromPeriod).
		Delete(&financeModels.AssetDepreciation{}).Error; err != nil {
		return 0, err
	}

	// 4. Resolve new depreciation method
	var category financeModels.AssetCategory
	if err := db.WithContext(ctx).First(&category, "id = ?", asset.CategoryID).Error; err != nil {
		return 0, err
	}

	newMethod := asset.DepreciationMethod
	if newDepMethod != nil {
		newMethod = newDepMethod
	} else if asset.DepreciationMethod == nil {
		newMethod = (*string)(&[]string{string(category.DepreciationMethod)}[0])
	}

	// 5. Calculate remaining useful life
	usefulLife := 0
	if newUsefulLifeMonths != nil {
		usefulLife = *newUsefulLifeMonths
	} else if asset.UsefulLifeMonths != nil {
		usefulLife = *asset.UsefulLifeMonths
	} else {
		usefulLife = int(category.UsefulLifeMonths)
	}

	// 6. Regenerate schedule from fromPeriod
	monthly := 0.0
	if usefulLife > 0 {
		monthly = round2(math.Max(0, asset.AcquisitionCost-newSalvageValue) / float64(usefulLife))
	}

	// Count how many entries we regenerate
	entriesCreated := 0

	// Parse fromPeriod (YYYY-MM format)
	parts := len(fromPeriod)
	if parts >= 7 {
		accumulated := asset.AccumulatedDepreciation // We keep accumulated from posted entries
		
		// Regenerate entries
		for month := 1; month <= usefulLife; month++ {
			depDate := acqDate.AddDate(0, month, 0)
			period := ymPeriod(depDate)

			// Skip if before fromPeriod
			if period < fromPeriod {
				continue
			}

			accumulated = round2(accumulated + monthly)
			bookValue := round2(asset.AcquisitionCost - accumulated)
			if bookValue < newSalvageValue {
				bookValue = newSalvageValue
			}

			rec := &financeModels.AssetDepreciation{
				AssetID:          asset.ID,
				Period:           period,
				DepreciationDate: depDate,
				Method:           financeModels.DepreciationMethod(*newMethod),
				Amount:           monthly,
				Accumulated:      accumulated,
				BookValue:        bookValue,
			}

			if err := db.WithContext(ctx).Create(rec).Error; err != nil {
				return entriesCreated, err
			}
			entriesCreated++
		}
	}

	return entriesCreated, nil
}

// Helper functions

func parseStringToTime(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil
	}
	return &t
}

func calculateRemainingMonths(acqDate time.Time, now time.Time, usefulLife int) int {
	depStartDate := acqDate
	monthsElapsed := (now.Year()-depStartDate.Year())*12 + int(now.Month()) - int(depStartDate.Month())
	remaining := usefulLife - monthsElapsed
	if remaining < 0 {
		remaining = 0
	}
	return remaining
}
