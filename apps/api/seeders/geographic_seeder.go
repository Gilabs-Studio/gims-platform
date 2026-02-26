package seeders

import (
	"encoding/json"
	"log"

	"github.com/gilabs/gims/api/data/geodata"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/geographic/data/models"
	"gorm.io/gorm/clause"
)

// provinceMapping maps GeoJSON source names to modern province names and ISO codes
type provinceMapping struct {
	Name string
	Code string
}

// geoJSONNameMap normalizes old GeoJSON source names to modern Indonesian province data
var geoJSONNameMap = map[string]provinceMapping{
	"DI. ACEH":                   {Name: "Aceh", Code: "ID-AC"},
	"SUMATERA UTARA":             {Name: "Sumatera Utara", Code: "ID-SU"},
	"SUMATERA BARAT":             {Name: "Sumatera Barat", Code: "ID-SB"},
	"RIAU":                       {Name: "Riau", Code: "ID-RI"},
	"JAMBI":                      {Name: "Jambi", Code: "ID-JA"},
	"SUMATERA SELATAN":           {Name: "Sumatera Selatan", Code: "ID-SS"},
	"BENGKULU":                   {Name: "Bengkulu", Code: "ID-BE"},
	"LAMPUNG":                    {Name: "Lampung", Code: "ID-LA"},
	"BANGKA BELITUNG":            {Name: "Kepulauan Bangka Belitung", Code: "ID-BB"},
	"DKI JAKARTA":                {Name: "DKI Jakarta", Code: "ID-JK"},
	"JAWA BARAT":                 {Name: "Jawa Barat", Code: "ID-JB"},
	"JAWA TENGAH":                {Name: "Jawa Tengah", Code: "ID-JT"},
	"DAERAH ISTIMEWA YOGYAKARTA": {Name: "DI Yogyakarta", Code: "ID-YO"},
	"JAWA TIMUR":                 {Name: "Jawa Timur", Code: "ID-JI"},
	"PROBANTEN":                  {Name: "Banten", Code: "ID-BT"},
	"BALI":                       {Name: "Bali", Code: "ID-BA"},
	"NUSATENGGARA BARAT":         {Name: "Nusa Tenggara Barat", Code: "ID-NB"},
	"NUSA TENGGARA TIMUR":        {Name: "Nusa Tenggara Timur", Code: "ID-NT"},
	"KALIMANTAN BARAT":           {Name: "Kalimantan Barat", Code: "ID-KB"},
	"KALIMANTAN TENGAH":          {Name: "Kalimantan Tengah", Code: "ID-KT"},
	"KALIMANTAN SELATAN":         {Name: "Kalimantan Selatan", Code: "ID-KS"},
	"KALIMANTAN TIMUR":           {Name: "Kalimantan Timur", Code: "ID-KI"},
	"SULAWESI UTARA":             {Name: "Sulawesi Utara", Code: "ID-SA"},
	"SULAWESI TENGAH":            {Name: "Sulawesi Tengah", Code: "ID-ST"},
	"SULAWESI SELATAN":           {Name: "Sulawesi Selatan", Code: "ID-SN"},
	"SULAWESI TENGGARA":          {Name: "Sulawesi Tenggara", Code: "ID-SG"},
	"GORONTALO":                  {Name: "Gorontalo", Code: "ID-GO"},
	"MALUKU UTARA":               {Name: "Maluku Utara", Code: "ID-MU"},
	"MALUKU":                     {Name: "Maluku", Code: "ID-MA"},
	"IRIAN JAYA BARAT":           {Name: "Papua Barat", Code: "ID-PB"},
	"IRIAN JAYA TENGAH":          {Name: "Papua", Code: "ID-PA"},
	"IRIAN JAYA TIMUR":           {Name: "Papua Pegunungan", Code: "ID-PP"},
}

// geoJSONFeatureCollection represents the structure of a GeoJSON FeatureCollection
type geoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []geoJSONFeature `json:"features"`
}

type geoJSONFeature struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Geometry   json.RawMessage        `json:"geometry"`
}

