export const manufacturingLiveMonitoringId = {
  title: "Live Monitoring",
  subtitle: "Tinjauan performa lantai produksi dan status mesin secara real-time",
  autoRefresh: "Auto refresh",
  live: "LIVE",
  updated: "Terakhir Diperbarui",
  fullScreen: "Layar Penuh",
  exitFullScreen: "Keluar Layar Penuh",
  allLines: "Semua Line",
  retry: "Coba Lagi",
  errorTitle: "Gagal memuat data live monitoring",
  errorMessage: "Terjadi kesalahan saat mengambil metrik pemantauan langsung.",
  refresh: "Segarkan Data",
  overview: "Ikhtisar",

  timeWindows: {
    "15m": "15 Menit Terakhir",
    "30m": "30 Menit Terakhir",
    "1h": "1 Jam Terakhir",
    "shift": "Shift Ini",
    "today": "Hari Ini",
  },

  tooltips: {
    oeeOverall: "Efektivitas Peralatan Keseluruhan (OEE) di seluruh line produksi aktif",
    totalProduction: "Total unit produk yang dihasilkan selama periode pemantauan ini",
    targetProduction: "Target kuota produksi yang direncanakan untuk jadwal saat ini",
    runningMachines: "Jumlah mesin yang saat ini beroperasi aktif dalam status normal",
    stoppedMachines: "Jumlah mesin yang terhenti akibat kendala, alarm, atau interupsi",
    activeDowntime: "Insiden downtime aktif yang sedang memerlukan penanganan teknis",
    defectRate: "Persentase unit cacat/defect dibandingkan total output produksi",
    lineStatus: "Status operasional, kesehatan OEE, dan performa per line produksi",
    oeeChart: "Tren dan pergerakan skor OEE real-time sepanjang rentang waktu terpilih",
    availability: "Rasio waktu operasi aktual terhadap waktu operasi yang direncanakan",
    performance: "Rasio kecepatan produksi aktual terhadap kapasitas kecepatan ideal",
    quality: "Rasio output produk berkualitas baik terhadap total unit yang dibuat",
    topDowntime: "Penyebab utama dan durasi kumulatif downtime mesin hari ini",
    alerts: "Alarm peringatan sistem, anomali ambang batas, dan kerusakan mesin",
    prodVsTarget: "Progres pencapaian terhadap total kuota target produksi harian",
  },

  kpi: {
    oeeOverall: "OEE Overall",
    totalProduction: "Total Produksi",
    targetProduction: "Target Produksi",
    runningMachines: "Mesin Running",
    stoppedMachines: "Mesin Stop",
    activeDowntime: "Downtime Aktif",
    defectRate: "Defect Rate",
    vsYesterday: "dari kemarin",
    achieved: "tercapai",
    linesAffected: "line terdampak",
    pcsUnit: "Pcs",
  },

  lineStatus: {
    title: "Status Line Produksi",
    seeAllLines: "Lihat Semua Line",
    columns: {
      line: "LINE",
      status: "STATUS",
      oee: "OEE",
      production: "PROD. AKTUAL",
      target: "TARGET",
      downtime: "DOWNTIME",
    },
  },

  statusNames: {
    running: "Running",
    warning: "Warning",
    stop: "Stop",
    maintenance: "Maintenance",
  },

  oeeChart: {
    title: "OEE Real-time Per Line",
    timeWindowLabel: "Rentang Waktu",
    oeeScore: "Skor OEE",
  },

  factors: {
    availability: "Availability",
    performance: "Performance",
    quality: "Quality",
    operating: "Operating",
    plannedDowntime: "Planned Downtime",
    unplannedDowntime: "Unplanned Downtime",
    idealCycle: "Ideal Cycle",
    minorStop: "Minor Stop",
    speedLoss: "Speed Loss",
    good: "Output Baik",
    defect: "Output Defect",
  },

  topDowntime: {
    title: "Top Downtime (Hari Ini)",
    total: "Total Downtime",
  },

  downtimeReasons: {
    changeOver: "Change Over",
    materialReady: "Material Ready",
    machineAdjustment: "Machine Adjustment",
    breakdown: "Kerusakan Mesin",
    others: "Masalah Lainnya",
  },

  alerts: {
    title: "Alert & Notifikasi",
    seeAllAlerts: "Lihat Semua Alert",
    activeAlerts: "Alarm Aktif",
  },

  alertMessages: {
    motorOverload: "Overload terdeteksi pada motor penggerak utama",
    tempHigh: "Suhu operasional melebihi batas maksimum ({param})",
    currentHigh: "Arus listrik motor melebihi batas normal ({param})",
  },

  prodVsTarget: {
    title: "Produksi vs Target (Hari Ini)",
    achieved: "Tercapai",
    remainingTarget: "Sisa Target",
  },

  lines: {
    line1: "Line 1 - Assembly",
    line2: "Line 2 - Machining",
    line3: "Line 3 - Welding",
    line4: "Line 4 - Painting",
    line5: "Line 5 - Packaging",
    line6: "Line 6 - Inspection",
  },
};
