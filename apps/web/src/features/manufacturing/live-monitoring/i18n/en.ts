export const manufacturingLiveMonitoringEn = {
  title: "Live Monitoring",
  subtitle: "Real-time overview of production floor performance and equipment status",
  autoRefresh: "Auto refresh",
  live: "LIVE",
  updated: "Last Updated",
  fullScreen: "Fullscreen",
  exitFullScreen: "Exit Fullscreen",
  allLines: "All Lines",
  retry: "Retry",
  errorTitle: "Failed to load live monitoring data",
  errorMessage: "An error occurred while fetching real-time monitoring metrics.",
  refresh: "Refresh Data",
  overview: "Overview",

  timeWindows: {
    "15m": "Last 15m",
    "30m": "Last 30m",
    "1h": "Last 1 Hour",
    "shift": "Current Shift",
    "today": "Today",
  },

  tooltips: {
    oeeOverall: "Overall Equipment Effectiveness across all active production lines",
    totalProduction: "Total output pieces produced during the current tracking timeframe",
    targetProduction: "Planned production target units for current schedule",
    runningMachines: "Number of active machines currently in running operating state",
    stoppedMachines: "Number of machines halted due to faults, stops, or alarms",
    activeDowntime: "Current ongoing downtime incidents needing technical attention",
    defectRate: "Defective output percentage relative to total production volume",
    lineStatus: "Live operational status, OEE health, and metrics per production line",
    oeeChart: "Real-time OEE progression and score trends over selected time window",
    availability: "Operational uptime ratio vs planned operating time",
    performance: "Operating speed ratio vs standard theoretical cycle rate",
    quality: "Ratio of good output units vs total produced parts",
    topDowntime: "Major causes and cumulative duration of equipment downtime today",
    alerts: "Real-time system alarms, threshold warnings, and machine faults",
    prodVsTarget: "Progress completion against total scheduled daily production quota",
  },

  kpi: {
    oeeOverall: "OEE Overall",
    totalProduction: "Total Production",
    targetProduction: "Target Production",
    runningMachines: "Running Machines",
    stoppedMachines: "Stopped Machines",
    activeDowntime: "Active Downtime",
    defectRate: "Defect Rate",
    vsYesterday: "vs yesterday",
    achieved: "achieved",
    linesAffected: "lines affected",
    pcsUnit: "Pcs",
  },

  lineStatus: {
    title: "Production Line Status",
    seeAllLines: "View All Lines",
    columns: {
      line: "LINE",
      status: "STATUS",
      oee: "OEE",
      production: "PROD. ACTUAL",
      target: "TARGET",
      downtime: "DOWNTIME",
    },
  },

  statusNames: {
    running: "Running",
    warning: "Warning",
    stop: "Stopped",
    maintenance: "Maintenance",
  },

  oeeChart: {
    title: "Real-time OEE by Line",
    timeWindowLabel: "Time Window",
    oeeScore: "OEE Score",
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
    good: "Good Output",
    defect: "Defect Output",
  },

  topDowntime: {
    title: "Top Downtime (Today)",
    total: "Total Downtime",
  },

  downtimeReasons: {
    changeOver: "Change Over",
    materialReady: "Material Ready",
    machineAdjustment: "Machine Adjustment",
    breakdown: "Equipment Breakdown",
    others: "Other Issues",
  },

  alerts: {
    title: "Alerts & Notifications",
    seeAllAlerts: "View All Alerts",
    activeAlerts: "Active Alarms",
  },

  alertMessages: {
    motorOverload: "Overload detected on primary motor drive",
    tempHigh: "Operating temperature exceeded maximum threshold ({param})",
    currentHigh: "Motor drive current above nominal limit ({param})",
  },

  prodVsTarget: {
    title: "Production vs Target (Today)",
    achieved: "Achieved",
    remainingTarget: "Remaining Target",
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
