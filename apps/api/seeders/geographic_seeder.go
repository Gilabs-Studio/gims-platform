package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/geographic/data/models"
)

// SeedGeographic seeds sample Indonesia geographic data
func SeedGeographic() error {
	db := database.DB

	// Check if countries already exist
	var countryCount int64
	db.Model(&models.Country{}).Count(&countryCount)
	if countryCount > 0 {
		log.Println("Geographic data already seeded, skipping...")
		return nil
	}

	log.Println("Seeding geographic data...")

	// Create Indonesia country
	indonesia := models.Country{
		Name:      "Indonesia",
		Code:      "ID",
		PhoneCode: "+62",
		IsActive:  true,
	}
	if err := db.Create(&indonesia).Error; err != nil {
		return err
	}

	// Create sample provinces
	provinces := []models.Province{
		{CountryID: indonesia.ID, Name: "DKI Jakarta", Code: "ID-JK", IsActive: true},
		{CountryID: indonesia.ID, Name: "Jawa Barat", Code: "ID-JB", IsActive: true},
		{CountryID: indonesia.ID, Name: "Jawa Tengah", Code: "ID-JT", IsActive: true},
		{CountryID: indonesia.ID, Name: "Jawa Timur", Code: "ID-JI", IsActive: true},
		{CountryID: indonesia.ID, Name: "Banten", Code: "ID-BT", IsActive: true},
	}

	for i := range provinces {
		if err := db.Create(&provinces[i]).Error; err != nil {
			return err
		}
	}

	// Create sample cities for Jawa Barat
	var jawaBarat models.Province
	db.Where("code = ?", "ID-JB").First(&jawaBarat)

	cities := []models.City{
		{ProvinceID: jawaBarat.ID, Name: "Kota Bandung", Code: "ID-JB-BDG", Type: "city", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kabupaten Bandung", Code: "ID-JB-BDG-K", Type: "regency", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kota Bogor", Code: "ID-JB-BGR", Type: "city", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kota Bekasi", Code: "ID-JB-BKS", Type: "city", IsActive: true},
	}

	for i := range cities {
		if err := db.Create(&cities[i]).Error; err != nil {
			return err
		}
	}

	// Create sample districts for Kota Bandung
	var kotaBandung models.City
	db.Where("code = ?", "ID-JB-BDG").First(&kotaBandung)

	districts := []models.District{
		{CityID: kotaBandung.ID, Name: "Coblong", Code: "ID-JB-BDG-CBL", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Dago", Code: "ID-JB-BDG-DG", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Cicendo", Code: "ID-JB-BDG-CCD", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Sukajadi", Code: "ID-JB-BDG-SKJ", IsActive: true},
	}

	for i := range districts {
		if err := db.Create(&districts[i]).Error; err != nil {
			return err
		}
	}

	// Create sample villages for Coblong
	var coblong models.District
	db.Where("code = ?", "ID-JB-BDG-CBL").First(&coblong)

	villages := []models.Village{
		{DistrictID: coblong.ID, Name: "Lebak Siliwangi", Code: "ID-JB-BDG-CBL-LS", PostalCode: "40132", Type: "kelurahan", IsActive: true},
		{DistrictID: coblong.ID, Name: "Cipaganti", Code: "ID-JB-BDG-CBL-CP", PostalCode: "40131", Type: "kelurahan", IsActive: true},
		{DistrictID: coblong.ID, Name: "Sadang Serang", Code: "ID-JB-BDG-CBL-SS", PostalCode: "40133", Type: "kelurahan", IsActive: true},
	}

	for i := range villages {
		if err := db.Create(&villages[i]).Error; err != nil {
			return err
		}
	}

	log.Println("Geographic data seeded successfully!")
	return nil
}
