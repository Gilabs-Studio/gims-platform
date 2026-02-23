package seeders

import (
	"log"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/customer/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm/clause"
)

// SeedCustomerTypes seeds the customer type reference data
func SeedCustomerTypes() error {
	log.Println("Seeding customer types...")

	types := []models.CustomerType{
		{ID: CustomerTypeHospitalID, Name: "Rumah Sakit", Description: "Hospital / healthcare facility", IsActive: true},
		{ID: CustomerTypeClinicID, Name: "Klinik", Description: "Clinic / outpatient facility", IsActive: true},
		{ID: CustomerTypePharmacyID, Name: "Apotek", Description: "Pharmacy / drugstore", IsActive: true},
		{ID: CustomerTypePuskesmasID, Name: "Puskesmas", Description: "Community health center", IsActive: true},
		{ID: CustomerTypeDistribID, Name: "Distributor", Description: "Distributor / reseller", IsActive: true},
	}

	for _, t := range types {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "updated_at"}),
		}).Create(&t).Error; err != nil {
			log.Printf("Warning: Failed to seed customer type %s: %v", t.Name, err)
		}
	}

	log.Println("Customer types seeded successfully")
	return nil
}

// SeedCustomers seeds customer master data matching the existing sales estimation data
func SeedCustomers() error {
	log.Println("Seeding customers...")

	db := database.DB
	adminID := AdminEmployeeID
	approved := models.CustomerStatusApproved

	pharmacyTypeID := CustomerTypePharmacyID
	hospitalTypeID := CustomerTypeHospitalID
	clinicTypeID := CustomerTypeClinicID
	puskesmasTypeID := CustomerTypePuskesmasID

	// Sales rep IDs (fixed constants)
	salesRep1ID := SalesRep1EmployeeID
	salesRep2ID := SalesRep2EmployeeID

	// Area IDs (fixed constants)
	areaJabodetabek := AreaJabodetabekID
	areaJawaBarat := AreaJawaBaratID
	areaJawaTimur := AreaJawaTimurID

	// Business types — dynamic query (seeded by SeedOrganization, no fixed UUIDs)
	var businessTypes []orgModels.BusinessType
	if err := db.Where("is_active = ?", true).Limit(4).Find(&businessTypes).Error; err != nil {
		log.Printf("Warning: Could not fetch business types for customer defaults: %v", err)
	}
	var btRetailID, btInstitutionID *string
	for i, bt := range businessTypes {
		if i == 0 {
			id := bt.ID
			btRetailID = &id
		}
		if i == 1 {
			id := bt.ID
			btInstitutionID = &id
		}
	}
	if btInstitutionID == nil {
		btInstitutionID = btRetailID
	}

	// Payment terms — dynamic query (seeded by SeedPaymentTerms, no fixed UUIDs)
	var paymentTerms []coreModels.PaymentTerms
	if err := db.Where("is_active = ?", true).Order("days asc").Limit(5).Find(&paymentTerms).Error; err != nil {
		log.Printf("Warning: Could not fetch payment terms for customer defaults: %v", err)
	}
	var ptNet30, ptNet14, ptCOD *string
	for _, pt := range paymentTerms {
		id := pt.ID
		switch pt.Days {
		case 0:
			ptCOD = &id
		case 14:
			ptNet14 = &id
		case 30:
			ptNet30 = &id
		}
	}

	// Fallback: use first available payment term
	if len(paymentTerms) > 0 {
		if ptNet30 == nil {
			id := paymentTerms[0].ID
			ptNet30 = &id
		}
		if ptNet14 == nil {
			ptNet14 = ptNet30
		}
		if ptCOD == nil {
			ptCOD = ptNet30
		}
	}

	taxRate11 := 11.0
	taxRate0 := 0.0

	customers := []models.Customer{
		{
			ID:                    Customer1ID,
			Code:                  "CUST-00001",
			Name:                  "PT Apotek Sehat Sentosa",
			CustomerTypeID:        &pharmacyTypeID,
			Address:               "Jl. Raya Kesehatan No. 10, Jakarta Selatan",
			Email:                 "info@apoteksehat.co.id",
			ContactPerson:         "Budi Santoso",
			NPWP:                  "01.234.567.8-012.000",
			Latitude:              floatPtr(-6.2615),
			Longitude:             floatPtr(106.8106),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btRetailID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
		},
		{
			ID:                    Customer2ID,
			Code:                  "CUST-00002",
			Name:                  "RS Harapan Kita Jakarta",
			CustomerTypeID:        &hospitalTypeID,
			Address:               "Jl. Letjen S. Parman Kav 87, Slipi, Jakarta Barat",
			Email:                 "procurement@rsharapankita.co.id",
			ContactPerson:         "Dr. Siti Rahayu",
			NPWP:                  "02.345.678.9-012.000",
			Latitude:              floatPtr(-6.1864),
			Longitude:             floatPtr(106.7941),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
		},
		{
			ID:                    Customer3ID,
			Code:                  "CUST-00003",
			Name:                  "Klinik Pratama Medika",
			CustomerTypeID:        &clinicTypeID,
			Address:               "Jl. Merdeka No. 25, Bandung",
			Email:                 "admin@klinikmedika.co.id",
			ContactPerson:         "Andi Wijaya",
			NPWP:                  "03.456.789.0-012.000",
			Latitude:              floatPtr(-6.9175),
			Longitude:             floatPtr(107.6191),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJawaBarat,
			DefaultSalesRepID:     &salesRep2ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet14,
			DefaultTaxRate:        &taxRate11,
		},
		{
			ID:                    Customer4ID,
			Code:                  "CUST-00004",
			Name:                  "RS Siloam Hospitals Surabaya",
			CustomerTypeID:        &hospitalTypeID,
			Address:               "Jl. Raya Gubeng No. 70, Surabaya",
			Email:                 "purchasing@siloam-sby.co.id",
			ContactPerson:         "Dewi Lestari",
			NPWP:                  "04.567.890.1-012.000",
			Latitude:              floatPtr(-7.2756),
			Longitude:             floatPtr(112.7508),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJawaTimur,
			DefaultSalesRepID:     &salesRep2ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
		},
		{
			ID:                    Customer5ID,
			Code:                  "CUST-00005",
			Name:                  "Apotek Kimia Farma Cabang Bekasi",
			CustomerTypeID:        &pharmacyTypeID,
			Address:               "Jl. Ahmad Yani No. 55, Bekasi",
			Email:                 "bekasi@kimiafarma.co.id",
			ContactPerson:         "Rina Puspita",
			NPWP:                  "05.678.901.2-012.000",
			Latitude:              floatPtr(-6.2383),
			Longitude:             floatPtr(106.9756),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btRetailID,
			DefaultPaymentTermsID: ptNet14,
			DefaultTaxRate:        &taxRate11,
		},
		{
			ID:                    Customer6ID,
			Code:                  "CUST-00006",
			Name:                  "Puskesmas Cempaka Putih",
			CustomerTypeID:        &puskesmasTypeID,
			Address:               "Jl. Cempaka Putih Tengah No. 1, Jakarta Pusat",
			Email:                 "puskesmas.cp@jakarta.go.id",
			ContactPerson:         "Hadi Purnomo",
			NPWP:                  "06.789.012.3-012.000",
			Latitude:              floatPtr(-6.1751),
			Longitude:             floatPtr(106.8713),
			Status:                approved,
			IsApproved:            true,
			CreatedBy:             &adminID,
			ApprovedBy:            &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptCOD,
			DefaultTaxRate:        &taxRate0,
		},
	}

	for _, c := range customers {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "updated_at",
				"default_area_id", "default_sales_rep_id",
				"default_business_type_id", "default_payment_terms_id", "default_tax_rate",
			}),
		}).Create(&c).Error; err != nil {
			log.Printf("Warning: Failed to seed customer %s: %v", c.Name, err)
		}
	}

	// Seed phone numbers for each customer
	seedCustomerPhoneNumbers()

	log.Println("Customers seeded successfully")
	return nil
}

