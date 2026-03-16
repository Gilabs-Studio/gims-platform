export const financeAssetCategoriesId = {
  title: "Kategori Aset",
  description: "Kelola aturan depresiasi per kategori.",
  search: "Cari kategori...",
  fields: {
    name: "Nama",
    type: "Tipe",
    isDepreciable: "Dapat Didepresiasi",
    method: "Metode",
    usefulLifeMonths: "Masa manfaat (bulan)",
    depreciationRate: "Tarif depresiasi",
    isActive: "Aktif",
    assetAccount: "Akun aset",
    accumulatedAccount: "Akun akumulasi depresiasi",
    expenseAccount: "Akun beban depresiasi",
  },
  types: {
    FIXED: "Aset Tetap",
    CURRENT: "Aset Lancar",
    INTANGIBLE: "Aset Tidak Berwujud",
    OTHER: "Lainnya",
  },
  methods: {
    SL: "Garis Lurus",
    DB: "Saldo Menurun",
    NONE: "Tidak Ada",
  },
  actions: {
    create: "Buat",
    edit: "Ubah",
    delete: "Hapus",
  },
  form: {
    createTitle: "Buat Kategori",
    editTitle: "Ubah Kategori",
    submit: "Simpan",
    cancel: "Batal",
  },
  placeholders: {
    select: "Pilih...",
  },
  toast: {
    created: "Kategori dibuat",
    updated: "Kategori diperbarui",
    deleted: "Kategori dihapus",
    failed: "Aksi gagal",
  },
};