// SeedGeographic seeds Indonesia geographic data with province geometries
func SeedGeographic() error {
	db := database.DB

	log.Println("Seeding geographic data...")

	// Upsert Indonesia country
	indonesia := models.Country{
		Name:      "Indonesia",
		Code:      "ID",
		PhoneCode: "+62",
		IsActive:  true,
	}
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "phone_code", "updated_at"}),
	}).Create(&indonesia).Error; err != nil {
		return err
	}

	// Re-fetch Indonesia to get correct ID after upsert
	if err := db.Where("code = ?", "ID").First(&indonesia).Error; err != nil {
		return err
	}

	// Parse embedded province GeoJSON
	var featureCollection geoJSONFeatureCollection
	if err := json.Unmarshal(geodata.IndonesiaProvinces, &featureCollection); err != nil {
		log.Printf("Warning: Failed to parse province GeoJSON: %v", err)
		return seedBasicProvinces(indonesia.ID)
	}

	// Seed provinces from GeoJSON with geometry
	seededCount := 0
	for _, feature := range featureCollection.Features {
		sourceName, ok := feature.Properties["Propinsi"].(string)
		if !ok {
			continue
		}

		mapping, exists := geoJSONNameMap[sourceName]
		if !exists {
			log.Printf("Warning: Unknown province in GeoJSON: %s, skipping", sourceName)
			continue
		}

		geometryStr := string(feature.Geometry)

		province := models.Province{
			CountryID: indonesia.ID,
			Name:      mapping.Name,
			Code:      mapping.Code,
			Geometry:  &geometryStr,
			IsActive:  true,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "geometry", "country_id", "updated_at"}),
		}).Create(&province).Error; err != nil {
			log.Printf("Warning: Failed to seed province %s: %v", mapping.Name, err)
		} else {
			seededCount++
		}
	}

	// Seed modern provinces not present in old GeoJSON dataset (no geometry available)
	modernProvinces := []models.Province{
		{CountryID: indonesia.ID, Name: "Kepulauan Riau", Code: "ID-KR", IsActive: true},
		{CountryID: indonesia.ID, Name: "Sulawesi Barat", Code: "ID-SR", IsActive: true},
		{CountryID: indonesia.ID, Name: "Kalimantan Utara", Code: "ID-KU", IsActive: true},
		{CountryID: indonesia.ID, Name: "Papua Barat Daya", Code: "ID-PD", IsActive: true},
		{CountryID: indonesia.ID, Name: "Papua Selatan", Code: "ID-PS", IsActive: true},
		{CountryID: indonesia.ID, Name: "Papua Tengah", Code: "ID-PT", IsActive: true},
	}

	for _, province := range modernProvinces {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&province).Error; err != nil {
			log.Printf("Warning: Failed to seed modern province %s: %v", province.Name, err)
		}
	}

	log.Printf("Provinces seeded: %d from GeoJSON + %d modern provinces without geometry",
		seededCount, len(modernProvinces))

	// Seed sample cities, districts, and villages for Jawa Barat
	if err := seedSampleCitiesAndDistricts(); err != nil {
		log.Printf("Warning: Failed to seed sample cities/districts: %v", err)
	}

	log.Println("Geographic data seeded successfully!")
	return nil
}

// seedBasicProvinces is a fallback when GeoJSON parsing fails
func seedBasicProvinces(countryID string) error {
	log.Println("Falling back to basic province seeding (no geometry)...")

	provinces := []models.Province{
		{CountryID: countryID, Name: "DKI Jakarta", Code: "ID-JK", IsActive: true},
		{CountryID: countryID, Name: "Jawa Barat", Code: "ID-JB", IsActive: true},
		{CountryID: countryID, Name: "Jawa Tengah", Code: "ID-JT", IsActive: true},
		{CountryID: countryID, Name: "Jawa Timur", Code: "ID-JI", IsActive: true},
		{CountryID: countryID, Name: "Banten", Code: "ID-BT", IsActive: true},
	}

	for _, province := range provinces {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&province).Error; err != nil {
			log.Printf("Warning: Failed to seed province %s: %v", province.Name, err)
		}
	}

	return seedSampleCitiesAndDistricts()
}

// seedSampleCitiesAndDistricts seeds sample geographic data for Jawa Barat
func seedSampleCitiesAndDistricts() error {
	db := database.DB

	// Fetch Jawa Barat province
	var jawaBarat models.Province
	if err := db.Where("code = ?", "ID-JB").First(&jawaBarat).Error; err != nil {
		log.Printf("Warning: Jawa Barat province not found, skipping city/district seeding")
		return nil
	}

	// Sample cities for Jawa Barat
	cities := []models.City{
		{ProvinceID: jawaBarat.ID, Name: "Kota Bandung", Code: "ID-JB-BDG", Type: "city", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kabupaten Bandung", Code: "ID-JB-BDG-K", Type: "regency", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kota Bogor", Code: "ID-JB-BGR", Type: "city", IsActive: true},
		{ProvinceID: jawaBarat.ID, Name: "Kota Bekasi", Code: "ID-JB-BKS", Type: "city", IsActive: true},
	}

	for i := range cities {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&cities[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed city %s: %v", cities[i].Name, err)
		}
	}

	// Fetch Kota Bandung for district seeding
	var kotaBandung models.City
	if err := db.Where("code = ?", "ID-JB-BDG").First(&kotaBandung).Error; err != nil {
		log.Printf("Warning: Kota Bandung not found, skipping district seeding")
		return nil
	}

	// Sample districts for Kota Bandung
	districts := []models.District{
		{CityID: kotaBandung.ID, Name: "Coblong", Code: "ID-JB-BDG-CBL", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Dago", Code: "ID-JB-BDG-DG", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Cicendo", Code: "ID-JB-BDG-CCD", IsActive: true},
		{CityID: kotaBandung.ID, Name: "Sukajadi", Code: "ID-JB-BDG-SKJ", IsActive: true},
	}

	for i := range districts {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&districts[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed district %s: %v", districts[i].Name, err)
		}
	}

	// Fetch Coblong for village seeding
	var coblong models.District
	if err := db.Where("code = ?", "ID-JB-BDG-CBL").First(&coblong).Error; err != nil {
		log.Printf("Warning: Coblong district not found, skipping village seeding")
		return nil
	}

	// Sample villages for Coblong
	villages := []models.Village{
		{DistrictID: coblong.ID, Name: "Lebak Siliwangi", Code: "ID-JB-BDG-CBL-LS", PostalCode: "40132", Type: "kelurahan", IsActive: true},
		{DistrictID: coblong.ID, Name: "Cipaganti", Code: "ID-JB-BDG-CBL-CP", PostalCode: "40131", Type: "kelurahan", IsActive: true},
		{DistrictID: coblong.ID, Name: "Sadang Serang", Code: "ID-JB-BDG-CBL-SS", PostalCode: "40133", Type: "kelurahan", IsActive: true},
	}

	for i := range villages {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&villages[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed village %s: %v", villages[i].Name, err)
		}
	}

	return nil
}
