export const assetBudgetId = {
  title: "Budget Aset",
  description:
    "Kelola anggaran pengeluaran modal (CAPEX) untuk pembelian aset.",

  // Status
  status: {
    draft: "Draft",
    active: "Aktif",
    closed: "Ditutup",
    cancelled: "Dibatalkan",
  },

  // Fields
  fields: {
    budgetCode: "Kode Budget",
    budgetName: "Nama Budget",
    description: "Deskripsi",
    fiscalYear: "Tahun Fiskal",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Selesai",
    totalBudget: "Total Budget",
    status: "Status",
    category: "Kategori",
    allocatedAmount: "Jumlah Alokasi",
    usedAmount: "Sudah Terpakai",
    committedAmount: "Terkomitmen",
    availableAmount: "Tersedia",
    notes: "Catatan",
  },

  // Actions
  actions: {
    create: "Buat Budget",
    edit: "Ubah",
    delete: "Hapus",
    activate: "Aktifkan",
    close: "Tutup Budget",
    view: "Lihat Detail",
    addCategory: "Tambah Kategori",
    removeCategory: "Hapus Kategori",
  },

  // Form
  form: {
    createTitle: "Buat Budget Aset Baru",
    editTitle: "Ubah Budget Aset",
    budgetInfo: "Informasi Budget",
    categories: "Kategori Budget",
    summary: "Ringkasan Budget",
    save: "Simpan",
    cancel: "Batal",
  },

  // Summary
  summary: {
    totalAllocated: "Total Alokasi",
    totalUsed: "Total Terpakai",
    totalCommitted: "Total Terkomitmen",
    totalAvailable: "Total Tersedia",
    utilizationRate: "Tingkat Utilisasi",
  },

  // Messages
  messages: {
    noBudgets: "Belum ada budget aset",
    noCategories: "Belum ada kategori budget",
    confirmDelete: "Apakah Anda yakin ingin menghapus budget ini?",
    confirmActivate:
      "Apakah Anda yakin ingin mengaktifkan budget ini? Budget yang aktif tidak dapat diubah.",
    confirmClose:
      "Apakah Anda yakin ingin menutup budget ini? Budget yang ditutup tidak dapat digunakan lagi.",
    insufficientBudget: "Budget tidak mencukupi untuk pembelian ini",
  },

  // Toast
  toast: {
    created: "Budget berhasil dibuat",
    updated: "Budget berhasil diperbarui",
    deleted: "Budget berhasil dihapus",
    statusChanged: "Status budget berhasil diubah",
    error: "Terjadi kesalahan",
  },

  // Placeholders
  placeholders: {
    search: "Cari budget...",
    selectCategory: "Pilih kategori",
    enterAmount: "Masukkan jumlah",
  },

  // Common
  common: {
    create: "Buat",
    back: "Kembali",
    next: "Lanjut",
    saving: "Menyimpan...",
  },
};
