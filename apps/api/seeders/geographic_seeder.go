package seeders

import (
	"encoding/json"
	"log"
	"strings"

	"github.com/gilabs/gims/api/data/geodata"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/geographic/data/models"
	"gorm.io/gorm/clause"
)

// bpsToISO maps BPS numeric province codes to ISO 3166-2:ID codes
var bpsToISO = map[string]struct{ ISO, Name string }{
	"11": {"ID-AC", "Aceh"},
	"12": {"ID-SU", "Sumatera Utara"},
	"13": {"ID-SB", "Sumatera Barat"},
	"14": {"ID-RI", "Riau"},
	"15": {"ID-JA", "Jambi"},
	"16": {"ID-SS", "Sumatera Selatan"},
	"17": {"ID-BE", "Bengkulu"},
	"18": {"ID-LA", "Lampung"},
	"19": {"ID-BB", "Kepulauan Bangka Belitung"},
	"21": {"ID-KR", "Kepulauan Riau"},
	"31": {"ID-JK", "DKI Jakarta"},
	"32": {"ID-JB", "Jawa Barat"},
	"33": {"ID-JT", "Jawa Tengah"},
	"34": {"ID-YO", "DI Yogyakarta"},
	"35": {"ID-JI", "Jawa Timur"},
	"36": {"ID-BT", "Banten"},
	"51": {"ID-BA", "Bali"},
	"52": {"ID-NB", "Nusa Tenggara Barat"},
	"53": {"ID-NT", "Nusa Tenggara Timur"},
	"61": {"ID-KB", "Kalimantan Barat"},
	"62": {"ID-KT", "Kalimantan Tengah"},
	"63": {"ID-KS", "Kalimantan Selatan"},
	"64": {"ID-KI", "Kalimantan Timur"},
	"65": {"ID-KU", "Kalimantan Utara"},
	"71": {"ID-SA", "Sulawesi Utara"},
	"72": {"ID-ST", "Sulawesi Tengah"},
	"73": {"ID-SN", "Sulawesi Selatan"},
	"74": {"ID-SG", "Sulawesi Tenggara"},
	"75": {"ID-GO", "Gorontalo"},
	"76": {"ID-SR", "Sulawesi Barat"},
	"81": {"ID-MA", "Maluku"},
	"82": {"ID-MU", "Maluku Utara"},
	"91": {"ID-PB", "Papua Barat"},
	"92": {"ID-PA", "Papua"},
	"93": {"ID-PT", "Papua Tengah"},
	"94": {"ID-PP", "Papua Pegunungan"},
	"95": {"ID-PS", "Papua Selatan"},
	"96": {"ID-PD", "Papua Barat Daya"},
}

// provinceMapping maps GeoJSON source names to modern province names and ISO codes (legacy, unused)
type provinceMapping struct {
	Name string
	Code string
}

// simpleGeoJSONFeature is the village-level GeoJSON structure used for seeding
type simpleGeoJSONFeature struct {
	Properties map[string]interface{} `json:"properties"`
	Geometry   json.RawMessage        `json:"geometry"`
}

type simpleGeoJSONCollection struct {
	Features []simpleGeoJSONFeature `json:"features"`
}

