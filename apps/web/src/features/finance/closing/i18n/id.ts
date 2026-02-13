export const financeClosingId = {
  title: "Tutup Buku",
  description: "Buat dan setujui penutupan periode.",
  fields: {
    periodEndDate: "Akhir periode",
    status: "Status",
    notes: "Catatan",
    approvedAt: "Disetujui pada",
  },
  status: {
    draft: "Draf",
    approved: "Disetujui",
  },
  actions: {
    create: "Buat",
    approve: "Setujui",
  },
  form: {
    createTitle: "Buat Tutup Buku",
    submit: "Simpan",
    cancel: "Batal",
  },
  toast: {
    created: "Tutup buku dibuat",
    approved: "Tutup buku disetujui",
    failed: "Aksi gagal",
  },
};
