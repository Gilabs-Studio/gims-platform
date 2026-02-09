export const hrdId = {
  hrd: {
    // Common
    title: "SDM",
    description: "Sumber Daya Manusia",

    // Dashboard
    dashboard: {
      totalEmployees: "Total Karyawan",
      presentToday: "Hadir Hari Ini",
      pendingOvertime: "Lembur Pending",
      upcomingHolidays: "Libur Mendatang",
      modules: "Modul SDM",
      recentActivity: "Aktivitas Terbaru",
      noRecentActivity: "Tidak ada aktivitas terbaru",
      stats: {
        todayPresent: "Hadir Hari Ini",
        activeSchedules: "Jadwal Aktif",
        thisYear: "Tahun Ini",
        pendingApproval: "Menunggu Persetujuan",
        pendingRequests: "Permintaan Pending",
        totalActive: "Total Aktif",
      },
    },

    // Modules
    modules: {
      attendance: {
        title: "Absensi",
        description: "Pantau clock in/out dan catatan kehadiran harian",
      },
      workSchedules: {
        title: "Jadwal Kerja",
        description: "Kelola jadwal kerja dan pola shift",
      },
      holidays: {
        title: "Hari Libur",
        description: "Konfigurasi libur perusahaan dan cuti bersama",
      },
      overtime: {
        title: "Lembur",
        description: "Kelola permintaan dan persetujuan lembur",
      },
      leaves: {
        title: "Manajemen Cuti",
        description: "Kelola permintaan dan saldo cuti",
      },
      employees: {
        title: "Karyawan",
        description: "Kelola data dan profil karyawan",
      },
    },

    // Attendance
    attendance: {
      title: "Absensi",
      description: "Kelola catatan kehadiran karyawan",
      clockIn: "Masuk",
      clockOut: "Pulang",
      clockedIn: "Sudah Masuk",
      clockedOut: "Sudah Pulang",
      today: "Absensi Hari Ini",
      notClockedIn: "Belum absen masuk",
      alreadyClockedOut: "Sudah absen pulang",
      myStats: "Statistik Kehadiran Saya",
      monthlyStats: "Statistik Bulanan",
      loading: "Memuat...",
      listView: "Tampilan Daftar",
      calendarView: "Tampilan Kalender",
      noRecords: "Tidak ada catatan kehadiran",
      noRecordsDesc: "Tidak ada catatan kehadiran yang sesuai dengan filter saat ini",

      // Status
      status: {
        present: "Hadir",
        absent: "Tidak Hadir",
        late: "Terlambat",
        early_leave: "Pulang Awal",
        half_day: "Setengah Hari",
        holiday: "Libur",
        leave: "Cuti",
        wfh: "Kerja dari Rumah",
        off_day: "Hari Libur",
        PRESENT: "Hadir",
        ABSENT: "Tidak Hadir",
        LATE: "Terlambat",
        EARLY_LEAVE: "Pulang Awal",
        HALF_DAY: "Setengah Hari",
        HOLIDAY: "Libur",
        LEAVE: "Cuti",
        WFH: "Kerja dari Rumah",
        OFF_DAY: "Hari Libur",
      },

      // Check-in type
      checkInType: {
        normal: "Kantor",
        wfh: "Kerja dari Rumah",
        field_work: "Kerja Lapangan",
        NORMAL: "Kantor",
        WFH: "Kerja dari Rumah",
        FIELD_WORK: "Kerja Lapangan",
      },

      // Fields
      fields: {
        date: "Tanggal",
        checkInTime: "Waktu Masuk",
        checkOutTime: "Waktu Pulang",
        checkIn: "Masuk",
        checkOut: "Pulang",
        checkInType: "Tipe Absen Masuk",
        status: "Status",
        lateMinutes: "Terlambat (menit)",
        workingMinutes: "Waktu Kerja",
        workingHours: "Jam Kerja",
        overtimeMinutes: "Lembur",
        overtimeHours: "Jam Lembur",
        earlyLeaveMinutes: "Pulang Awal (menit)",
        note: "Catatan",
        notes: "Catatan",
        reason: "Alasan",
        employee: "Karyawan",
        employeeName: "Nama Karyawan",
        employeeCode: "Kode Karyawan",
        division: "Divisi",
        location: "Lokasi",
        address: "Alamat",
        isManualEntry: "Input Manual",
        manualEntryReason: "Alasan Input Manual",
      },

      // Form
      form: {
        employeeInfo: "Informasi Karyawan",
        attendanceDetails: "Detail Kehadiran",
        reasonAndNotes: "Alasan & Catatan",
        employee: "Karyawan",
        selectEmployee: "Pilih karyawan",
        date: "Tanggal",
        status: "Status",
        selectStatus: "Pilih status",
        checkInType: "Tipe Absen Masuk",
        selectCheckInType: "Pilih tipe absen masuk",
        checkInTime: "Waktu Masuk",
        checkInTimeDesc: "Waktu karyawan absen masuk",
        checkOutTime: "Waktu Pulang",
        checkOutTimeDesc: "Waktu karyawan absen pulang",
        reason: "Alasan",
        reasonPlaceholder: "Jelaskan alasan input manual ini...",
        reasonDesc: "Opsional untuk input absensi manual",
        notes: "Catatan",
        notesPlaceholder: "Tambahkan catatan tambahan...",
        notesDesc: "Catatan opsional tentang rekaman ini",
        cancel: "Batal",
        submitting: "Mengirim...",
        update: "Perbarui Rekaman",
        create: "Buat Rekaman",
      },

      // Actions
      actions: {
        create: "Tambah Absensi",
        edit: "Ubah Absensi",
        delete: "Hapus Absensi",
        manualEntry: "Input Manual",
        viewDetails: "Lihat Detail",
        search: "Cari karyawan...",
        filterByStatus: "Filter berdasarkan status",
        allStatuses: "Semua Status",
      },

      // Messages
      messages: {
        clockInSuccess: "Berhasil absen masuk",
        clockOutSuccess: "Berhasil absen pulang",
        createSuccess: "Catatan absensi berhasil dibuat",
        updateSuccess: "Catatan absensi berhasil diperbarui",
        deleteSuccess: "Catatan absensi berhasil dihapus",
        deleteConfirm: "Apakah Anda yakin ingin menghapus catatan absensi ini?",
        deleteConfirmDesc: "Tindakan ini tidak dapat dibatalkan. Catatan absensi akan dihapus secara permanen.",
        locationRequired: "Akses lokasi diperlukan untuk absen",
        outsideRadius: "Anda berada di luar radius lokasi yang diizinkan",
        alreadyClockedIn: "Anda sudah absen masuk hari ini",
        notClockedInYet: "Anda belum absen masuk",
      },

      // Detail modal
      detail: {
        title: "Detail Kehadiran",
        description: "Lihat informasi catatan kehadiran",
        employeeInfo: "Informasi Karyawan",
        checkInDetails: "Detail Masuk",
        checkOutDetails: "Detail Pulang",
        workingTime: "Waktu Kerja",
        notesAndInfo: "Catatan & Informasi",
        notRecorded: "Belum tercatat",
        checkInAddress: "Alamat Masuk",
        checkOutAddress: "Alamat Pulang",
        checkInNote: "Catatan Masuk",
        checkOutNote: "Catatan Pulang",
      },

      // Stats
      stats: {
        totalWorkingDays: "Hari Kerja",
        presentDays: "Hadir",
        absentDays: "Tidak Hadir",
        lateDays: "Terlambat",
        leaveDays: "Cuti",
        halfDays: "Setengah Hari",
        totalWorkingHours: "Jam Kerja",
        totalOvertimeHours: "Jam Lembur",
        totalLateMinutes: "Menit Terlambat",
        attendanceRate: "Tingkat Kehadiran",
      },
    },

    // Work Schedule
    workSchedule: {
      title: "Jadwal Kerja",
      description: "Kelola jadwal kerja untuk divisi",
      default: "Jadwal Default",
      setAsDefault: "Jadikan Default",

      fields: {
        name: "Nama",
        description: "Deskripsi",
        startTime: "Waktu Mulai",
        endTime: "Waktu Selesai",
        isFlexible: "Jam Fleksibel",
        flexibleStartTime: "Mulai Fleksibel",
        flexibleEndTime: "Selesai Fleksibel",
        breakStartTime: "Mulai Istirahat",
        breakEndTime: "Selesai Istirahat",
        breakDuration: "Durasi Istirahat (menit)",
        workingDays: "Hari Kerja",
        workingHoursPerDay: "Jam/Hari",
        lateTolerance: "Toleransi Terlambat (menit)",
        earlyLeaveTolerance: "Toleransi Pulang Awal (menit)",
        requireGPS: "Wajib GPS",
        gpsRadius: "Radius GPS (m)",
        officeLatitude: "Latitude Kantor",
        officeLongitude: "Longitude Kantor",
        division: "Divisi",
        isActive: "Aktif",
        isDefault: "Default",
      },

      workingDaysOptions: {
        weekdays: "Senin - Jumat",
        weekdaysSaturday: "Senin - Sabtu",
        everyDay: "Setiap Hari",
      },

      days: {
        mon: "Sen",
        tue: "Sel",
        wed: "Rab",
        thu: "Kam",
        fri: "Jum",
        sat: "Sab",
        sun: "Min",
      },

      actions: {
        create: "Tambah Jadwal Kerja",
        edit: "Ubah Jadwal Kerja",
        delete: "Hapus Jadwal Kerja",
      },

      messages: {
        createSuccess: "Jadwal kerja berhasil dibuat",
        updateSuccess: "Jadwal kerja berhasil diperbarui",
        deleteSuccess: "Jadwal kerja berhasil dihapus",
        setDefaultSuccess: "Jadwal kerja default berhasil diperbarui",
        deleteConfirm: "Apakah Anda yakin ingin menghapus jadwal kerja ini?",
        cannotDeleteDefault: "Tidak dapat menghapus jadwal kerja default",
      },
    },

    // Holiday
    holiday: {
      title: "Hari Libur",
      description: "Kelola hari libur nasional dan cuti bersama",
      calendar: "Kalender Libur",
      importCSV: "Impor dari CSV",
      addBatch: "Tambah Beberapa",

      types: {
        NATIONAL: "Libur Nasional",
        COLLECTIVE: "Cuti Bersama",
        COMPANY: "Libur Perusahaan",
      },

      fields: {
        date: "Tanggal",
        name: "Nama",
        description: "Deskripsi",
        type: "Jenis",
        year: "Tahun",
        isCollectiveLeave: "Cuti Bersama",
        cutsAnnualLeave: "Potong Cuti Tahunan",
        isActive: "Aktif",
      },

      actions: {
        create: "Tambah Hari Libur",
        edit: "Ubah Hari Libur",
        delete: "Hapus Hari Libur",
        import: "Impor",
        export: "Ekspor",
      },

      messages: {
        createSuccess: "Hari libur berhasil dibuat",
        updateSuccess: "Hari libur berhasil diperbarui",
        deleteSuccess: "Hari libur berhasil dihapus",
        importSuccess: "Hari libur berhasil diimpor: {count} entri",
        importPartial: "Impor selesai: {imported} diimpor, {skipped} dilewati",
        deleteConfirm: "Apakah Anda yakin ingin menghapus hari libur ini?",
      },
    },

    // Overtime
    overtime: {
      title: "Lembur",
      description: "Kelola permintaan dan persetujuan lembur",
      myRequests: "Permintaan Lembur Saya",
      pending: "Menunggu Persetujuan",
      summary: "Ringkasan Lembur",

      types: {
        AUTO_DETECTED: "Terdeteksi Otomatis",
        MANUAL_CLAIM: "Klaim Manual",
        PRE_APPROVED: "Disetujui Sebelumnya",
      },

      status: {
        PENDING: "Menunggu",
        APPROVED: "Disetujui",
        REJECTED: "Ditolak",
        CANCELED: "Dibatalkan",
      },

      fields: {
        date: "Tanggal",
        startTime: "Waktu Mulai",
        endTime: "Waktu Selesai",
        requestedMinutes: "Diminta (menit)",
        approvedMinutes: "Disetujui (menit)",
        rateMultiplier: "Rate",
        reason: "Alasan",
        type: "Jenis",
        status: "Status",
        approvedBy: "Disetujui Oleh",
        approvedAt: "Disetujui Pada",
        rejectionReason: "Alasan Penolakan",
        employee: "Karyawan",
      },

      actions: {
        create: "Ajukan Lembur",
        edit: "Ubah Permintaan",
        cancel: "Batalkan Permintaan",
        approve: "Setujui",
        reject: "Tolak",
        viewDetails: "Lihat Detail",
      },

      messages: {
        createSuccess: "Permintaan lembur berhasil diajukan",
        updateSuccess: "Permintaan lembur berhasil diperbarui",
        cancelSuccess: "Permintaan lembur dibatalkan",
        approveSuccess: "Permintaan lembur disetujui",
        rejectSuccess: "Permintaan lembur ditolak",
        cancelConfirm: "Apakah Anda yakin ingin membatalkan permintaan lembur ini?",
        rejectConfirm: "Harap berikan alasan penolakan",
        autoDetectedInfo: "Lembur ini terdeteksi otomatis berdasarkan waktu pulang Anda",
      },

      stats: {
        totalRequested: "Total Diminta",
        totalApproved: "Total Disetujui",
        pendingCount: "Menunggu",
        approvedCount: "Disetujui",
        rejectedCount: "Ditolak",
        autoDetectedCount: "Terdeteksi Otomatis",
        manualClaimCount: "Klaim Manual",
      },
    },
  },
};
