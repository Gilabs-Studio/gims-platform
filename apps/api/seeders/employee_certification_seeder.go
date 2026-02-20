package seeders

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
)

// SeedEmployeeCertifications seeds employee certification data
func SeedEmployeeCertifications() error {
	db := database.DB

	fmt.Println("🌱 Seeding employee certifications...")

	// Check if certifications already exist
	var count int64
	db.Model(&models.EmployeeCertification{}).Count(&count)
	if count > 0 {
		fmt.Println("⏭️  Employee certifications already exist, skipping...")
		return nil
	}

	// Get employees
	var employees []orgModels.Employee
	if err := db.Limit(5).Find(&employees).Error; err != nil {
		return fmt.Errorf("failed to fetch employees: %w", err)
	}

	if len(employees) == 0 {
		fmt.Println("⚠️  No employees found, skipping certification seeding...")
		return nil
	}

	// Create certifications
	now := time.Now()
	certifications := []models.EmployeeCertification{
		{
			EmployeeID:        employees[0].ID,
			CertificateName:   "AWS Certified Solutions Architect - Associate",
			IssuedBy:          "Amazon Web Services",
			IssueDate:         now.AddDate(-1, 0, 0),                 // 1 year ago
			ExpiryDate:        &[]time.Time{now.AddDate(2, 0, 0)}[0], // 2 years from now
			CertificateNumber: "AWS-CSA-12345",
			Description:       "Cloud architecture and AWS services certification",
		},
		{
			EmployeeID:        employees[0].ID,
			CertificateName:   "Professional Scrum Master I (PSM I)",
			IssuedBy:          "Scrum.org",
			IssueDate:         now.AddDate(-2, 0, 0), // 2 years ago
			ExpiryDate:        nil,                   // No expiry
			CertificateNumber: "PSM-98765",
			Description:       "Scrum framework and agile practices certification",
		},
		{
			EmployeeID:        employees[1%len(employees)].ID,
			CertificateName:   "Certified Information Systems Security Professional (CISSP)",
			IssuedBy:          "ISC²",
			IssueDate:         now.AddDate(0, -6, 0),                 // 6 months ago
			ExpiryDate:        &[]time.Time{now.AddDate(3, 0, 0)}[0], // 3 years from now
			CertificateNumber: "CISSP-54321",
			Description:       "Information security management certification",
		},
		{
			EmployeeID:        employees[2%len(employees)].ID,
			CertificateName:   "Google Cloud Professional Cloud Architect",
			IssuedBy:          "Google Cloud",
			IssueDate:         now.AddDate(0, 0, -30),                 // 30 days ago
			ExpiryDate:        &[]time.Time{now.AddDate(0, 0, 30)}[0], // 30 days from now (expiring soon!)
			CertificateNumber: "GCP-PCA-11111",
			Description:       "Google Cloud Platform architecture and design certification",
		},
		{
			EmployeeID:        employees[3%len(employees)].ID,
			CertificateName:   "Project Management Professional (PMP)",
			IssuedBy:          "Project Management Institute",
			IssueDate:         now.AddDate(-3, 0, 0),                   // 3 years ago
			ExpiryDate:        &[]time.Time{now.AddDate(0, 0, -10)}[0], // 10 days ago (EXPIRED!)
			CertificateNumber: "PMP-99999",
			Description:       "Project management methodology and leadership certification",
		},
		{
			EmployeeID:        employees[4%len(employees)].ID,
			CertificateName:   "Oracle Certified Java Programmer",
			IssuedBy:          "Oracle Corporation",
			IssueDate:         now.AddDate(-5, 0, 0), // 5 years ago
			ExpiryDate:        nil,                   // No expiry
			CertificateNumber: "OCJP-77777",
			Description:       "Java programming language proficiency certification",
		},
	}

	// Insert certifications
	for _, cert := range certifications {
		if err := db.Create(&cert).Error; err != nil {
			return fmt.Errorf("failed to create certification %s: %w", cert.CertificateName, err)
		}
	}

	fmt.Printf("✅ Successfully seeded %d employee certifications\n", len(certifications))
	return nil
}
