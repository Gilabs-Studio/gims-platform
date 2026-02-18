export const financeTaxInvoicesId = {
  title: "Faktur Pajak",
  description: "Kelola faktur pajak.",
  search: "Cari faktur pajak...",
  fields: {
    number: "Nomor",
    date: "Tanggal",
    dpp: "DPP",
    vat: "PPN",
    total: "Total",
    notes: "Catatan",
    linkedInvoice: "Link ke Invoice Supplier",
    invoiceValue: "Nilai Invoice",
    discrepancy: "Selisih PPN Terdeteksi!",
  },
  actions: {
    create: "Buat",
    edit: "Ubah",
    delete: "Hapus",
  },
  form: {
    createTitle: "Buat Faktur Pajak",
    editTitle: "Ubah Faktur Pajak",
    submit: "Simpan",
    cancel: "Batal",
  },
  toast: {
    created: "Faktur pajak dibuat",
    updated: "Faktur pajak diperbarui",
    deleted: "Faktur pajak dihapus",
    failed: "Aksi gagal",
  },
};