func seedCustomerPhoneNumbers() {
	phones := []models.CustomerPhoneNumber{
		{ID: "c0000003-0000-0000-0000-000000000001", CustomerID: Customer1ID, PhoneNumber: "021-7654321", Label: "Kantor", IsPrimary: true},
		{ID: "c0000003-0000-0000-0000-000000000002", CustomerID: Customer2ID, PhoneNumber: "021-5684093", Label: "Procurement", IsPrimary: true},
		{ID: "c0000003-0000-0000-0000-000000000003", CustomerID: Customer3ID, PhoneNumber: "022-4261234", Label: "Resepsionis", IsPrimary: true},
		{ID: "c0000003-0000-0000-0000-000000000004", CustomerID: Customer4ID, PhoneNumber: "031-5035335", Label: "Purchasing", IsPrimary: true},
		{ID: "c0000003-0000-0000-0000-000000000005", CustomerID: Customer5ID, PhoneNumber: "021-8845678", Label: "Apotek", IsPrimary: true},
		{ID: "c0000003-0000-0000-0000-000000000006", CustomerID: Customer6ID, PhoneNumber: "021-4246781", Label: "Admin", IsPrimary: true},
	}

	for _, p := range phones {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"phone_number", "updated_at"}),
		}).Create(&p).Error; err != nil {
			log.Printf("Warning: Failed to seed customer phone %s: %v", p.PhoneNumber, err)
		}
	}
}
