package utils

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/h2non/filetype"
	"github.com/kolesa-team/go-webp/encoder"
	"github.com/kolesa-team/go-webp/webp"
)

var (
	ErrInvalidFileType   = errors.New("invalid file type")
	ErrFileTooLarge      = errors.New("file too large")
	ErrInvalidImage      = errors.New("invalid image file")
	ErrFileProcessing    = errors.New("error processing file")
)

// AllowedImageTypes defines allowed MIME types for image uploads
var AllowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

// FileUploadConfig holds configuration for file uploads
type FileUploadConfig struct {
	MaxSize   int64  // Maximum file size in bytes
	UploadDir string // Directory to save uploaded files
	BaseURL   string // Base URL for serving files
}

// UploadedFile represents an uploaded file
type UploadedFile struct {
	Filename    string // Generated filename (UUID-based)
	OriginalName string // Original filename from upload
	Path        string // Full path to saved file
	URL         string // Public URL to access file
	Size        int64  // File size in bytes
	MimeType    string // MIME type
}

// ValidateImageFile validates file type, size, and content
func ValidateImageFile(file multipart.File, header *multipart.FileHeader, maxSize int64) error {
	// 1. Check file size
	if header.Size > maxSize {
		return ErrFileTooLarge
	}

	// 2. Read first 512 bytes for magic number detection
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return ErrFileProcessing
	}

	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return ErrFileProcessing
	}

	// 3. Detect file type using magic bytes
	kind, err := filetype.Match(buf[:n])
	if err != nil {
		return ErrInvalidFileType
	}

	// 4. Validate MIME type
	if !AllowedImageTypes[kind.MIME.Value] {
		return ErrInvalidFileType
	}

	// 5. Validate file extension matches MIME type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	expectedExt := "." + kind.Extension
	if ext != expectedExt && !(ext == ".jpg" && expectedExt == ".jpeg") {
		return ErrInvalidFileType
	}

	return nil
}

// ConvertToWebP converts an image to WebP format
func ConvertToWebP(file multipart.File) ([]byte, error) {
	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return nil, ErrInvalidImage
	}

	// Reset file pointer
	if _, err := file.Seek(0, 0); err != nil {
		return nil, ErrFileProcessing
	}

	// Encode to WebP with quality 85
	options, err := encoder.NewLossyEncoderOptions(encoder.PresetDefault, 85)
	if err != nil {
		return nil, ErrFileProcessing
	}

	var buf bytes.Buffer
	if err := webp.Encode(&buf, img, options); err != nil {
		return nil, ErrFileProcessing
	}

	return buf.Bytes(), nil
}

// SaveUploadedFile saves an uploaded file with security best practices
func SaveUploadedFile(file multipart.File, header *multipart.FileHeader, config FileUploadConfig) (*UploadedFile, error) {
	// 1. Validate file
	if err := ValidateImageFile(file, header, config.MaxSize); err != nil {
		return nil, err
	}

	// 2. Convert to WebP
	webpData, err := ConvertToWebP(file)
	if err != nil {
		return nil, err
	}

	// 3. Generate secure filename using UUID
	filename := fmt.Sprintf("%s.webp", uuid.New().String())

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

	// 7. Write file with restricted permissions (no execute)
	if err := os.WriteFile(fullPath, webpData, 0644); err != nil {
		return nil, ErrFileProcessing
	}

	// 8. Build public URL
	url := fmt.Sprintf("%s/%s", strings.TrimSuffix(config.BaseURL, "/"), filename)

	return &UploadedFile{
		Filename:    filename,
		OriginalName: header.Filename,
		Path:        fullPath,
		URL:         url,
		Size:        int64(len(webpData)),
		MimeType:    "image/webp",
	}, nil
}

// DeleteFile safely deletes an uploaded file
func DeleteFile(filename string, uploadDir string) error {
	// Prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		return errors.New("invalid filename")
	}

	fullPath := filepath.Join(uploadDir, filename)

	// Validate path is within upload directory
	absUploadDir, err := filepath.Abs(uploadDir)
	if err != nil {
		return err
	}
	absFilePath, err := filepath.Abs(fullPath)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(absFilePath, absUploadDir) {
		return errors.New("invalid file path")
	}

	return os.Remove(fullPath)
}
