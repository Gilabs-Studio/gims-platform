package handler

import (
	"net/http"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	posWS "github.com/gilabs/gims/api/internal/pos/infrastructure/ws"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// POSWSHandler upgrades HTTP connections to WebSocket for real-time POS events.
// The staff client must supply ?outlet_id=<uuid> to subscribe to outlet-specific events.
type POSWSHandler struct {
	hub      *posWS.PosHub
	upgrader websocket.Upgrader
}

// NewPOSWSHandler creates a POSWSHandler backed by the given hub.
func NewPOSWSHandler(hub *posWS.PosHub) *POSWSHandler {
	return &POSWSHandler{
		hub: hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

// Subscribe upgrades the connection and subscribes it to the given outlet's POS events.
// Query param: outlet_id (required, uuid)
func (h *POSWSHandler) Subscribe(c *gin.Context) {
	outletID := c.Query("outlet_id")
	if outletID == "" {
		coreErrors.HandleValidationError(c, nil)
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}

	clientID := h.hub.Register(conn, outletID)
	defer h.hub.Unregister(clientID)

	// Block until the client disconnects (reads are ignored — this is server-push only).
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
