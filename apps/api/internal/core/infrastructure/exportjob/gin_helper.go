package exportjob

import (
	"context"
	"net/http"
	"strings"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gin-gonic/gin"
)

func IsAsyncRequested(c *gin.Context) bool {
	flag := strings.TrimSpace(strings.ToLower(c.Query("async")))
	return flag == "1" || flag == "true" || flag == "yes"
}

func QueueIfRequested(c *gin.Context, generator Generator) bool {
	return QueueIfRequestedWithProgress(c, func(ctx context.Context, setProgress func(int)) (*GeneratedFile, error) {
		setProgress(15)
		file, err := generator(ctx)
		if err == nil {
			setProgress(95)
		}
		return file, err
	})
}

type ProgressGenerator func(ctx context.Context, setProgress func(int)) (*GeneratedFile, error)

func QueueIfRequestedWithProgress(c *gin.Context, generator ProgressGenerator) bool {
	if !IsAsyncRequested(c) {
		return false
	}

	userID := ""
	if value, ok := c.Get("user_id"); ok {
		if id, ok := value.(string); ok {
			userID = id
		}
	}

	var jobID string
	job := DefaultManager.Enqueue(userID, func(ctx context.Context) (*GeneratedFile, error) {
		setProgress := func(progress int) {
			if jobID == "" {
				return
			}
			DefaultManager.SetProgress(jobID, progress)
		}
		return generator(ctx, setProgress)
	})
	jobID = job.ID
	response.SuccessResponseAccepted(c, job, nil)
	return true
}

func WriteSyncFile(c *gin.Context, file *GeneratedFile) {
	c.Header("Content-Type", file.ContentType)
	c.Header("Content-Disposition", "attachment; filename=\""+file.FileName+"\"")
	c.Data(http.StatusOK, file.ContentType, file.Bytes)
}
