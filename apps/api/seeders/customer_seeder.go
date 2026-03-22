package seeders

import (
	"log"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/customer/data/models"
	geoModels "github.com/gilabs/gims/api/internal/geographic/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
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

	// Minimal mode: seed only one customer for traceable sales flows.
	if isMinimalSeedMode() {
		db := database.DB
		adminID := AdminEmployeeID
		customer := models.Customer{
			ID:        Customer1ID,
			Code:      "CUST-MIN-001",
			Name:      "PT. Minimal Customer",
			CreatedBy: &adminID,
			IsActive:  true,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"code", "name", "created_by", "is_active", "updated_at"}),
		}).Create(&customer).Error; err != nil {
			return err
		}
		return nil
	}

	db := database.DB
	adminID := AdminEmployeeID

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

	// Lookup province IDs by name so customers have province_id set for geo reports.
	// Province names must match what geographic_seeder inserts from the GeoJSON.
	provIDByName := map[string]string{}
	var provinces []geoModels.Province
	if err := db.Where("name IN ?", []string{"DKI Jakarta", "Jawa Barat", "Jawa Timur"}).Find(&provinces).Error; err != nil {
		log.Printf("Warning: Could not fetch provinces for customer seeder: %v", err)
	}
	for _, p := range provinces {
		provIDByName[p.Name] = p.ID
	}
	provJakarta := provIDByName["DKI Jakarta"]
	provJabar := provIDByName["Jawa Barat"]
	provJatim := provIDByName["Jawa Timur"]

	var provJakartaPtr, provJabarPtr, provJatimPtr *string
	if provJakarta != "" {
		provJakartaPtr = &provJakarta
	}
	if provJabar != "" {
		provJabarPtr = &provJabar
	}
	if provJatim != "" {
		provJatimPtr = &provJatim
	}

	// Lookup city IDs by name (WADMKK values from BPS GeoJSON).
	// City names stored in DB match the Indonesian BPS nomenclature (title-cased by the seeder).
	lookupCity := func(partial string) *string {
		var found []geoModels.City
		if err := db.Where("name ILIKE ?", "%"+partial+"%").Limit(1).Find(&found).Error; err == nil && len(found) > 0 {
			id := found[0].ID
			return &id
		}
		return nil
	}
	cityJakartaSelatanPtr := lookupCity("Jakarta Selatan")
	cityJakartaBaratPtr := lookupCity("Jakarta Barat")
	cityJakartaPusatPtr := lookupCity("Jakarta Pusat")
	cityBandungPtr := lookupCity("Bandung")
	cityBekasiPtr := lookupCity("Kota Bekasi")
	citySurabayaPtr := lookupCity("Surabaya")

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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btRetailID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
			ProvinceID:            provJakartaPtr,
			CityID:                cityJakartaSelatanPtr,
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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
			ProvinceID:            provJakartaPtr,
			CityID:                cityJakartaBaratPtr,
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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJawaBarat,
			DefaultSalesRepID:     &salesRep2ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet14,
			DefaultTaxRate:        &taxRate11,
			ProvinceID:            provJabarPtr,
			CityID:                cityBandungPtr,
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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJawaTimur,
			DefaultSalesRepID:     &salesRep2ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptNet30,
			DefaultTaxRate:        &taxRate11,
			ProvinceID:            provJatimPtr,
			CityID:                citySurabayaPtr,
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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btRetailID,
			DefaultPaymentTermsID: ptNet14,
			DefaultTaxRate:        &taxRate11,
			ProvinceID:            provJabarPtr, // Bekasi is in Jawa Barat province
			CityID:                cityBekasiPtr,
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
			CreatedBy:             &adminID,
			IsActive:              true,
			DefaultAreaID:         &areaJabodetabek,
			DefaultSalesRepID:     &salesRep1ID,
			DefaultBusinessTypeID: btInstitutionID,
			DefaultPaymentTermsID: ptCOD,
			DefaultTaxRate:        &taxRate0,
			ProvinceID:            provJakartaPtr,
			CityID:                cityJakartaPusatPtr,
		},
	}

	for _, c := range customers {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "updated_at",
				"default_area_id", "default_sales_rep_id",
				"default_business_type_id", "default_payment_terms_id", "default_tax_rate",
				"province_id", "city_id",
			}),
		}).Create(&c).Error; err != nil {
			log.Printf("Warning: Failed to seed customer %s: %v", c.Name, err)
		}
	}

	// Seed phone numbers for each customer
	seedCustomerPhoneNumbers()
	seedCustomerBankAccounts(customers)

	log.Println("Customers seeded successfully")
	return nil
}

