package utils

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/h2non/filetype"
)

// SaveSignatureFile saves a signature image file preserving original format (PNG/JPG)
func SaveSignatureFile(file multipart.File, header *multipart.FileHeader, config FileUploadConfig) (*UploadedFile, error) {
	// 1. Validate file type and size
	if err := ValidateImageFile(file, header, config.MaxSize); err != nil {
		return nil, err
	}

	// 2. Detect file type for extension
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return nil, ErrFileProcessing
	}

	// Reset file pointer
	if _, err := file.Seek(0, 0); err != nil {
		return nil, ErrFileProcessing
	}

	kind, err := filetype.Match(buf[:n])
	if err != nil {
		return nil, ErrInvalidFileType
	}

	// 3. Generate filename based on config
	// If OriginalName is provided, use it (e.g., "John Doe signature.jpg")
	// Otherwise use UUID-based filename
	var filename string
	var originalFilename string
	if config.OriginalName != "" {
		filename = fmt.Sprintf("%s.%s", sanitizeFilenameBase(config.OriginalName), kind.Extension)
		originalFilename = filename
	} else {
		filename = fmt.Sprintf("%s.%s", uuid.New().String(), kind.Extension)
		originalFilename = header.Filename
	}

	// 4. Ensure upload directory exists
	if err := os.MkdirAll(config.UploadDir, 0755); err != nil {
		return nil, ErrFileProcessing
	}

	// 5. Create full path (prevent directory traversal)
	fullPath := filepath.Join(config.UploadDir, filename)

	// 6. Validate path is within upload directory (security check)
	absUploadDir, err := filepath.Abs(config.UploadDir)
	if err != nil {
		return nil, ErrFileProcessing
	}
	absFilePath, err := filepath.Abs(fullPath)
	if err != nil {
		return nil, ErrFileProcessing
	}
	if !strings.HasPrefix(absFilePath, absUploadDir) {
		return nil, errors.New("invalid file path")
	}

	// 7. Read full file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		return nil, ErrFileProcessing
	}

	// 8. Write file with restricted permissions (no execute)
	if err := os.WriteFile(fullPath, fileContent, 0644); err != nil {
		return nil, ErrFileProcessing
	}

	// 9. Build public URL
	url := fmt.Sprintf("%s/%s", strings.TrimSuffix(config.BaseURL, "/"), filename)

	return &UploadedFile{
		Filename:     filename,
		OriginalName: originalFilename,
		Path:         fullPath,
		URL:          url,
		Size:         int64(len(fileContent)),
		MimeType:     kind.MIME.Value,
	}, nil
}