// SeedGeographic seeds Indonesia geographic data: country, provinces, cities, and districts
// sourced from the embedded village-level GeoJSON (WADMPR/WADMKK/WADMKC properties).
func SeedGeographic() error {
	db := database.DB
	log.Println("Seeding geographic data from village-level GeoJSON...")

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
	if err := db.Where("code = ?", "ID").First(&indonesia).Error; err != nil {
		return err
	}

	// Parse village-level GeoJSON
	var col simpleGeoJSONCollection
	if err := json.Unmarshal(geodata.IndonesiaProvincesSimple, &col); err != nil {
		log.Printf("WARN: Failed to parse IndonesiaProvincesSimple: %v", err)
		return err
	}

	// ── Collect unique provinces, cities, districts from GeoJSON ──────────────
	type cityKey struct{ bpsCode, name, provinceBPS string }
	type districtKey struct{ bpsCode, name, cityBPS string }

	uniqueProvinces := map[string]string{}              // bps → name
	uniqueCities := map[string]cityKey{}                 // bpsCode → cityKey
	uniqueDistricts := map[string]districtKey{}          // bpsCode → districtKey

	// Geometry collection maps for reverse geocode — aggregate polygons
	// from district-level features into province/city/district geometries
	provinceGeoms := map[string][]json.RawMessage{}
	cityGeoms := map[string][]json.RawMessage{}
	districtGeoms := map[string][]json.RawMessage{}

	for _, feat := range col.Features {
		p := feat.Properties

		pBPS := strProp(p, "KDPPUM")
		pName := strProp(p, "WADMPR")
		cBPS := strProp(p, "KDPKAB")
		cName := strProp(p, "WADMKK")
		dBPS := strProp(p, "KDCPUM")
		dName := strProp(p, "WADMKC")

		if pBPS != "" && pName != "" {
			uniqueProvinces[pBPS] = pName
		}
		if cBPS != "" && cName != "" && pBPS != "" {
			uniqueCities[cBPS] = cityKey{bpsCode: cBPS, name: cName, provinceBPS: pBPS}
		}
		if dBPS != "" && dName != "" && cBPS != "" {
			uniqueDistricts[dBPS] = districtKey{bpsCode: dBPS, name: dName, cityBPS: cBPS}
		}

		// Collect geometry for reverse geocode support
		if len(feat.Geometry) > 0 {
			if pBPS != "" {
				provinceGeoms[pBPS] = append(provinceGeoms[pBPS], feat.Geometry)
			}
			if cBPS != "" {
				cityGeoms[cBPS] = append(cityGeoms[cBPS], feat.Geometry)
			}
			if dBPS != "" {
				districtGeoms[dBPS] = append(districtGeoms[dBPS], feat.Geometry)
			}
		}
	}

	// ── Seed provinces ──────────────────────────────────────────────────────────
	// provinceIDByBPS maps BPS code → database UUID after upsert
	provinceIDByBPS := map[string]string{}

	for bpsCode, name := range uniqueProvinces {
		info, ok := bpsToISO[bpsCode]
		if !ok {
			// Use a derived code when ISO mapping is missing
			info.ISO = "ID-" + bpsCode
			info.Name = name
		}
		prov := models.Province{
			CountryID: indonesia.ID,
			Name:      info.Name,
			Code:      info.ISO,
			IsActive:  true,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "country_id", "updated_at"}),
		}).Create(&prov).Error; err != nil {
			log.Printf("WARN: province %s: %v", name, err)
			continue
		}
		var saved models.Province
		if err := db.Select("id, code").Where("code = ?", info.ISO).First(&saved).Error; err == nil {
			provinceIDByBPS[bpsCode] = saved.ID
		}
	}

	// Seed modern provinces not present in GeoJSON sample
	modernProvinces := []struct{ bps, iso, name string }{
		{"93", "ID-PT", "Papua Tengah"},
		{"94", "ID-PP", "Papua Pegunungan"},
		{"95", "ID-PS", "Papua Selatan"},
		{"96", "ID-PD", "Papua Barat Daya"},
	}
	for _, mp := range modernProvinces {
		if _, exists := uniqueProvinces[mp.bps]; exists {
			continue // already seeded from GeoJSON
		}
		prov := models.Province{CountryID: indonesia.ID, Name: mp.name, Code: mp.iso, IsActive: true}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&prov).Error; err != nil {
			log.Printf("WARN: modern province %s: %v", mp.name, err)
		}
	}
	log.Printf("Provinces seeded: %d from GeoJSON + %d modern", len(uniqueProvinces), len(modernProvinces))

	// ── Seed cities ──────────────────────────────────────────────────────────────
	// cityIDByBPS maps BPS city code → database UUID after upsert
	cityIDByBPS := map[string]string{}

	seededCities := 0
	for _, ck := range uniqueCities {
		provID, ok := provinceIDByBPS[ck.provinceBPS]
		if !ok {
			continue
		}
		cityType := "regency"
		if strings.HasPrefix(ck.name, "Kota ") {
			cityType = "city"
		}
		city := models.City{
			ProvinceID: provID,
			Name:       ck.name,
			Code:       ck.bpsCode,
			Type:       cityType,
			IsActive:   true,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "province_id", "type", "updated_at"}),
		}).Create(&city).Error; err != nil {
			log.Printf("WARN: city %s: %v", ck.name, err)
			continue
		}
		var saved models.City
		if err := db.Select("id, code").Where("code = ?", ck.bpsCode).First(&saved).Error; err == nil {
			cityIDByBPS[ck.bpsCode] = saved.ID
			seededCities++
		}
	}
	log.Printf("Cities seeded: %d", seededCities)

	// ── Seed districts ─────────────────────────────────────────────────────────
	seededDistricts := 0
	for _, dk := range uniqueDistricts {
		cityID, ok := cityIDByBPS[dk.cityBPS]
		if !ok {
			continue
		}
		district := models.District{
			CityID:   cityID,
			Name:     dk.name,
			Code:     dk.bpsCode,
			IsActive: true,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "city_id", "updated_at"}),
		}).Create(&district).Error; err != nil {
			log.Printf("WARN: district %s: %v", dk.name, err)
			continue
		}
		seededDistricts++
	}
	log.Printf("Districts seeded: %d", seededDistricts)

	// ── Update geometry for reverse geocode ────────────────────────────────────
	log.Println("Updating geometry data for reverse geocode support...")

	updatedProvGeom := 0
	for bps, geoms := range provinceGeoms {
		provID, ok := provinceIDByBPS[bps]
		if !ok {
			continue
		}
		merged := mergeGeoJSONGeometries(geoms)
		if merged == "" {
			continue
		}
		if err := db.Model(&models.Province{}).Where("id = ?", provID).Update("geometry", merged).Error; err != nil {
			log.Printf("WARN: province geometry %s: %v", bps, err)
		} else {
			updatedProvGeom++
		}
	}
	log.Printf("Province geometries updated: %d", updatedProvGeom)

	updatedCityGeom := 0
	for bps, geoms := range cityGeoms {
		cityID, ok := cityIDByBPS[bps]
		if !ok {
			continue
		}
		merged := mergeGeoJSONGeometries(geoms)
		if merged == "" {
			continue
		}
		if err := db.Model(&models.City{}).Where("id = ?", cityID).Update("geometry", merged).Error; err != nil {
			log.Printf("WARN: city geometry %s: %v", bps, err)
		} else {
			updatedCityGeom++
		}
	}
	log.Printf("City geometries updated: %d", updatedCityGeom)

	updatedDistGeom := 0
	for bps, geoms := range districtGeoms {
		merged := mergeGeoJSONGeometries(geoms)
		if merged == "" {
			continue
		}
		if err := db.Model(&models.District{}).Where("code = ?", bps).Update("geometry", merged).Error; err != nil {
			log.Printf("WARN: district geometry %s: %v", bps, err)
		} else {
			updatedDistGeom++
		}
	}
	log.Printf("District geometries updated: %d", updatedDistGeom)

	log.Println("Geographic data seeded successfully!")
	return nil
}

