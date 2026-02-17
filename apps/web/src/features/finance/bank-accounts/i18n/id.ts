export const financeBankAccountsId = {
  title: "Rekening Bank",
  description: "Kelola rekening bank yang terhubung ke chart of accounts.",
  search: "Cari rekening bank...",
  fields: {
    name: "Nama",
    accountNumber: "Nomor Rekening",
    accountHolder: "Nama Pemilik",
    currency: "Mata Uang",
    status: "Status",
    coa: "Chart of Account",
  },
  status: {
    active: "Aktif",
    inactive: "Nonaktif",
  },
  actions: {
    create: "Buat",
    edit: "Ubah",
    delete: "Hapus",
  },
  form: {
    createTitle: "Buat Rekening Bank",
    editTitle: "Ubah Rekening Bank",
    submit: "Simpan",
    cancel: "Batal",
  },
  placeholders: {
    select: "Pilih...",
  },
  toast: {
    created: "Rekening bank dibuat",
    updated: "Rekening bank diperbarui",
    deleted: "Rekening bank dihapus",
    failed: "Aksi gagal",
  },
};
