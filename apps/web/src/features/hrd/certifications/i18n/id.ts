export const certificationId = {
  certification: {
    // Meta tags
    meta: {
      title: "Sertifikasi Karyawan",
      description: "Kelola sertifikasi profesional karyawan dan pelacakan masa berlaku",
    },

    title: "Sertifikasi Karyawan",
    subtitle: "Kelola sertifikasi profesional karyawan dan pelacakan masa berlaku",
    add: "Tambah Sertifikasi",
    edit: "Edit Sertifikasi",
    // detail: "Detail Sertifikasi",
    search: "Cari berdasarkan nama sertifikat atau penerbit...",
    delete_confirm_title: "Hapus Sertifikasi",
    delete_confirm_description:
      "Apakah Anda yakin ingin menghapus sertifikasi ini? Tindakan ini tidak dapat dibatalkan.",
    search_placeholder: "Cari berdasarkan nama sertifikat atau penerbit...",
    filter_by_employee: "Filter berdasarkan Karyawan",
    all_employees: "Semua Karyawan",
    filters: {
      all_status: "Semua Status",
    },
    expiring_soon: "Segera Berakhir",
    expired: "Kadaluarsa",
    valid: "Valid",
    no_expiry: "Tidak Ada Masa Berlaku",

    // Kolom tabel
    columns: {
      employee: "Karyawan",
      certificate_name: "Nama Sertifikat",
      issued_by: "Diterbitkan Oleh",
      issue_date: "Tanggal Terbit",
      expiry_date: "Tanggal Kadaluarsa",
      status: "Status",
      certificate_number: "Nomor Sertifikat",
      days_remaining: "Hari Tersisa",
      actions: "Aksi",
    },

    // Label field (alias untuk kolom)
    field: {
      employee: "Karyawan",
      certificate_name: "Nama Sertifikat",
      issued_by: "Diterbitkan Oleh",
      issue_date: "Tanggal Terbit",
      expiry_date: "Tanggal Kadaluarsa",
      status: "Status",
      certificate_number: "Nomor Sertifikat",
      certificate_file: "File Sertifikat",
      description: "Deskripsi",
      employee_code: "Kode Karyawan",
      employee_name: "Nama Karyawan",
      created_at: "Dibuat Pada",
      updated_at: "Terakhir Diperbarui",
    },

    // Label umum
    common: {
      status: "Status",
      loading: "Memuat...",
      certification: "Sertifikasi",
      view: "Lihat",
      edit: "Edit",
      delete: "Hapus",
      cancel: "Batal",
      create: "Buat",
      update: "Perbarui",
      saving: "Menyimpan...",
      error: "Terjadi kesalahan",
    },

    // Pesan sukses (toast)
    success: {
      created: "Sertifikasi berhasil dibuat",
      updated: "Sertifikasi berhasil diperbarui",
    },

    // Pesan error (toast)
    error: {
      create: "Gagal membuat sertifikasi",
      update: "Gagal memperbarui sertifikasi",
    },

    // Pesan hari tersisa
    days_remaining: "{days} hari tersisa",
    expired_days_ago: "Kadaluarsa {days} hari yang lalu",

    // Modal detail
    detail: {
      title: "Detail Sertifikasi",
      description: "Lihat informasi lengkap tentang sertifikasi ini",
      employee_info: "Informasi Karyawan",
      certification_info: "Detail Sertifikasi",
    },

    // Aksi
    action: {
      download_certificate: "Unduh Sertifikat",
    },

    // Konfirmasi hapus
    delete: {
      title: "Hapus Sertifikasi",
      confirm_message:
        "Apakah Anda yakin ingin menghapus sertifikasi ini? Tindakan ini tidak dapat dibatalkan.",
    },

    // Label form
    form: {
      create_title: "Buat Sertifikasi",
      edit_title: "Edit Sertifikasi",
      select_employee: "Pilih karyawan",
      pick_date: "Pilih tanggal",
      employee_label: "Karyawan",
      employee_placeholder: "Pilih karyawan",
      certificate_name_label: "Nama Sertifikat",
      certificate_name_placeholder:
        "contoh: AWS Certified Solutions Architect",
      issued_by_label: "Diterbitkan Oleh",
      issued_by_placeholder: "contoh: Amazon Web Services",
      issue_date_label: "Tanggal Terbit",
      expiry_date_label: "Tanggal Kadaluarsa (Opsional)",
      expiry_date_help:
        "Biarkan kosong jika sertifikasi tidak memiliki masa berlaku",
      expiry_date_description:
        "Biarkan kosong jika sertifikasi tidak memiliki masa berlaku",
      certificate_number_label: "Nomor Sertifikat (Opsional)",
      certificate_number_placeholder: "contoh: AWS-CSA-12345",
      certificate_file_label: "File Sertifikat (Opsional)",
      certificate_file_placeholder: "Masukkan path atau URL file sertifikat",
      certificate_file_description: "Opsional: Path atau URL ke dokumen sertifikat",
      description_label: "Deskripsi (Opsional)",
      description_placeholder: "Catatan tambahan atau detail sertifikasi...",
      submit_create: "Buat Sertifikasi",
      submit_update: "Perbarui Sertifikasi",
      cancel: "Batal",
    },

    // Tampilan detail
    detail_view: {
      employee_info: "Informasi Karyawan",
      employee_code: "Kode Karyawan",
      employee_name: "Nama",
      certification_info: "Detail Sertifikasi",
      certificate_name: "Nama Sertifikat",
      issued_by: "Diterbitkan Oleh",
      issue_date: "Tanggal Terbit",
      expiry_date: "Tanggal Kadaluarsa",
      never_expires: "Tidak Pernah Kadaluarsa",
      certificate_number: "Nomor Sertifikat",
      status: "Status",
      days_until_expiry: "Hari Hingga Kadaluarsa",
      days_remaining: "{{count}} hari tersisa",
      expired_days_ago: "Kadaluarsa {{count}} hari yang lalu",
      additional_info: "Informasi Tambahan",
      description: "Deskripsi",
      no_description: "Tidak ada deskripsi",
      certificate_file: "File Sertifikat",
      download_certificate: "Unduh Sertifikat",
      created_at: "Dibuat Pada",
      updated_at: "Terakhir Diperbarui",
      actions: "Aksi",
      edit_button: "Edit",
      delete_button: "Hapus",
      back_to_list: "Kembali ke Daftar",
      view_profile: "Lihat profil",
    },

    // Badge status
    status: {
      expired: "Kadaluarsa",
      expiring_soon: "Segera Berakhir",
      valid: "Valid",
      no_expiry: "Tidak Ada Masa Berlaku",
    },

    // Status kosong
    empty: {
      no_certifications: "Tidak ada sertifikasi ditemukan",
      no_certifications_description:
        "Mulai dengan menambahkan sertifikasi karyawan pertama Anda.",
      no_results: "Tidak ada hasil ditemukan",
      no_results_description:
        "Coba sesuaikan pencarian atau kriteria filter Anda.",
    },

    // Pesan validasi
    validation: {
      invalid_employee: "Silakan pilih karyawan yang valid",
      certificate_name_required: "Nama sertifikat wajib diisi",
      certificate_name_max: "Nama sertifikat maksimal 200 karakter",
      issued_by_required: "Organisasi penerbit wajib diisi",
      issued_by_max: "Organisasi penerbit maksimal 200 karakter",
      issue_date_required: "Tanggal terbit wajib diisi",
      expiry_after_issue:
        "Tanggal kadaluarsa harus setelah tanggal terbit",
      certificate_number_max: "Nomor sertifikat maksimal 100 karakter",
      description_max: "Deskripsi maksimal 1000 karakter",
    },

    // Pesan toast
    toast: {
      create_success: "Sertifikasi berhasil dibuat",
      create_error: "Gagal membuat sertifikasi",
      update_success: "Sertifikasi berhasil diperbarui",
      update_error: "Gagal memperbarui sertifikasi",
      delete_success: "Sertifikasi berhasil dihapus",
      delete_error: "Gagal menghapus sertifikasi",
    },

    // Alert/Dashboard
    alert: {
      expiring_title: "Sertifikasi Segera Berakhir",
      expiring_description:
        "Sertifikasi berikut akan berakhir dalam 30 hari",
      expired_title: "Sertifikasi Kadaluarsa",
      expired_description: "Sertifikasi berikut sudah kadaluarsa",
      view_all: "Lihat Semua",
    },
  },
};
