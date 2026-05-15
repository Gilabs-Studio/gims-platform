export const financeSettingsId = {
  title: "Pengaturan Finance",
  description: "Kelola konfigurasi finance dan pemetaan akun.",
  loading: "Memuat...",
  loadFailed: "Gagal memuat pengaturan finance.",
  required: "Wajib diisi",
  customKey: "Kunci Kustom",
  missingRequired: "Masih ada {count} pemetaan wajib yang belum diisi.",
  selectAccount: "Pilih akun",
  notMapped: "Belum dipetakan",
  noMatchingAccount: "Tidak ada akun yang cocok",
  allowedTypes: "Tipe yang diperbolehkan",
  selectedTypeMismatch: "Tipe akun yang dipilih {type} tidak diperbolehkan.",
  viewOnly: "Hanya lihat",
  saving: "Menyimpan...",
  save: "Simpan",
  dynamicDescription: "Pengaturan finance kustom",
  requiredValue: "Silakan pilih pemetaan akun.",
  inventory: {
    title: "Pengaturan Penilaian Persediaan",
    fields: {
      company: "Perusahaan",
      valuationMethod: "Metode Penilaian",
    },
    placeholders: {
      selectCompany: "Pilih perusahaan",
      selectValuationMethod: "Pilih metode penilaian",
    },
    status: {
      loading: "Memuat pengaturan...",
      currentLockStatus: "Status penguncian saat ini: {status}",
      locked: "Terkunci",
      unlocked: "Tidak terkunci",
    },
    notices: {
      roundingManaged:
        "Akun penyesuaian pembulatan dikelola di Pemetaan Akuntansi, bukan di Pengaturan Persediaan. Gunakan halaman Pemetaan Akuntansi untuk mengatur akun terkait penyesuaian persediaan.",
      locked:
        "Pengaturan persediaan terkunci karena transaksi persediaan sudah ada. Metode penilaian tidak dapat diubah lagi.",
    },
    actions: {
      refresh: "Muat Ulang",
      save: "Simpan Pengaturan",
    },
    valuationOptions: {
      averageCost: {
        label: "Rata-rata Biaya",
        description: "Metode moving average tertimbang (dibutuhkan oleh pengaturan finance saat ini)",
      },
      fifo: {
        label: "FIFO",
        description: "First In First Out",
      },
      specificIdentification: {
        label: "Identifikasi Spesifik",
        description: "Biaya spesifik per item",
      },
    },
  },
  openingBalance: {
    title: "Saldo Awal",
    fields: {
      company: "Perusahaan",
      fiscalYear: "Tahun Buku",
      account: "Akun",
    },
    placeholders: {
      selectCompany: "Pilih perusahaan",
      selectFiscalYear: "Pilih tahun buku",
      selectAccount: "Pilih akun",
    },
    summary: {
      title: "Saldo Awal Sekali Pakai",
      description: "Buat saldo awal satu kali per perusahaan dan tahun buku.",
      postedJournal: "Jurnal diposting",
    },
    actions: {
      create: "Buat Saldo Awal",
    },
    wizard: {
      title: "Wizard Saldo Awal",
      stepLabel: "Langkah {step} dari 2 - {title}",
      inputLine: "Input line",
      summarySimulation: "Ringkasan & simulasi",
      account: "Akun",
      debit: "Debit",
      credit: "Kredit",
      description: "Deskripsi",
      action: "Aksi",
      addLine: "Tambah Baris",
      draftSaved: "Draft disimpan saat Anda menekan Next",
      difference: "Selisih {amount}",
      runningSimulation: "Menjalankan simulasi...",
      totalDebit: "Total Debit: {amount}",
      totalCredit: "Total Credit: {amount}",
      valuationStatus: "Status Valuasi: {status}",
      recommendation: "Rekomendasi: {value}",
      pending: "PENDING",
      remove: "Hapus",
      cancel: "Batal",
      next: "Next",
      back: "Kembali",
      close: "Tutup",
      unknown: "Tidak dikenal",
    },
  },
  tax: {
    title: "Konfigurasi Pajak",
    fields: {
      company: "Perusahaan",
      taxCode: "Kode Pajak",
      taxName: "Nama Pajak",
      taxType: "Jenis Pajak",
      rate: "Tarif (%)",
      account: "Akun CoA",
    },
    placeholders: {
      selectCompany: "Pilih perusahaan",
      selectTaxType: "Pilih jenis pajak",
      selectAccount: "Pilih akun",
    },
    types: {
      vat: "PPN",
      incomeTax: "PPh",
      withholdingTax: "Withholding Tax",
    },
    actions: {
      save: "Simpan Pajak",
    },
    status: {
      loading: "Memuat...",
    },
    list: {
      title: "Daftar Pajak",
      loading: "Memuat...",
      code: "Kode",
      name: "Nama",
      type: "Jenis",
      rate: "Tarif",
      status: "Status",
      actions: "Aksi",
      active: "Aktif",
      inactive: "Nonaktif",
      activate: "Aktifkan",
      deactivate: "Nonaktifkan",
      defaultTaxName: "Pajak Pertambahan Nilai 11%",
    },
  },
  fiscalYears: {
    company: "Perusahaan",
    name: "Nama Tahun Buku",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Selesai",
    defaultCompanyApplied: "Perusahaan default diterapkan",
    loadingCompanies: "Memuat perusahaan...",
    selectCompanyPrompt: "Pilih perusahaan untuk mengelola tahun buku.",
    createFiscalYear: "Buat Tahun Buku",
    fiscalYearList: "Daftar Tahun Buku",
    fiscalYearListDescription: "Kelola status dan siklus hidup tahun buku.",
    fiscalYear: "Tahun Buku",
    period: "Periode",
    status: "Status",
    actions: "Aksi",
    loadingFiscalYears: "Memuat tahun buku...",
    noFiscalYearsFound: "Tidak ada tahun buku.",
    confirmDeleteFiscalYear: "Hapus tahun buku {name}?",
    periodNote: "Periode tahun buku",
    activate: "Aktifkan",
    lock: "Kunci",
    delete: "Hapus",
    statusValues: {
      draft: "Draft",
      active: "Aktif",
      locked: "Terkunci",
    },
  },
  mappingLabels: {
    sales: {
      accounts_receivable: {
        label: "Piutang Usaha Penjualan",
        description: "Akun piutang usaha untuk posting faktur penjualan",
      },
      revenue: {
        label: "Pendapatan Penjualan",
        description: "Akun pendapatan untuk pengakuan penjualan",
      },
      tax_output: {
        label: "PPN Keluaran Penjualan",
        description: "Akun utang pajak keluaran untuk PPN penjualan",
      },
      cogs: {
        label: "HPP Penjualan",
        description: "Akun harga pokok penjualan untuk pengeluaran persediaan",
      },
      sales_return: {
        label: "Retur Penjualan",
        description: "Akun retur/kontra untuk posting retur penjualan",
      },
      advance: {
        label: "Uang Muka Penjualan",
        description: "Akun liabilitas uang muka pelanggan untuk posting down payment",
      },
      inventory_asset: {
        label: "Aset Persediaan Penjualan",
        description: "Akun aset persediaan yang dipakai saat mutasi HPP penjualan",
      },
    },
    coa: {
      sales_receivable: {
        label: "Piutang Penjualan",
        description: "Akun piutang usaha untuk faktur pelanggan",
      },
      sales_advance: {
        label: "Uang Muka Penjualan",
        description: "Akun liabilitas uang muka pelanggan untuk posting down payment",
      },
      sales_revenue: {
        label: "Pendapatan Penjualan",
        description: "Akun pendapatan untuk pengakuan penjualan",
      },
      sales_vat_out: {
        label: "PPN Keluaran Penjualan",
        description: "Akun utang pajak keluaran untuk PPN penjualan",
      },
      sales_cogs: {
        label: "HPP Penjualan",
        description: "Akun harga pokok penjualan untuk pengeluaran persediaan",
      },
      sales_inventory: {
        label: "Persediaan Penjualan",
        description: "Akun aset persediaan yang dipakai saat mutasi HPP penjualan",
      },
      sales_return: {
        label: "Retur Penjualan",
        description: "Akun retur/kontra untuk posting retur penjualan",
      },
      purchase_payable: {
        label: "Hutang Pembelian",
        description: "Akun hutang usaha untuk faktur supplier",
      },
      accounts_payable: {
        label: "Hutang Usaha",
        description: "Akun hutang usaha untuk faktur supplier",
      },
      purchase_advance: {
        label: "Uang Muka Pembelian",
        description: "Akun aset uang muka supplier untuk posting down payment",
      },
      purchase_advances: {
        label: "Uang Muka Pembelian",
        description: "Akun aset uang muka supplier untuk posting down payment",
      },
      gr_ir: {
        label: "GR/IR",
        description: "Akun clearing GR/IR untuk penerimaan barang dan faktur supplier",
      },
      purchase_gr_ir: {
        label: "GR/IR Pembelian",
        description: "Akun clearing GR/IR untuk penerimaan barang dan faktur supplier",
      },
      purchase_vat_in: {
        label: "PPN Masukan Pembelian",
        description: "Akun pajak masukan untuk PPN pembelian",
      },
      purchase_price_diff: {
        label: "Selisih Harga Pembelian",
        description: "Akun selisih harga pembelian",
      },
      vat_in: {
        label: "PPN Masukan",
        description: "Akun pajak masukan untuk PPN pembelian",
      },
      purchase_expense: {
        label: "Beban Pembelian",
        description: "Akun beban pembelian tambahan (pengiriman dan biaya lain)",
      },
      purchase_return: {
        label: "Retur Pembelian",
        description: "Akun kontra/beban untuk posting retur pembelian",
      },
      inventory: {
        label: "Persediaan",
        description: "Akun aset persediaan inti untuk mutasi stok",
      },
      inventory_asset: {
        label: "Aset Persediaan",
        description: "Akun aset persediaan inti untuk mutasi stok",
      },
      inventory_gain: {
        label: "Keuntungan Persediaan",
        description: "Akun keuntungan untuk penyesuaian stok positif",
      },
      inventory_loss: {
        label: "Kerugian Persediaan",
        description: "Akun beban untuk penyesuaian stok negatif",
      },
      inventory_revaluation_reserve: {
        label: "Cadangan Revaluasi Persediaan",
        description: "Akun cadangan ekuitas untuk keuntungan revaluasi persediaan",
      },
      cogs: {
        label: "HPP",
        description: "Akun harga pokok penjualan untuk pengeluaran persediaan",
      },
      sales_receivable_dp: {
        label: "Uang Muka Pelanggan",
        description: "Akun liabilitas uang muka pelanggan untuk down payment",
      },
      purchase_payable_dp: {
        label: "Uang Muka Supplier",
        description: "Akun liabilitas uang muka supplier untuk down payment",
      },
    },
    purchase: {
      inventory_asset: {
        label: "Aset Persediaan Pembelian",
        description: "Akun aset persediaan yang dipakai saat posting penerimaan barang",
      },
      gr_ir_clearing: {
        label: "Clearing GR/IR Pembelian",
        description: "Akun clearing GR/IR untuk penerimaan barang dan faktur supplier",
      },
      tax_input: {
        label: "PPN Masukan Pembelian",
        description: "Akun pajak masukan untuk PPN pembelian",
      },
      accounts_payable: {
        label: "Hutang Usaha Pembelian",
        description: "Akun hutang usaha untuk faktur supplier",
      },
      advance: {
        label: "Uang Muka Pembelian",
        description: "Akun aset uang muka supplier untuk posting down payment",
      },
      purchase_return: {
        label: "Retur Pembelian",
        description: "Akun kontra/beban untuk posting retur pembelian",
      },
      expense: {
        label: "Beban Pembelian",
        description: "Akun beban pembelian tambahan (pengiriman dan biaya lain)",
      },
    },
    inventory: {
      inventory_asset: {
        label: "Aset Persediaan",
        description: "Akun aset persediaan inti untuk mutasi stok",
      },
      adjustment_gain: {
        label: "Keuntungan Penyesuaian Persediaan",
        description: "Akun keuntungan untuk penyesuaian stok positif",
      },
      adjustment_loss: {
        label: "Kerugian Penyesuaian Persediaan",
        description: "Akun beban untuk penyesuaian stok negatif",
      },
      revaluation_reserve: {
        label: "Cadangan Revaluasi Persediaan",
        description: "Akun cadangan ekuitas untuk keuntungan revaluasi persediaan",
      },
    },
    asset: {
      accumulated_depreciation: {
        label: "Akumulasi Penyusutan",
        description: "Akun kontra aset untuk akumulasi penyusutan",
      },
      depreciation_expense: {
        label: "Beban Penyusutan",
        description: "Akun beban untuk penyusutan periodik",
      },
    },
    finance: {
      opening_balance_equity: {
        label: "Ekuitas Saldo Awal",
        description: "Akun ekuitas untuk posting saldo awal",
      },
      bank_default: {
        label: "Akun Bank Default",
        description: "Akun kas bank default",
      },
      cash_default: {
        label: "Akun Kas Default",
        description: "Akun kas tangan default",
      },
    },
    payroll: {
      salary_expense: {
        label: "Beban Gaji Payroll",
        description: "Akun beban gaji payroll",
      },
      allowance_expense: {
        label: "Beban Tunjangan Payroll",
        description: "Akun beban tunjangan payroll",
      },
      payable_salary: {
        label: "Hutang Gaji Payroll",
        description: "Akun liabilitas hutang gaji payroll",
      },
      tax_pph21: {
        label: "Pajak PPh21 Payroll",
        description: "Akun hutang pajak PPh21 payroll",
      },
    },
  },
};