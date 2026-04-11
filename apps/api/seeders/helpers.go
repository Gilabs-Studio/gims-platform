package seeders

import (
	"os"
	"strings"

	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"gorm.io/gorm"
)

// stringPtr creates a pointer to a string
func stringPtr(s string) *string {
	return &s
}

// int64Ptr creates a pointer to an int64
func int64Ptr(i int64) *int64 {
	return &i
}

func isMinimalSeedMode() bool {
	return os.Getenv("SEED_MINIMAL_DATA") == "true"
}

func getAdminID(tx *gorm.DB) string {
	defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
	if defaultEmail == "" {
		defaultEmail = "admin@example.com"
	}
	var user userModels.User
	if err := tx.Where("email = ?", defaultEmail).First(&user).Error; err != nil {
		if err := tx.First(&user).Error; err != nil {
			return "00000000-0000-0000-0000-000000000000"
		}
	}
	if user.ID == "" {
		return "00000000-0000-0000-0000-000000000000"
	}
	return user.ID
}

// nilIfEmpty returns nil if the string is empty, otherwise a pointer to the string.
func nilIfEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}

func seedUnsplashImage(query string) *string {
	cleanQuery := strings.ToLower(strings.TrimSpace(query))

	// Source.unsplash.com has been sunset. Keep deterministic hardcoded image URLs
	// so seeded products always have renderable thumbnails.
	imageURL := "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80"

	switch {
	case strings.Contains(cleanQuery, "water") || strings.Contains(cleanQuery, "air mineral"):
		imageURL = "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "chips") || strings.Contains(cleanQuery, "snack"):
		imageURL = "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "tissue"):
		imageURL = "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "amoxicillin") || strings.Contains(cleanQuery, "azithromycin") || strings.Contains(cleanQuery, "paracetamol") || strings.Contains(cleanQuery, "ibuprofen") || strings.Contains(cleanQuery, "omeprazole") || strings.Contains(cleanQuery, "cetirizine"):
		imageURL = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "vitamin") || strings.Contains(cleanQuery, "supplement"):
		imageURL = "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "blood pressure") || strings.Contains(cleanQuery, "stethoscope") || strings.Contains(cleanQuery, "thermometer") || strings.Contains(cleanQuery, "medical device"):
		imageURL = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "milk") || strings.Contains(cleanQuery, "susu"):
		imageURL = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "tomato") || strings.Contains(cleanQuery, "garlic") || strings.Contains(cleanQuery, "egg") || strings.Contains(cleanQuery, "flour") || strings.Contains(cleanQuery, "sugar") || strings.Contains(cleanQuery, "salt") || strings.Contains(cleanQuery, "butter") || strings.Contains(cleanQuery, "rice") || strings.Contains(cleanQuery, "oil"):
		imageURL = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "nasi goreng") || strings.Contains(cleanQuery, "fried rice"):
		imageURL = "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "kopi") || strings.Contains(cleanQuery, "coffee"):
		imageURL = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
	case strings.Contains(cleanQuery, "tea") || strings.Contains(cleanQuery, "teh"):
		imageURL = "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80"
	}

	return stringPtr(imageURL)
}

func seedPosHardcodedImage(code string) *string {
	pharmaImage := "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80"
	sugarSaltImage := "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=800&q=80"

	imageByCode := map[string]string{
		// POS Goods
		"GDS-WATER-001":  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80",
		"GDS-SNACK-001":  "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80",
		"GDS-TISSUE-001": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80",

		// POS Pharma
		"PHM-AMOX-500":  pharmaImage,
		"PHM-AZIT-500":  pharmaImage,
		"PHM-PARA-500":  pharmaImage,
		"PHM-IBUP-400":  pharmaImage,
		"PHM-VITC-1000": "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80",
		"MED-BPMON-001": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",

		// POS Ingredients
		"ING-MILK-001":   "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
		"ING-TOMATO-001": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
		"ING-GARLIC-001": "https://images.unsplash.com/photo-1615477550927-6ecf9c94bb46?auto=format&fit=crop&w=800&q=80",
		"ING-EGG-001":    "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80",
		"ING-FLOUR-001":  "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=800&q=80",
		"ING-SUGAR-001":  sugarSaltImage,
		// Requested sample ref: https://unsplash.com/photos/a-wooden-bowl-filled-with-sugar-on-top-of-a-wooden-table-u_Mwofs_zu0
		"ING-SALT-001":   sugarSaltImage,
		// Requested sample ref: https://unsplash.com/photos/a-wooden-cutting-board-topped-with-slices-of-bread-w1naEK9-JNg
		"ING-BUTTER-001": "https://images.unsplash.com/photo-1603596310923-dbb12732f9c4?auto=format&fit=crop&w=800&q=80",
		"ING-RICE-001":   "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80",
		"ING-OIL-001":    "https://images.unsplash.com/photo-1604342692518-2f7f3f2f4d77?auto=format&fit=crop&w=800&q=80",

		// POS Recipe menu
		"MENU-NG-001": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
		// Requested sample ref: https://unsplash.com/photos/a-cup-of-coffee-with-a-lid-and-a-label-on-it-jqYEZxU5Sxo
		"MENU-KS-001": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
		"MENU-ET-001": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
	}

	if imageURL, ok := imageByCode[code]; ok {
		return stringPtr(imageURL)
	}

	return seedUnsplashImage(code)
}
