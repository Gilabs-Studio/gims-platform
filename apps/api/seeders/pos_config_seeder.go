package seeders

import (
	"errors"
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"gorm.io/gorm"
)

const posReceiptWhatsAppTemplateSeed = `Hi #customer_name 👋,

Terima kasih telah bertransaksi di #outlet_name.

🧾 Detail Pesanan:
• No. Order : #order_number  
• Tanggal   : #order_date  
• Item      : #items_summary  

💰 Rincian Pembayaran:
• Subtotal  : #subtotal  
• Diskon    : #discount_amount  
• Pajak     : #tax_amount  
• Service   : #service_amount  
• Total     : #total_amount  
• Dibayar   : #tender_amount  
• Kembalian : #change_amount  

Pesanan Anda sudah siap 🙌  
Silakan datang untuk mengambil atau menunggu pengantaran.

Terima kasih atas kepercayaan Anda 🙏`

// SeedPOSConfigs ensures every outlet has a POS config and a seeded WhatsApp template.
func SeedPOSConfigs() error {
	log.Println("Seeding POS config defaults...")

	var outlets []orgModels.Outlet
	if err := database.DB.Where("deleted_at IS NULL AND is_active = ?", true).Find(&outlets).Error; err != nil {
		return err
	}

	for _, outlet := range outlets {
		if err := seedPOSConfigForOutlet(outlet); err != nil {
			return err
		}
	}

	log.Println("POS config defaults seeded successfully")
	return nil
}

func seedPOSConfigForOutlet(outlet orgModels.Outlet) error {
	if strings.TrimSpace(outlet.ID) == "" {
		return nil
	}

	var cfg posModels.POSConfig
	err := database.DB.Where("outlet_id = ?", outlet.ID).First(&cfg).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		cfg = posModels.POSConfig{
			TenantID:                outlet.TenantID,
			OutletID:                outlet.ID,
			TaxRate:                 0.11,
			ServiceChargeRate:       0,
			AllowDiscount:           true,
			MaxDiscountPercent:      100,
			PrintReceiptAuto:        false,
			ReceiptWhatsAppTemplate: stringPtr(posReceiptWhatsAppTemplateSeed),
			Currency:                "IDR",
		}
		return database.DB.Create(&cfg).Error
	}

	return ensureReceiptWhatsAppTemplateSeed(&cfg, outlet.TenantID)
}

func ensureReceiptWhatsAppTemplateSeed(cfg *posModels.POSConfig, tenantID string) error {
	if cfg == nil {
		return nil
	}
	if cfg.ReceiptWhatsAppTemplate != nil && strings.TrimSpace(*cfg.ReceiptWhatsAppTemplate) != "" {
		return nil
	}

	cfg.ReceiptWhatsAppTemplate = stringPtr(posReceiptWhatsAppTemplateSeed)
	if tenantID != "" {
		cfg.TenantID = tenantID
	}

	updates := map[string]interface{}{
		"tenant_id":                 cfg.TenantID,
		"receipt_whatsapp_template": cfg.ReceiptWhatsAppTemplate,
	}
	return database.DB.Model(cfg).Updates(updates).Error
}
