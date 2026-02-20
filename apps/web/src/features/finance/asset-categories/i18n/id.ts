export const financeAssetCategoriesId = {
  title: "Kategori Aset",
  description: "Kelola aturan depresiasi per kategori.",
  search: "Cari kategori...",
  fields: {
    name: "Nama",
    method: "Metode",
    usefulLifeMonths: "Masa manfaat (bulan)",
    depreciationRate: "Tarif depresiasi",
    isActive: "Aktif",
    assetAccount: "Akun aset",
    accumulatedAccount: "Akun akumulasi depresiasi",
    expenseAccount: "Akun beban depresiasi",
  },
  methods: {
    SL: "Garis Lurus",
    DB: "Saldo Menurun",
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
