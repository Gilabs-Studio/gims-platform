package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/product/data/models"
)

// SeedProduct seeds sample product master data
func SeedProduct() error {
	db := database.DB

	// 1. Seed Product Categories
	var categoryCount int64
	db.Model(&models.ProductCategory{}).Count(&categoryCount)
	if categoryCount == 0 {
		log.Println("Seeding product categories...")
		categories := []models.ProductCategory{
			{Name: "Prescription Drugs", Description: "Medicines requiring prescription", IsActive: true},
			{Name: "Over-the-Counter", Description: "OTC medicines and supplements", IsActive: true},
			{Name: "Medical Devices", Description: "Medical equipment and devices", IsActive: true},
			{Name: "Laboratory Supplies", Description: "Lab equipment and consumables", IsActive: true},
			{Name: "Healthcare Consumables", Description: "Disposable medical supplies", IsActive: true},
			{Name: "Vitamins & Supplements", Description: "Health supplements and vitamins", IsActive: true},
		}
		for i := range categories {
			if err := db.Create(&categories[i]).Error; err != nil {
				log.Printf("Warning: Failed to create category %s: %v", categories[i].Name, err)
			}
		}
	} else {
		log.Println("Product categories already seeded, skipping...")
	}

	// 2. Seed Product Brands
	var brandCount int64
	db.Model(&models.ProductBrand{}).Count(&brandCount)
	if brandCount == 0 {
		log.Println("Seeding product brands...")
		brands := []models.ProductBrand{
			{Name: "Kimia Farma", Description: "Indonesian pharmaceutical company", IsActive: true},
			{Name: "Kalbe Farma", Description: "Leading pharmaceutical manufacturer", IsActive: true},
			{Name: "Sanbe Farma", Description: "Pharmaceutical company", IsActive: true},
			{Name: "Dexa Medica", Description: "Pharmaceutical manufacturer", IsActive: true},
			{Name: "Tempo Scan Pacific", Description: "Consumer healthcare company", IsActive: true},
			{Name: "Biofarma", Description: "State-owned pharmaceutical company", IsActive: true},
		}
		for i := range brands {
			if err := db.Create(&brands[i]).Error; err != nil {
				log.Printf("Warning: Failed to create brand %s: %v", brands[i].Name, err)
			}
		}
	} else {
		log.Println("Product brands already seeded, skipping...")
	}

	// 3. Seed Product Segments
	var segmentCount int64
	db.Model(&models.ProductSegment{}).Count(&segmentCount)
	if segmentCount == 0 {
		log.Println("Seeding product segments...")
		segments := []models.ProductSegment{
			{Name: "Ethical", Description: "Prescription-only medicines", IsActive: true},
			{Name: "OTC", Description: "Over-the-counter products", IsActive: true},
			{Name: "Medical Equipment", Description: "Medical devices and equipment", IsActive: true},
			{Name: "Consumer Health", Description: "Consumer health products", IsActive: true},
		}
		for i := range segments {
			if err := db.Create(&segments[i]).Error; err != nil {
				log.Printf("Warning: Failed to create segment %s: %v", segments[i].Name, err)
			}
		}
	} else {
		log.Println("Product segments already seeded, skipping...")
	}

	// 4. Seed Product Types
	var typeCount int64
	db.Model(&models.ProductType{}).Count(&typeCount)
	if typeCount == 0 {
		log.Println("Seeding product types...")
		types := []models.ProductType{
			{Name: "Medicine", Description: "Pharmaceutical medicines", IsActive: true},
			{Name: "Device", Description: "Medical devices", IsActive: true},
			{Name: "Consumable", Description: "Medical consumables", IsActive: true},
			{Name: "Supplement", Description: "Health supplements", IsActive: true},
		}
		for i := range types {
			if err := db.Create(&types[i]).Error; err != nil {
				log.Printf("Warning: Failed to create type %s: %v", types[i].Name, err)
			}
		}
	} else {
		log.Println("Product types already seeded, skipping...")
	}

	// 5. Seed Units of Measure
	var uomCount int64
	db.Model(&models.UnitOfMeasure{}).Count(&uomCount)
	if uomCount == 0 {
		log.Println("Seeding units of measure...")
		uoms := []models.UnitOfMeasure{
			{Name: "Piece", Symbol: "Pcs", Description: "Individual pieces", IsActive: true},
			{Name: "Box", Symbol: "Box", Description: "Box packaging", IsActive: true},
			{Name: "Bottle", Symbol: "Btl", Description: "Bottle packaging", IsActive: true},
			{Name: "Strip", Symbol: "Str", Description: "Strip packaging for tablets", IsActive: true},
			{Name: "Tube", Symbol: "Tub", Description: "Tube packaging", IsActive: true},
			{Name: "Vial", Symbol: "Vial", Description: "Vial for injectables", IsActive: true},
			{Name: "Ampule", Symbol: "Amp", Description: "Ampule packaging", IsActive: true},
			{Name: "Sachet", Symbol: "Sct", Description: "Sachet packaging", IsActive: true},
		}
		for i := range uoms {
			if err := db.Create(&uoms[i]).Error; err != nil {
				log.Printf("Warning: Failed to create UoM %s: %v", uoms[i].Name, err)
			}
		}
	} else {
		log.Println("Units of measure already seeded, skipping...")
	}

	// 6. Seed Packagings
	var packagingCount int64
	db.Model(&models.Packaging{}).Count(&packagingCount)
	if packagingCount == 0 {
		log.Println("Seeding packagings...")
		packagings := []models.Packaging{
			{Name: "Blister Pack", Description: "Blister packaging for tablets", IsActive: true},
			{Name: "Carton Box", Description: "Cardboard box packaging", IsActive: true},
			{Name: "Plastic Bottle", Description: "Plastic bottle packaging", IsActive: true},
			{Name: "Glass Bottle", Description: "Glass bottle packaging", IsActive: true},
			{Name: "Aluminum Sachet", Description: "Aluminum sachet packaging", IsActive: true},
			{Name: "Tube Packaging", Description: "Tube for creams/gels", IsActive: true},
		}
		for i := range packagings {
			if err := db.Create(&packagings[i]).Error; err != nil {
				log.Printf("Warning: Failed to create packaging %s: %v", packagings[i].Name, err)
			}
		}
	} else {
		log.Println("Packagings already seeded, skipping...")
	}

	// 7. Seed Procurement Types
	var procTypeCount int64
	db.Model(&models.ProcurementType{}).Count(&procTypeCount)
	if procTypeCount == 0 {
		log.Println("Seeding procurement types...")
		procTypes := []models.ProcurementType{
			{Name: "Buy", Description: "Purchase from supplier", IsActive: true},
			{Name: "Manufacture", Description: "In-house production", IsActive: true},
			{Name: "Consignment", Description: "Consignment from principal", IsActive: true},
		}
		for i := range procTypes {
			if err := db.Create(&procTypes[i]).Error; err != nil {
				log.Printf("Warning: Failed to create procurement type %s: %v", procTypes[i].Name, err)
			}
		}
	} else {
		log.Println("Procurement types already seeded, skipping...")
	}

	// 8. Seed Products
	var productCount int64
	db.Model(&models.Product{}).Count(&productCount)
	if productCount == 0 {
		log.Println("Seeding products...")

		// Helper to find reference or return error
		findRef := func(dest interface{}, name string, label string) error {
			if err := db.Where("name = ?", name).First(dest).Error; err != nil {
				return fmt.Errorf("failed to find %s '%s': %w", label, name, err)
			}
			return nil
		}

		// Get references
		var prescriptionCategory models.ProductCategory
		if err := findRef(&prescriptionCategory, "Prescription Drugs", "category"); err != nil {
			return err
		}

		var otcCategory models.ProductCategory
		if err := findRef(&otcCategory, "Over-the-Counter", "category"); err != nil {
			return err
		}

		var medDeviceCategory models.ProductCategory
		if err := findRef(&medDeviceCategory, "Medical Devices", "category"); err != nil {
			return err
		}

		var kalbeBrand models.ProductBrand
		if err := findRef(&kalbeBrand, "Kalbe Farma", "brand"); err != nil {
			return err
		}

		var kimiaFarmaBrand models.ProductBrand
		if err := findRef(&kimiaFarmaBrand, "Kimia Farma", "brand"); err != nil {
			return err
		}

		var ethicalSegment models.ProductSegment
		if err := findRef(&ethicalSegment, "Ethical", "segment"); err != nil {
			return err
		}

		var otcSegment models.ProductSegment
		if err := findRef(&otcSegment, "OTC", "segment"); err != nil {
			return err
		}

		var medicineType models.ProductType
		if err := findRef(&medicineType, "Medicine", "type"); err != nil {
			return err
		}

		var deviceType models.ProductType
		if err := findRef(&deviceType, "Device", "type"); err != nil {
			return err
		}

		var pcsUom models.UnitOfMeasure
		if err := findRef(&pcsUom, "Piece", "uom"); err != nil {
			return err
		}

		var boxUom models.UnitOfMeasure
		if err := findRef(&boxUom, "Box", "uom"); err != nil {
			return err
		}

		var stripUom models.UnitOfMeasure
		if err := findRef(&stripUom, "Strip", "uom"); err != nil {
			return err
		}

		var buyProcurement models.ProcurementType
		if err := findRef(&buyProcurement, "Buy", "procurement type"); err != nil {
			return err
		}

		var blisterPackaging models.Packaging
		if err := findRef(&blisterPackaging, "Blister Pack", "packaging"); err != nil {
			return err
		}

		// Helper to get pointer
		strPtr := func(s string) *string {
			if s == "" {
				return nil
			}
			return &s
		}

		products := []models.Product{
			{
				Code:              "PRE-20240101-001",
				Name:              "Amoxicillin 500mg Capsule",
				Description:       "Antibiotic for bacterial infections",
				CategoryID:        strPtr(prescriptionCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(ethicalSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 10,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         15000,
				SellingPrice:      25000,
				MinStock:          100,
				MaxStock:          500,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      3,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "PRE-20240101-002",
				Name:              "Azithromycin 500mg Tablet",
				Description:       "Macrolide antibiotic",
				CategoryID:        strPtr(prescriptionCategory.ID),
				BrandID:           strPtr(kimiaFarmaBrand.ID),
				SegmentID:         strPtr(ethicalSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 6,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         35000,
				SellingPrice:      55000,
				MinStock:          50,
				MaxStock:          200,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      5,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "MED-20240101-001",
				Name:              "Blood Pressure Monitor",
				Description:       "Digital blood pressure measuring device",
				CategoryID:        strPtr(medDeviceCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(deviceType.ID),
				UomID:             strPtr(pcsUom.ID),
				PurchaseUomID:     strPtr(pcsUom.ID),
				PurchaseUomConversion: 1,
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         250000,
				SellingPrice:      450000,
				MinStock:          10,
				MaxStock:          50,
				TaxType:           "PPN",
				IsTaxInclusive:    false,
				LeadTimeDays:      7,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "OVE-20240101-001",
				Name:              "Cetirizine 10mg Tablet",
				Description:       "Antihistamine for allergies",
				CategoryID:        strPtr(otcCategory.ID),
				BrandID:           strPtr(kimiaFarmaBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 10,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         8000,
				SellingPrice:      15000,
				MinStock:          200,
				MaxStock:          1000,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      2,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "OVE-20240101-002",
				Name:              "Ibuprofen 400mg Tablet",
				Description:       "NSAID for pain and inflammation",
				CategoryID:        strPtr(otcCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 10,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         5000,
				SellingPrice:      10000,
				MinStock:          300,
				MaxStock:          1500,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      2,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "PRE-20240101-003",
				Name:              "Omeprazole 20mg Capsule",
				Description:       "Proton pump inhibitor for GERD",
				CategoryID:        strPtr(prescriptionCategory.ID),
				BrandID:           strPtr(kimiaFarmaBrand.ID),
				SegmentID:         strPtr(ethicalSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 3,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         18000,
				SellingPrice:      30000,
				MinStock:          100,
				MaxStock:          400,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      3,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "OVE-20240101-003",
				Name:              "Paracetamol 500mg Tablet",
				Description:       "Analgesic and antipyretic",
				CategoryID:        strPtr(otcCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 20,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         3000,
				SellingPrice:      5000,
				MinStock:          500,
				MaxStock:          2000,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      1,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "MED-20240101-002",
				Name:              "Stethoscope Classic III",
				Description:       "Professional-grade stethoscope",
				CategoryID:        strPtr(medDeviceCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(deviceType.ID),
				UomID:             strPtr(pcsUom.ID),
				PurchaseUomID:     strPtr(pcsUom.ID),
				PurchaseUomConversion: 1,
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         1500000,
				SellingPrice:      2500000,
				MinStock:          5,
				MaxStock:          20,
				TaxType:           "PPN",
				IsTaxInclusive:    false,
				LeadTimeDays:      14,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "MED-20240101-003",
				Name:              "Thermometer Digital",
				Description:       "Digital thermometer for body temperature",
				CategoryID:        strPtr(medDeviceCategory.ID),
				BrandID:           strPtr(kimiaFarmaBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(deviceType.ID),
				UomID:             strPtr(pcsUom.ID),
				PurchaseUomID:     strPtr(pcsUom.ID),
				PurchaseUomConversion: 1,
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         35000,
				SellingPrice:      65000,
				MinStock:          20,
				MaxStock:          100,
				TaxType:           "PPN",
				IsTaxInclusive:    false,
				LeadTimeDays:      5,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
			{
				Code:              "OVE-20240101-004",
				Name:              "Vitamin C 500mg",
				Description:       "Vitamin C supplement tablets",
				CategoryID:        strPtr(otcCategory.ID),
				BrandID:           strPtr(kalbeBrand.ID),
				SegmentID:         strPtr(otcSegment.ID),
				TypeID:            strPtr(medicineType.ID),
				UomID:             strPtr(stripUom.ID),
				PurchaseUomID:     strPtr(boxUom.ID),
				PurchaseUomConversion: 10,
				PackagingID:       strPtr(blisterPackaging.ID),
				ProcurementTypeID: strPtr(buyProcurement.ID),
				CostPrice:         12000,
				SellingPrice:      20000,
				MinStock:          100,
				MaxStock:          500,
				TaxType:           "PPN",
				IsTaxInclusive:    true,
				LeadTimeDays:      2,
				Status:            models.ProductStatusApproved,
				IsApproved:        true,
				IsActive:          true,
			},
		}

		for i := range products {
			if err := db.Create(&products[i]).Error; err != nil {
				log.Printf("Warning: Failed to create product %s: %v", products[i].Name, err)
			}
		}
	} else {
		log.Println("Products already seeded, skipping...")
	}

	log.Println("Product data seeded successfully!")
	return nil
}
