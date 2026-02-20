package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
)

// ToEmployeeCertificationResponse converts model to response DTO
func ToEmployeeCertificationResponse(certification *models.EmployeeCertification) *dto.EmployeeCertificationResponse {
	if certification == nil {
		return nil
	}

	response := &dto.EmployeeCertificationResponse{
		ID:                certification.ID,
		EmployeeID:        certification.EmployeeID,
		CertificateName:   certification.CertificateName,
		IssuedBy:          certification.IssuedBy,
		IssueDate:         certification.IssueDate.Format("2006-01-02"),
		CertificateFile:   certification.CertificateFile,
		CertificateNumber: certification.CertificateNumber,
		Description:       certification.Description,
		IsExpired:         certification.IsExpired(),
		DaysUntilExpiry:   certification.DaysUntilExpiry(),
		CreatedAt:         &certification.CreatedAt,
		UpdatedAt:         &certification.UpdatedAt,
	}

	if certification.ExpiryDate != nil {
		expiryDateStr := certification.ExpiryDate.Format("2006-01-02")
		response.ExpiryDate = &expiryDateStr
	}

	return response
}

// ToEmployeeCertificationResponses converts slice of models to slice of response DTOs
func ToEmployeeCertificationResponses(certifications []*models.EmployeeCertification) []*dto.EmployeeCertificationResponse {
	responses := make([]*dto.EmployeeCertificationResponse, 0, len(certifications))
	for _, certification := range certifications {
		responses = append(responses, ToEmployeeCertificationResponse(certification))
	}
	return responses
}

// ToEmployeeCertificationModel converts create request DTO to model
func ToEmployeeCertificationModel(req *dto.CreateEmployeeCertificationRequest, createdBy string) (*models.EmployeeCertification, error) {
	issueDate, err := time.Parse("2006-01-02", req.IssueDate)
	if err != nil {
		return nil, err
	}

	certification := &models.EmployeeCertification{
		EmployeeID:        req.EmployeeID,
		CertificateName:   req.CertificateName,
		IssuedBy:          req.IssuedBy,
		IssueDate:         issueDate,
		CertificateFile:   req.CertificateFile,
		CertificateNumber: req.CertificateNumber,
		Description:       req.Description,
		CreatedBy:         createdBy,
		UpdatedBy:         createdBy,
	}

	if req.ExpiryDate != nil && *req.ExpiryDate != "" {
		expiryDate, err := time.Parse("2006-01-02", *req.ExpiryDate)
		if err != nil {
			return nil, err
		}
		certification.ExpiryDate = &expiryDate
	}

	return certification, nil
}

// UpdateEmployeeCertificationModel updates model from update request DTO
func UpdateEmployeeCertificationModel(certification *models.EmployeeCertification, req *dto.UpdateEmployeeCertificationRequest, updatedBy string) error {
	if req.CertificateName != "" {
		certification.CertificateName = req.CertificateName
	}
	if req.IssuedBy != "" {
		certification.IssuedBy = req.IssuedBy
	}
	if req.IssueDate != "" {
		issueDate, err := time.Parse("2006-01-02", req.IssueDate)
		if err != nil {
			return err
		}
		certification.IssueDate = issueDate
	}
	if req.ExpiryDate != nil {
		if *req.ExpiryDate == "" {
			certification.ExpiryDate = nil
		} else {
			expiryDate, err := time.Parse("2006-01-02", *req.ExpiryDate)
			if err != nil {
				return err
			}
			certification.ExpiryDate = &expiryDate
		}
	}
	if req.CertificateFile != "" {
		certification.CertificateFile = req.CertificateFile
	}
	if req.CertificateNumber != "" {
		certification.CertificateNumber = req.CertificateNumber
	}
	if req.Description != "" {
		certification.Description = req.Description
	}

	certification.UpdatedBy = updatedBy
	return nil
}
