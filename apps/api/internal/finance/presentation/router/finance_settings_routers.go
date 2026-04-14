package router

import (
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterFinanceSettingsRoutes(
	group *gin.RouterGroup,
	h *handler.FinanceSettingsHandler,
) {
	_ = group
	_ = h
}