func seedCustomerBankAccounts(customers []models.Customer) {
	codeToBankID := map[string]string{}
	currencyCodeToID := map[string]string{}
	var banks []supplierModels.Bank
	if err := database.DB.Where("is_active = ?", true).Find(&banks).Error; err != nil {
		log.Printf("Warning: Failed to query banks for customer bank seeding: %v", err)
		return
	}
	var currencies []coreModels.Currency
	if err := database.DB.Where("is_active = ?", true).Find(&currencies).Error; err != nil {
		log.Printf("Warning: Failed to query currencies for customer bank seeding: %v", err)
		return
	}
	for _, b := range banks {
		codeToBankID[b.Code] = b.ID
	}
	for _, currency := range currencies {
		currencyCodeToID[currency.Code] = currency.ID
	}
	defaultCurrencyID := currencyCodeToID["IDR"]

	resolveBankID := func(preferredCode string) string {
		if id := codeToBankID[preferredCode]; id != "" {
			return id
		}
		for _, b := range banks {
			if b.ID != "" {
				return b.ID
			}
		}
		return ""
	}

	entries := []models.CustomerBank{
		{ID: "c0000004-0000-0000-0000-000000000001", CustomerID: Customer1ID, BankID: resolveBankID("BCA"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000001", AccountName: "PT Apotek Sehat Sentosa", Branch: "KCP Jakarta Selatan", IsPrimary: true},
		{ID: "c0000004-0000-0000-0000-000000000002", CustomerID: Customer2ID, BankID: resolveBankID("MANDIRI"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000002", AccountName: "RS Harapan Kita Jakarta", Branch: "KCP Slipi", IsPrimary: true},
		{ID: "c0000004-0000-0000-0000-000000000003", CustomerID: Customer3ID, BankID: resolveBankID("BNI"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000003", AccountName: "Klinik Pratama Medika", Branch: "KCP Bandung", IsPrimary: true},
		{ID: "c0000004-0000-0000-0000-000000000004", CustomerID: Customer4ID, BankID: resolveBankID("BRI"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000004", AccountName: "RS Siloam Hospitals Surabaya", Branch: "KCP Surabaya", IsPrimary: true},
		{ID: "c0000004-0000-0000-0000-000000000005", CustomerID: Customer5ID, BankID: resolveBankID("CIMB"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000005", AccountName: "Apotek Kimia Farma Cabang Bekasi", Branch: "KCP Bekasi", IsPrimary: true},
		{ID: "c0000004-0000-0000-0000-000000000006", CustomerID: Customer6ID, BankID: resolveBankID("BCA"), CurrencyID: &defaultCurrencyID, AccountNumber: "888100000006", AccountName: "Puskesmas Cempaka Putih", Branch: "KCP Jakarta Pusat", IsPrimary: true},
	}

	seededCustomerIDs := map[string]bool{}
	for _, entry := range entries {
		if entry.BankID == "" {
			continue
		}
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"bank_id", "account_number", "account_name", "branch", "is_primary", "updated_at"}),
		}).Create(&entry).Error; err != nil {
			log.Printf("Warning: Failed to seed customer bank for customer %s: %v", entry.CustomerID, err)
			continue
		}
		seededCustomerIDs[entry.CustomerID] = true
	}

	for _, c := range customers {
		if seededCustomerIDs[c.ID] {
			continue
		}
		bankID := resolveBankID("BCA")
		if bankID == "" {
			continue
		}
		fallback := models.CustomerBank{
			CustomerID:    c.ID,
			BankID:        bankID,
			CurrencyID:    &defaultCurrencyID,
			AccountNumber: "8881" + c.Code[len(c.Code)-5:],
			AccountName:   c.Name,
			Branch:        "Main Branch",
			IsPrimary:     true,
		}
		if err := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&fallback).Error; err != nil {
			log.Printf("Warning: Failed to seed fallback customer bank for %s: %v", c.Name, err)
		}
	}
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