// mergeGeoJSONGeometries combines multiple GeoJSON geometries (Polygon/MultiPolygon)
// into a single geometry suitable for point-in-polygon reverse geocoding.
// Returns empty string if no valid geometries found.
func mergeGeoJSONGeometries(geoms []json.RawMessage) string {
	type geomObj struct {
		Type        string          `json:"type"`
		Coordinates json.RawMessage `json:"coordinates"`
	}

	// Collect individual polygon coordinate arrays without parsing float values
	var polygonFragments []json.RawMessage

	for _, raw := range geoms {
		var g geomObj
		if err := json.Unmarshal(raw, &g); err != nil {
			continue
		}
		switch g.Type {
		case "Polygon":
			polygonFragments = append(polygonFragments, g.Coordinates)
		case "MultiPolygon":
			var polys []json.RawMessage
			if err := json.Unmarshal(g.Coordinates, &polys); err != nil {
				continue
			}
			polygonFragments = append(polygonFragments, polys...)
		}
	}

	if len(polygonFragments) == 0 {
		return ""
	}

	// Single polygon — store as Polygon for efficiency
	if len(polygonFragments) == 1 {
		result, err := json.Marshal(geomObj{Type: "Polygon", Coordinates: polygonFragments[0]})
		if err != nil {
			return ""
		}
		return string(result)
	}

	// Multiple polygons — combine into MultiPolygon
	coordsJSON, err := json.Marshal(polygonFragments)
	if err != nil {
		return ""
	}
	result, err := json.Marshal(geomObj{Type: "MultiPolygon", Coordinates: coordsJSON})
	if err != nil {
		return ""
	}
	return string(result)
}

// strProp safely extracts a non-nil string from a GeoJSON properties map.
func strProp(props map[string]interface{}, key string) string {
	v, ok := props[key]
	if !ok || v == nil {
		return ""
	}
	return strings.TrimSpace(v.(string))
}
