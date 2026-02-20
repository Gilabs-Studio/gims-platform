package router

import (
	"github.com/gilabs/gims/api/internal/ai/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterChatRoutes registers AI chat routes
func RegisterChatRoutes(r *gin.RouterGroup, chatHandler *handler.ChatHandler) {
	// Models endpoint (before /chat group for route specificity)
	r.GET("/models", chatHandler.ListModels)

	chat := r.Group("/chat")
	{
		chat.POST("/send", chatHandler.SendMessage)
		chat.POST("/confirm", chatHandler.ConfirmAction)
	}
}
