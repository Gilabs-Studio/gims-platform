package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

// UploadImage handles image upload requests
func (h *UploadHandler) UploadImage(c *gin.Context) {
	// 1. Get file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		errors.ErrorResponse(c, "INVALID_REQUEST", map[string]interface{}{
			"field": "file",
			"error": "file is required",
		}, nil)
		return
	}
	defer file.Close()

	// 2. Prepare upload config
	uploadConfig := utils.FileUploadConfig{
		MaxSize:   config.AppConfig.Storage.MaxUploadSize,
		UploadDir: config.AppConfig.Storage.UploadDir,
		BaseURL:   config.AppConfig.Storage.BaseURL,
	}

	// 3. Save and process file
	uploadedFile, err := utils.SaveUploadedFile(file, header, uploadConfig)
	if err != nil {
		switch err {
		case utils.ErrInvalidFileType:
			errors.ErrorResponse(c, "INVALID_FILE_TYPE", map[string]interface{}{
				"allowed_types": []string{"image/jpeg", "image/png", "image/gif", "image/webp"},
			}, nil)
		case utils.ErrFileTooLarge:
			errors.ErrorResponse(c, "FILE_TOO_LARGE", map[string]interface{}{
				"max_size": config.AppConfig.Storage.MaxUploadSize,
			}, nil)
		case utils.ErrInvalidImage:
			errors.ErrorResponse(c, "INVALID_IMAGE", map[string]interface{}{
				"error": "corrupted or invalid image file",
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, "failed to process upload")
		}
		return
	}

	// 4. Return success response
	resp := map[string]interface{}{
		"filename":      uploadedFile.Filename,
		"original_name": uploadedFile.OriginalName,
		"url":           uploadedFile.URL,
		"size":          uploadedFile.Size,
		"mime_type":     uploadedFile.MimeType,
	}

	response.SuccessResponseCreated(c, resp, nil)
}

// UploadDocument handles document upload requests (PDF, DOCX, XLS, etc.)
func (h *UploadHandler) UploadDocument(c *gin.Context) {
	// 1. Get file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		errors.ErrorResponse(c, "INVALID_REQUEST", map[string]interface{}{
			"field": "file",
			"error": "file is required",
		}, nil)
		return
	}
	defer file.Close()

	// 2. Prepare upload config
	uploadConfig := utils.FileUploadConfig{
		MaxSize:   config.AppConfig.Storage.MaxUploadSize,
		UploadDir: config.AppConfig.Storage.UploadDir,
		BaseURL:   config.AppConfig.Storage.BaseURL,
	}

	// 3. Save document file
	uploadedFile, err := utils.SaveDocumentFile(file, header, uploadConfig)
	if err != nil {
		switch err {
		case utils.ErrInvalidFileType:
			errors.ErrorResponse(c, "INVALID_FILE_TYPE", map[string]interface{}{
				"allowed_types": []string{"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
			}, nil)
		case utils.ErrFileTooLarge:
			errors.ErrorResponse(c, "FILE_TOO_LARGE", map[string]interface{}{
				"max_size": config.AppConfig.Storage.MaxUploadSize,
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, "failed to process upload")
		}
		return
	}

	// 4. Return success response
	resp := map[string]interface{}{
		"filename":      uploadedFile.Filename,
		"original_name": uploadedFile.OriginalName,
		"url":           uploadedFile.URL,
		"size":          uploadedFile.Size,
		"mime_type":     uploadedFile.MimeType,
	}

	response.SuccessResponseCreated(c, resp, nil)
}
