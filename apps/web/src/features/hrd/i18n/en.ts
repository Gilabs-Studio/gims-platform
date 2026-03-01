export const hrdEn = {
  hrd: {
    // Common
    title: "HRD",
    description: "Human Resource Development",

    // Dashboard
    dashboard: {
      totalEmployees: "Total Employees",
      presentToday: "Present Today",
      pendingOvertime: "Pending Overtime",
      upcomingHolidays: "Upcoming Holidays",
      modules: "HRD Modules",
      recentActivity: "Recent Activity",
      noRecentActivity: "No recent activity to display",
      stats: {
        todayPresent: "Present Today",
        activeSchedules: "Active Schedules",
        thisYear: "This Year",
        pendingApproval: "Pending Approval",
        pendingRequests: "Pending Requests",
        totalActive: "Total Active",
      },
    },

    // Modules
    modules: {
      attendance: {
        title: "Attendance",
        description: "Track daily clock in/out and attendance records",
      },
      workSchedules: {
        title: "Work Schedules",
        description: "Manage work schedules and shift patterns",
      },
      holidays: {
        title: "Holidays",
        description: "Configure company holidays and collective leaves",
      },
      overtime: {
        title: "Overtime",
        description: "Manage overtime requests and approvals",
      },
      leaves: {
        title: "Leave Management",
        description: "Handle leave requests and balances",
      },
      employees: {
        title: "Employees",
        description: "Manage employee data and profiles",
      },
    },

    // Attendance
    attendance: {
      title: "Attendance",
      description: "Manage employee attendance records",
      historyTitle: "Attendance History",
      historySubtitle: "View your attendance calendar and leave requests",
      historyAction: "Attendance History",
      requestLeaveAction: "Request Leave",
      calendarTab: "Calendar",
      leaveTab: "Leave Request",
      clockIn: "Clock In",
      clockOut: "Clock Out",
      clockedIn: "Clocked In",
      clockedOut: "Clocked Out",
      today: "Today's Attendance",
      notClockedIn: "Not clocked in yet",
      alreadyClockedOut: "Already clocked out",
      holiday: "Holiday",
      offDay: "Day Off",
      myStats: "My Attendance Statistics",
      monthlyStats: "Monthly Statistics",
      loading: "Loading...",
      listView: "List View",
      calendarView: "Calendar View",
      noRecords: "No attendance records found",
      noRecordsDesc: "No attendance records match the current filters",

      // Status
      status: {
        present: "Present",
        absent: "Absent",
        late: "Late",
        early_leave: "Early Leave",
        half_day: "Half Day",
        holiday: "Holiday",
        leave: "On Leave",
        wfh: "Work From Home",
        off_day: "Off Day",
        PRESENT: "Present",
        ABSENT: "Absent",
        LATE: "Late",
        EARLY_LEAVE: "Early Leave",
        HALF_DAY: "Half Day",
        HOLIDAY: "Holiday",
        LEAVE: "On Leave",
        WFH: "Work From Home",
        OFF_DAY: "Off Day",
      },

      // Check-in type
      checkInType: {
        normal: "Office",
        wfh: "Work From Home",
        field_work: "Field Work",
        NORMAL: "Office",
        WFH: "Work From Home",
        FIELD_WORK: "Field Work",
      },

      // Fields
      fields: {
        date: "Date",
        checkInTime: "Check In Time",
        checkOutTime: "Check Out Time",
        checkIn: "Check In",
        checkOut: "Check Out",
        checkInType: "Check-In Type",
        status: "Status",
        lateMinutes: "Late (minutes)",
        workingMinutes: "Working Time",
        workingHours: "Working Hours",
        overtimeMinutes: "Overtime",
        overtimeHours: "Overtime Hours",
        earlyLeaveMinutes: "Early Leave (min)",
        note: "Note",
        notes: "Notes",
        reason: "Reason",
        employee: "Employee",
        employeeName: "Employee Name",
        employeeCode: "Employee Code",
        division: "Division",
        location: "Location",
        address: "Address",
        isManualEntry: "Manual Entry",
        manualEntryReason: "Manual Entry Reason",
      },

      // Form
      form: {
        employeeInfo: "Employee Information",
        attendanceDetails: "Attendance Details",
        reasonAndNotes: "Reason & Notes",
        employee: "Employee",
        selectEmployee: "Select employee",
        date: "Date",
        status: "Status",
        selectStatus: "Select status",
        checkInType: "Check-In Type",
        selectCheckInType: "Select check-in type",
        checkInTime: "Check In Time",
        checkInTimeDesc: "Time when employee checked in",
        checkOutTime: "Check Out Time",
        checkOutTimeDesc: "Time when employee checked out",
        reason: "Reason",
        reasonPlaceholder: "Explain the reason for this manual entry...",
        reasonDesc: "Optional reason for manual attendance entries",
        notes: "Notes",
        notesPlaceholder: "Add any additional notes...",
        notesDesc: "Optional notes about this record",
        cancel: "Cancel",
        submitting: "Submitting...",
        update: "Update Record",
        create: "Create Record",
        holidayWarningTitle: "Holiday Date Selected",
        holidayWarningDesc:
          "The selected date ({date}) is a holiday: {name}. Are you sure you want to create an attendance record on this date?",
        holidayWarningDescWithType:
          "The selected date ({date}) is a holiday: {name} ({type}). Are you sure you want to create an attendance record on this date?",
      },

      // Actions
      actions: {
        create: "Add Attendance",
        edit: "Edit Attendance",
        delete: "Delete Attendance",
        manualEntry: "Manual Entry",
        viewDetails: "View Details",
        search: "Search employees...",
        filterByStatus: "Filter by status",
        allStatuses: "All Statuses",
      },

      // Messages
      messages: {
        clockInSuccess: "Successfully clocked in",
        clockOutSuccess: "Successfully clocked out",
        createSuccess: "Attendance record created successfully",
        updateSuccess: "Attendance record updated successfully",
        deleteSuccess: "Attendance record deleted successfully",
        deleteConfirm: "Are you sure you want to delete this attendance record?",
        deleteConfirmDesc: "This action cannot be undone. The attendance record will be permanently removed.",
        locationRequired: "Location access is required for clock in/out",
        outsideRadius: "You are outside the allowed location radius",
        alreadyClockedIn: "You have already clocked in today",
        notClockedInYet: "You haven't clocked in yet",
      },

      // Detail modal
      detail: {
        title: "Attendance Details",
        description: "View attendance record information",
        employeeInfo: "Employee Information",
        checkInDetails: "Check-In Details",
        checkOutDetails: "Check-Out Details",
        workingTime: "Working Time",
        notesAndInfo: "Notes & Information",
        notRecorded: "Not recorded",
        checkInAddress: "Check-In Address",
        checkOutAddress: "Check-Out Address",
        checkInNote: "Check-In Note",
        checkOutNote: "Check-Out Note",
      },

      // Stats
      stats: {
        totalWorkingDays: "Working Days",
        presentDays: "Present",
        absentDays: "Absent",
        lateDays: "Late",
        leaveDays: "Leave",
        halfDays: "Half Day",
        totalWorkingHours: "Working Hours",
        totalOvertimeHours: "Overtime Hours",
        totalLateMinutes: "Late Minutes",
        attendanceRate: "Attendance Rate",
      },
    },

    // Work Schedule
    workSchedule: {
      title: "Work Schedule",
      description: "Manage work schedules for divisions",
      default: "Default Schedule",
      setAsDefault: "Set as Default",

      fields: {
        name: "Name",
        description: "Description",
        startTime: "Start Time",
        endTime: "End Time",
        isFlexible: "Flexible Hours",
        flexibleStartTime: "Flexible Start",
        flexibleEndTime: "Flexible End",
        breakStartTime: "Break Start",
        breakEndTime: "Break End",
        breakDuration: "Break Duration (min)",
        workingDays: "Working Days",
        workingHoursPerDay: "Hours/Day",
        lateTolerance: "Late Tolerance (min)",
        earlyLeaveTolerance: "Early Leave Tolerance (min)",
        requireGPS: "Require GPS",
        gpsRadius: "GPS Radius (m)",
        officeLatitude: "Office Latitude",
        officeLongitude: "Office Longitude",
        division: "Division",
        officeLocation: "Office Location",
        coordinates: "Coordinates",
        isActive: "Active",
        isDefault: "Default",
      },

      workingDaysOptions: {
        weekdays: "Monday - Friday",
        weekdaysSaturday: "Monday - Saturday",
        everyDay: "Every Day",
      },

      sections: {
        workHours: "Work Hours",
        breakTime: "Break Time",
        workingDays: "Working Days",
        tolerance: "Tolerance",
        gpsSettings: "GPS Settings",
        assignment: "Assignment",
      },

      descriptions: {
        flexible: "Enable flexible working hours with a range of allowed start and end times",
        gps: "Require employees to clock in/out within the specified GPS radius of the office",
        division: "Assign this schedule to a specific division, or leave empty for a general schedule",
        officeLocation: "Select a company to use its GPS coordinates for attendance verification",
      },

      placeholders: {
        selectDivision: "Select division",
        allDivisions: "All Divisions (General)",
        selectCompany: "Select company location",
        manualCoordinates: "Enter coordinates manually",
      },

      days: {
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        sun: "Sun",
        Mon: "Mon",
        Tue: "Tue",
        Wed: "Wed",
        Thu: "Thu",
        Fri: "Fri",
        Sat: "Sat",
        Sun: "Sun",
      },

      actions: {
        create: "Add Work Schedule",
        edit: "Edit Work Schedule",
        delete: "Delete Work Schedule",
      },

      messages: {
        createSuccess: "Work schedule created successfully",
        updateSuccess: "Work schedule updated successfully",
        deleteSuccess: "Work schedule deleted successfully",
        setDefaultSuccess: "Default work schedule updated",
        deleteConfirm: "Are you sure you want to delete this work schedule?",
        cannotDeleteDefault: "Cannot delete the default work schedule",
      },
    },

    // Holiday
    holiday: {
      title: "Holidays",
      description: "Manage national holidays and collective leave",
      calendar: "Holiday Calendar",
      importCSV: "Import from CSV",
      addBatch: "Add Multiple",

      types: {
        NATIONAL: "National Holiday",
        COLLECTIVE: "Collective Leave",
        COMPANY: "Company Holiday",
      },

      fields: {
        date: "Date",
        name: "Name",
        description: "Description",
        type: "Type",
        year: "Year",
        isCollectiveLeave: "Collective Leave",
        cutsAnnualLeave: "Cuts Annual Leave",
        isActive: "Active",
      },

      actions: {
        create: "Add Holiday",
        edit: "Edit Holiday",
        delete: "Delete Holiday",
        import: "Import",
        export: "Export",
      },

      messages: {
        createSuccess: "Holiday created successfully",
        updateSuccess: "Holiday updated successfully",
        deleteSuccess: "Holiday deleted successfully",
        importSuccess: "Holidays imported successfully: {count} entries",
        importPartial: "Import completed: {imported} imported, {skipped} skipped",
        deleteConfirm: "Are you sure you want to delete this holiday?",
      },
    },

    // Overtime
    overtime: {
      title: "Overtime",
      description: "Manage overtime requests and approvals",
      myRequests: "My Overtime Requests",
      pending: "Pending Approval",
      summary: "Overtime Summary",

      types: {
        AUTO_DETECTED: "Auto-detected",
        MANUAL_CLAIM: "Manual Claim",
        PRE_APPROVED: "Pre-approved",
      },

      status: {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        CANCELED: "Canceled",
      },

      fields: {
        date: "Date",
        startTime: "Start Time",
        endTime: "End Time",
        requestedMinutes: "Requested (min)",
        approvedMinutes: "Approved (min)",
        rateMultiplier: "Rate",
        reason: "Reason",
        type: "Type",
        status: "Status",
        approvedBy: "Approved By",
        approvedAt: "Approved At",
        rejectionReason: "Rejection Reason",
        employee: "Employee",
      },

      actions: {
        create: "Request Overtime",
        edit: "Edit Request",
        cancel: "Cancel Request",
        approve: "Approve",
        reject: "Reject",
        viewDetails: "View Details",
      },

      messages: {
        createSuccess: "Overtime request submitted successfully",
        updateSuccess: "Overtime request updated successfully",
        cancelSuccess: "Overtime request canceled",
        approveSuccess: "Overtime request approved",
        rejectSuccess: "Overtime request rejected",
        cancelConfirm: "Are you sure you want to cancel this overtime request?",
        rejectConfirm: "Please provide a reason for rejection",
        autoDetectedInfo: "This overtime was automatically detected based on your clock out time",
      },

      stats: {
        totalRequested: "Total Requested",
        totalApproved: "Total Approved",
        pendingCount: "Pending",
        approvedCount: "Approved",
        rejectedCount: "Rejected",
        autoDetectedCount: "Auto-detected",
        manualClaimCount: "Manual Claims",
      },
    },
  },
};
