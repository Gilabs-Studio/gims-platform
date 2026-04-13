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

// SeedChartOfAccounts creates the canonical commercial ERP COA hierarchy using 5-digit codes.
func SeedChartOfAccounts() error {
	log.Println("Seeding Chart of Accounts (5-digit hierarchy)...")
	db := database.DB
	ctx := context.Background()

	seeds := []coaSeed{
		// Assets
		{Code: "10000", Name: "ASET", Type: models.AccountTypeAsset, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "11000", Name: "Aset Lancar", Type: models.AccountTypeAsset, ParentCode: "10000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "11100", Name: "Kas dan Setara Kas", Type: models.AccountTypeCashBank, ParentCode: "11000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "11101", Name: "Kas", Type: models.AccountTypeCashBank, ParentCode: "11100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11102", Name: "Kas Kecil", Type: models.AccountTypeCashBank, ParentCode: "11100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11110", Name: "Bank", Type: models.AccountTypeCashBank, ParentCode: "11100", IsActive: true, IsPostable: false, Depth: 3},
		{Code: "11111", Name: "Bank BCA", Type: models.AccountTypeCashBank, ParentCode: "11110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "11112", Name: "Bank Mandiri", Type: models.AccountTypeCashBank, ParentCode: "11110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "11113", Name: "Bank BRI", Type: models.AccountTypeCashBank, ParentCode: "11110", IsActive: true, IsPostable: true, Depth: 4},
		{Code: "11200", Name: "Piutang", Type: models.AccountTypeAsset, ParentCode: "11000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "11210", Name: "Piutang Usaha", Type: models.AccountTypeAsset, ParentCode: "11200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11220", Name: "Piutang Lain-lain", Type: models.AccountTypeAsset, ParentCode: "11200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11290", Name: "Penyisihan Piutang Tak Tertagih", Type: models.AccountTypeAsset, ParentCode: "11200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11300", Name: "Persediaan", Type: models.AccountTypeAsset, ParentCode: "11000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "11310", Name: "Persediaan Barang Dagangan", Type: models.AccountTypeAsset, ParentCode: "11300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11320", Name: "Persediaan Bahan Baku", Type: models.AccountTypeAsset, ParentCode: "11300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11330", Name: "Persediaan Barang Dalam Proses", Type: models.AccountTypeAsset, ParentCode: "11300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11340", Name: "Persediaan Barang Jadi", Type: models.AccountTypeAsset, ParentCode: "11300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11400", Name: "Aset Lancar Lainnya", Type: models.AccountTypeAsset, ParentCode: "11000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "11410", Name: "Uang Muka Pembelian", Type: models.AccountTypeAsset, ParentCode: "11400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11420", Name: "PPN Masukan", Type: models.AccountTypeAsset, ParentCode: "11400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11430", Name: "Biaya Dibayar Dimuka", Type: models.AccountTypeAsset, ParentCode: "11400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "11440", Name: "Persediaan Dalam Perjalanan (GR/IR)", Type: models.AccountTypeAsset, ParentCode: "11400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12000", Name: "Aset Tidak Lancar", Type: models.AccountTypeAsset, ParentCode: "10000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "12100", Name: "Investasi Jangka Panjang", Type: models.AccountTypeAsset, ParentCode: "12000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "12110", Name: "Investasi Saham", Type: models.AccountTypeAsset, ParentCode: "12100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12120", Name: "Investasi Obligasi", Type: models.AccountTypeAsset, ParentCode: "12100", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12200", Name: "Aset Tetap", Type: models.AccountTypeFixedAsset, ParentCode: "12000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "12210", Name: "Tanah", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12220", Name: "Bangunan", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12221", Name: "Akumulasi Penyusutan Bangunan", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12230", Name: "Kendaraan", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12231", Name: "Akumulasi Penyusutan Kendaraan", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12240", Name: "Peralatan dan Mesin", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12241", Name: "Akumulasi Penyusutan Peralatan", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12250", Name: "Inventaris Kantor", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12251", Name: "Akumulasi Penyusutan Inventaris", Type: models.AccountTypeFixedAsset, ParentCode: "12200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12300", Name: "Aset Tidak Berwujud", Type: models.AccountTypeAsset, ParentCode: "12000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "12310", Name: "Hak Paten", Type: models.AccountTypeAsset, ParentCode: "12300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12320", Name: "Software", Type: models.AccountTypeAsset, ParentCode: "12300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "12390", Name: "Akumulasi Amortisasi ATB", Type: models.AccountTypeAsset, ParentCode: "12300", IsActive: true, IsPostable: true, Depth: 3},

		// Liabilities
		{Code: "20000", Name: "KEWAJIBAN", Type: models.AccountTypeLiability, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "21000", Name: "Kewajiban Jangka Pendek", Type: models.AccountTypeLiability, ParentCode: "20000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "21100", Name: "Utang Usaha", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "21200", Name: "Hutang Pajak", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "21210", Name: "Hutang PPN Keluaran", Type: models.AccountTypeLiability, ParentCode: "21200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "21220", Name: "Hutang PPh 21", Type: models.AccountTypeLiability, ParentCode: "21200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "21230", Name: "Hutang PPh 23", Type: models.AccountTypeLiability, ParentCode: "21200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "21240", Name: "Hutang PPh 25", Type: models.AccountTypeLiability, ParentCode: "21200", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "21300", Name: "Hutang Gaji dan Tunjangan", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "21400", Name: "Uang Muka Penjualan", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "21500", Name: "Pendapatan Diterima Dimuka", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "21600", Name: "Hutang Lain-lain", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "21700", Name: "Bagian Lancar Hutang Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "21000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "22000", Name: "Kewajiban Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "20000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "22100", Name: "Hutang Bank Jangka Panjang", Type: models.AccountTypeLiability, ParentCode: "22000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "22200", Name: "Hutang Obligasi", Type: models.AccountTypeLiability, ParentCode: "22000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "22300", Name: "Hutang Sewa Pembiayaan", Type: models.AccountTypeLiability, ParentCode: "22000", IsActive: true, IsPostable: true, Depth: 2},

		// Equity
		{Code: "30000", Name: "EKUITAS", Type: models.AccountTypeEquity, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "31000", Name: "Modal Disetor", Type: models.AccountTypeEquity, ParentCode: "30000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "32000", Name: "Tambahan Modal Disetor", Type: models.AccountTypeEquity, ParentCode: "30000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "33000", Name: "Laba Ditahan", Type: models.AccountTypeEquity, ParentCode: "30000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "34000", Name: "Laba/Rugi Tahun Berjalan", Type: models.AccountTypeEquity, ParentCode: "30000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "39999", Name: "Saldo Awal Ekuitas", Type: models.AccountTypeEquity, ParentCode: "30000", IsActive: true, IsPostable: true, IsProtected: true, Depth: 1},

		// Revenue
		{Code: "40000", Name: "PENDAPATAN", Type: models.AccountTypeRevenue, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "41000", Name: "Pendapatan Usaha", Type: models.AccountTypeRevenue, ParentCode: "40000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "41100", Name: "Penjualan", Type: models.AccountTypeRevenue, ParentCode: "41000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "41200", Name: "Retur Penjualan", Type: models.AccountTypeRevenue, ParentCode: "41000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "41300", Name: "Potongan Penjualan", Type: models.AccountTypeRevenue, ParentCode: "41000", IsActive: true, IsPostable: true, Depth: 2},

		// COGS
		{Code: "50000", Name: "HARGA POKOK PENJUALAN", Type: models.AccountTypeCOGS, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "51000", Name: "Harga Pokok Penjualan", Type: models.AccountTypeCOGS, ParentCode: "50000", IsActive: true, IsPostable: true, Depth: 1},
		{Code: "52000", Name: "Penyesuaian Persediaan", Type: models.AccountTypeExpense, ParentCode: "50000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "52100", Name: "Kerugian Selisih Stok", Type: models.AccountTypeExpense, ParentCode: "52000", IsActive: true, IsPostable: true, Depth: 2},

		// Operational expenses
		{Code: "60000", Name: "BEBAN OPERASIONAL", Type: models.AccountTypeOperational, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "61000", Name: "Beban Penjualan", Type: models.AccountTypeExpense, ParentCode: "60000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "61100", Name: "Beban Gaji Penjualan", Type: models.AccountTypeExpense, ParentCode: "61000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "61200", Name: "Beban Iklan dan Promosi", Type: models.AccountTypeExpense, ParentCode: "61000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "61300", Name: "Beban Pengiriman", Type: models.AccountTypeExpense, ParentCode: "61000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62000", Name: "Beban Umum dan Administrasi", Type: models.AccountTypeExpense, ParentCode: "60000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "62100", Name: "Beban Gaji", Type: models.AccountTypeSalaryWages, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62110", Name: "Beban Tunjangan", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62200", Name: "Beban Sewa", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62300", Name: "Beban Utilitas", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "62310", Name: "Beban Listrik", Type: models.AccountTypeExpense, ParentCode: "62300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62320", Name: "Beban Air", Type: models.AccountTypeExpense, ParentCode: "62300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62330", Name: "Beban Telepon dan Internet", Type: models.AccountTypeExpense, ParentCode: "62300", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62400", Name: "Beban Penyusutan", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: false, Depth: 2},
		{Code: "62410", Name: "Beban Penyusutan Bangunan", Type: models.AccountTypeExpense, ParentCode: "62400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62420", Name: "Beban Penyusutan Kendaraan", Type: models.AccountTypeExpense, ParentCode: "62400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62430", Name: "Beban Penyusutan Peralatan", Type: models.AccountTypeExpense, ParentCode: "62400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62440", Name: "Beban Penyusutan Inventaris", Type: models.AccountTypeExpense, ParentCode: "62400", IsActive: true, IsPostable: true, Depth: 3},
		{Code: "62500", Name: "Beban Pemeliharaan", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62600", Name: "Beban Alat Tulis Kantor", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62700", Name: "Beban Perjalanan Dinas", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62800", Name: "Beban Pajak", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "62900", Name: "Beban Lain-lain Admin", Type: models.AccountTypeExpense, ParentCode: "62000", IsActive: true, IsPostable: true, Depth: 2},

		// Other income (non-operational)
		{Code: "70000", Name: "PENDAPATAN LAIN-LAIN", Type: models.AccountTypeRevenue, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "71000", Name: "Pendapatan Keuangan dan Non-Operasional", Type: models.AccountTypeRevenue, ParentCode: "70000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "71100", Name: "Pendapatan Bunga", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "71200", Name: "Keuntungan Penjualan Aset Tetap", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "71300", Name: "Keuntungan Selisih Persediaan", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "71400", Name: "Keuntungan Selisih Kurs", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "71500", Name: "Pendapatan Pembalikan Penyusutan", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "71900", Name: "Pendapatan Lain-lain", Type: models.AccountTypeRevenue, ParentCode: "71000", IsActive: true, IsPostable: true, Depth: 2},

		// Other expenses (non-operational)
		{Code: "80000", Name: "BEBAN LAIN-LAIN", Type: models.AccountTypeExpense, IsActive: true, IsPostable: false, Depth: 0},
		{Code: "81000", Name: "Beban Keuangan dan Non-Operasional", Type: models.AccountTypeExpense, ParentCode: "80000", IsActive: true, IsPostable: false, Depth: 1},
		{Code: "81100", Name: "Beban Bunga", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "81200", Name: "Beban Administrasi Bank", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "81300", Name: "Kerugian Penjualan Aset Tetap", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "81400", Name: "Beban Amortisasi", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "81500", Name: "Kerugian Selisih Kurs", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
		{Code: "81900", Name: "Beban Lain-lain", Type: models.AccountTypeExpense, ParentCode: "81000", IsActive: true, IsPostable: true, Depth: 2},
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

	log.Println("Chart of Accounts seeded successfully with hierarchical parent-child structure")
	return nil
}



