package seeders

import (
	"context"
	"fmt"
	"log"
	"sort"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

var coaDeterministicNamespace = uuid.NewSHA1(uuid.NameSpaceOID, []byte("gims-platform-coa-v1"))

type coaSeed struct {
	Code        string
	Name        string
	Type        models.AccountType
	ParentCode  string
	IsActive    bool
	IsPostable  bool
	IsProtected bool
	Depth       int
}

func deterministicCOAID(code string) string {
	return uuid.NewSHA1(coaDeterministicNamespace, []byte(code)).String()
}

// SeedChartOfAccounts creates the canonical commercial ERP COA hierarchy using X-XXXX format.
func SeedChartOfAccounts() error {
	log.Println("Seeding Chart of Accounts (X-XXXX hierarchy)...")
	db := database.DB
	ctx := context.Background()

	seeds := []coaSeed{
		// Assets
		{Code: "1-0000", Name: "ASET", Type: models.AccountTypeAsset, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "1-1000", Name: "Aset Lancar", Type: models.AccountTypeAsset, ParentCode: "1-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "1-1100", Name: "Kas dan Setara Kas", Type: models.AccountTypeCashBank, ParentCode: "1-1000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-1101", Name: "Kas", Type: models.AccountTypeCashBank, ParentCode: "1-1100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1102", Name: "Kas Kecil", Type: models.AccountTypeCashBank, ParentCode: "1-1100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1110", Name: "Bank", Type: models.AccountTypeCashBank, ParentCode: "1-1100", IsActive: true, IsPostable: false, Depth: 3},
		{Code: "1-1111", Name: "Bank BCA", Type: models.AccountTypeCashBank, ParentCode: "1-1110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "1-1112", Name: "Bank Mandiri", Type: models.AccountTypeCashBank, ParentCode: "1-1110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "1-1113", Name: "Bank BRI", Type: models.AccountTypeCashBank, ParentCode: "1-1110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "1-1200", Name: "Piutang", Type: models.AccountTypeAsset, ParentCode: "1-1000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-1210", Name: "Piutang Usaha (AR)", Type: models.AccountTypeAsset, ParentCode: "1-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1220", Name: "Piutang Lain-lain", Type: models.AccountTypeAsset, ParentCode: "1-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1290", Name: "Penyisihan Piutang Tak Tertagih", Type: models.AccountTypeAsset, ParentCode: "1-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1300", Name: "Persediaan", Type: models.AccountTypeAsset, ParentCode: "1-1000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-1310", Name: "Persediaan Barang Dagangan", Type: models.AccountTypeAsset, ParentCode: "1-1300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1320", Name: "Persediaan Bahan Baku", Type: models.AccountTypeAsset, ParentCode: "1-1300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1330", Name: "Persediaan Barang Dalam Proses", Type: models.AccountTypeAsset, ParentCode: "1-1300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1340", Name: "Persediaan Barang Jadi", Type: models.AccountTypeAsset, ParentCode: "1-1300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1400", Name: "Aset Lancar Lainnya", Type: models.AccountTypeAsset, ParentCode: "1-1000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-1410", Name: "Uang Muka Pembelian", Type: models.AccountTypeAsset, ParentCode: "1-1400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1420", Name: "PPN Masukan", Type: models.AccountTypeAsset, ParentCode: "1-1400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1430", Name: "Biaya Dibayar Dimuka", Type: models.AccountTypeAsset, ParentCode: "1-1400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-1440", Name: "GR/IR Clearing", Type: models.AccountTypeAsset, ParentCode: "1-1400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2000", Name: "Aset Tidak Lancar", Type: models.AccountTypeAsset, ParentCode: "1-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "1-2100", Name: "Investasi Jangka Panjang", Type: models.AccountTypeAsset, ParentCode: "1-2000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-2110", Name: "Investasi Saham", Type: models.AccountTypeAsset, ParentCode: "1-2100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2120", Name: "Investasi Obligasi", Type: models.AccountTypeAsset, ParentCode: "1-2100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2200", Name: "Aset Tetap", Type: models.AccountTypeFixedAsset, ParentCode: "1-2000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-2210", Name: "Tanah", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2220", Name: "Bangunan", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2221", Name: "Akumulasi Penyusutan Bangunan", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2230", Name: "Kendaraan", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2231", Name: "Akumulasi Penyusutan Kendaraan", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2240", Name: "Peralatan dan Mesin", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2241", Name: "Akumulasi Penyusutan Peralatan", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2250", Name: "Inventaris Kantor", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2251", Name: "Akumulasi Penyusutan Inventaris", Type: models.AccountTypeFixedAsset, ParentCode: "1-2200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2300", Name: "Aset Tidak Berwujud", Type: models.AccountTypeAsset, ParentCode: "1-2000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "1-2310", Name: "Hak Paten", Type: models.AccountTypeAsset, ParentCode: "1-2300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2320", Name: "Software", Type: models.AccountTypeAsset, ParentCode: "1-2300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "1-2390", Name: "Akumulasi Amortisasi ATB", Type: models.AccountTypeAsset, ParentCode: "1-2300", IsActive: true, IsPostable: true, Depth: 3},

		// Liabilities
		{Code: "2-0000", Name: "KEWAJIBAN", Type: models.AccountTypeLiability, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "2-1000", Name: "Kewajiban Jangka Pendek", Type: models.AccountTypeLiability, ParentCode: "2-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "2-1100", Name: "Hutang Usaha (AP)", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-1200", Name: "Hutang Pajak", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "2-1210", Name: "Hutang PPN Keluaran", Type: models.AccountTypeLiability, ParentCode: "2-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "2-1220", Name: "Hutang PPh 21", Type: models.AccountTypeLiability, ParentCode: "2-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "2-1230", Name: "Hutang PPh 23", Type: models.AccountTypeLiability, ParentCode: "2-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "2-1240", Name: "Hutang PPh 25", Type: models.AccountTypeLiability, ParentCode: "2-1200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "2-1300", Name: "Hutang Gaji dan Tunjangan", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-1400", Name: "Uang Muka Penjualan", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-1500", Name: "Pendapatan Diterima Dimuka", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-1600", Name: "Hutang Lain-lain", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-1700", Name: "Bagian Lancar Hutang Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "2-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-2000", Name: "Kewajiban Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "2-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "2-2100", Name: "Hutang Bank Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "2-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-2200", Name: "Hutang Obligasi", Type: models.AccountTypeLiability, ParentCode: "2-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "2-2300", Name: "Hutang Sewa Pembiayaan", Type: models.AccountTypeLiability, ParentCode: "2-2000", IsActive: true, IsPostable: true, Depth: 2},

		// Equity
		{Code: "3-0000", Name: "EKUITAS", Type: models.AccountTypeEquity, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "3-1000", Name: "Modal Disetor", Type: models.AccountTypeEquity, ParentCode: "3-0000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "3-2000", Name: "Tambahan Modal Disetor", Type: models.AccountTypeEquity, ParentCode: "3-0000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "3-3000", Name: "Laba Ditahan", Type: models.AccountTypeEquity, ParentCode: "3-0000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "3-4000", Name: "Laba/Rugi Tahun Berjalan", Type: models.AccountTypeEquity, ParentCode: "3-0000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "3-9999", Name: "Saldo Awal Ekuitas", Type: models.AccountTypeEquity, ParentCode: "3-0000", IsActive: true, IsPostable: true, IsProtected: true, Depth: 1},

		// Revenue
		{Code: "4-0000", Name: "PENDAPATAN", Type: models.AccountTypeRevenue, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "4-1000", Name: "Pendapatan Usaha", Type: models.AccountTypeRevenue, ParentCode: "4-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "4-1100", Name: "Penjualan", Type: models.AccountTypeRevenue, ParentCode: "4-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-1200", Name: "Retur Penjualan", Type: models.AccountTypeRevenue, ParentCode: "4-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-1300", Name: "Potongan Penjualan", Type: models.AccountTypeRevenue, ParentCode: "4-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-2000", Name: "Pendapatan Lain-lain", Type: models.AccountTypeRevenue, ParentCode: "4-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "4-2100", Name: "Pendapatan Bunga", Type: models.AccountTypeRevenue, ParentCode: "4-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-2200", Name: "Keuntungan Penjualan Aset", Type: models.AccountTypeRevenue, ParentCode: "4-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-2300", Name: "Pendapatan Lain-lain", Type: models.AccountTypeRevenue, ParentCode: "4-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "4-2400", Name: "Keuntungan Selisih Stok", Type: models.AccountTypeRevenue, ParentCode: "4-2000", IsActive: true, IsPostable: true, Depth: 2},

		// COGS
		{Code: "5-0000", Name: "HARGA POKOK PENJUALAN", Type: models.AccountTypeCOGS, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "5-1000", Name: "Harga Pokok Penjualan (COGS)", Type: models.AccountTypeCOGS, ParentCode: "5-0000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "5-2000", Name: "Penyesuaian Persediaan", Type: models.AccountTypeExpense, ParentCode: "5-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "5-2100", Name: "Kerugian Selisih Stok", Type: models.AccountTypeExpense, ParentCode: "5-2000", IsActive: true, IsPostable: true, Depth: 2},

		// Operational expenses
		{Code: "6-0000", Name: "BEBAN OPERASIONAL", Type: models.AccountTypeOperational, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "6-1000", Name: "Beban Penjualan", Type: models.AccountTypeExpense, ParentCode: "6-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "6-1100", Name: "Beban Gaji Penjualan", Type: models.AccountTypeExpense, ParentCode: "6-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-1200", Name: "Beban Iklan dan Promosi", Type: models.AccountTypeExpense, ParentCode: "6-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-1300", Name: "Beban Pengiriman", Type: models.AccountTypeExpense, ParentCode: "6-1000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2000", Name: "Beban Umum dan Administrasi", Type: models.AccountTypeExpense, ParentCode: "6-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "6-2100", Name: "Beban Gaji", Type: models.AccountTypeSalaryWages, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2110", Name: "Beban Tunjangan", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2200", Name: "Beban Sewa", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2300", Name: "Beban Utilitas", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "6-2310", Name: "Beban Listrik", Type: models.AccountTypeExpense, ParentCode: "6-2300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2320", Name: "Beban Air", Type: models.AccountTypeExpense, ParentCode: "6-2300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2330", Name: "Beban Telepon dan Internet", Type: models.AccountTypeExpense, ParentCode: "6-2300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2400", Name: "Beban Penyusutan", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "6-2410", Name: "Beban Penyusutan Bangunan", Type: models.AccountTypeExpense, ParentCode: "6-2400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2420", Name: "Beban Penyusutan Kendaraan", Type: models.AccountTypeExpense, ParentCode: "6-2400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2430", Name: "Beban Penyusutan Peralatan", Type: models.AccountTypeExpense, ParentCode: "6-2400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2440", Name: "Beban Penyusutan Inventaris", Type: models.AccountTypeExpense, ParentCode: "6-2400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "6-2500", Name: "Beban Pemeliharaan", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2600", Name: "Beban Alat Tulis Kantor", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2700", Name: "Beban Perjalanan Dinas", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2800", Name: "Beban Pajak", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-2900", Name: "Beban Lain-lain Admin", Type: models.AccountTypeExpense, ParentCode: "6-2000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-3000", Name: "Beban Keuangan", Type: models.AccountTypeExpense, ParentCode: "6-0000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "6-3100", Name: "Beban Bunga", Type: models.AccountTypeExpense, ParentCode: "6-3000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-3200", Name: "Beban Administrasi Bank", Type: models.AccountTypeExpense, ParentCode: "6-3000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-3300", Name: "Kerugian Penjualan Aset", Type: models.AccountTypeExpense, ParentCode: "6-3000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "6-3400", Name: "Beban Amortisasi", Type: models.AccountTypeExpense, ParentCode: "6-3000", IsActive: true, IsPostable: true, Depth: 2},
	}

	sort.SliceStable(seeds, func(i, j int) bool {
		if seeds[i].Depth == seeds[j].Depth {
			return seeds[i].Code < seeds[j].Code
		}
		return seeds[i].Depth < seeds[j].Depth
	})

	idByCode := make(map[string]string, len(seeds))

	for i := range seeds {
		seed := seeds[i]
		var parentID *string
		if seed.ParentCode != "" {
			pid, ok := idByCode[seed.ParentCode]
			if !ok {
				return fmt.Errorf("parent account %s not seeded before child %s", seed.ParentCode, seed.Code)
			}
			parentID = &pid
		}

		item := models.ChartOfAccount{
			ID:          deterministicCOAID(seed.Code),
			Code:        seed.Code,
			Name:        seed.Name,
			Type:        seed.Type,
			ParentID:    parentID,
			IsActive:    seed.IsActive,
			IsPostable:  seed.IsPostable,
			IsProtected: seed.IsProtected,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name",
				"type",
				"parent_id",
				"is_active",
				"is_postable",
				"is_protected",
			}),
		}).Create(&item).Error; err != nil {
			return fmt.Errorf("failed to seed COA %s: %w", seed.Code, err)
		}

		var persisted models.ChartOfAccount
		if err := db.Where("code = ?", seed.Code).First(&persisted).Error; err != nil {
			return fmt.Errorf("failed to fetch persisted COA %s: %w", seed.Code, err)
		}
		idByCode[seed.Code] = persisted.ID
	}

	coaRepo := repositories.NewChartOfAccountRepository(db)
	if err := coaRepo.RecalculateAllIsPostable(ctx); err != nil {
		return fmt.Errorf("failed to recalculate is_postable after COA seed: %w", err)
	}

	log.Println("✓ Chart of Accounts seeded successfully with hierarchical parent-child structure")
	return nil
}
