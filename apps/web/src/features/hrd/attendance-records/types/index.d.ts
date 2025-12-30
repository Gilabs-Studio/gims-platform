export interface AttendanceRecord {
  readonly id: number;
  readonly employee: {
    readonly id: number;
    readonly name: string;
  };
  readonly date: string;
  readonly check_in_time: string | null;
  readonly check_out_time: string | null;
  readonly status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE" | "HALF_DAY";
  readonly note: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AttendanceRecordListResponse {
  readonly data: readonly AttendanceRecord[];
  readonly meta: {
    readonly pagination: {
      readonly page: number;
      readonly limit: number;
      readonly total: number;
    };
    readonly filter: {
      readonly start_date: string;
      readonly end_date: string;
      readonly note: string;
    };
    readonly search: {
      readonly search: string;
      readonly search_by: string;
    };
    readonly searchable_columns: {
      readonly string_columns: readonly string[];
      readonly numeric_columns: readonly string[];
    };
    readonly sort: {
      readonly sort_by: string;
      readonly sort_order: string;
    };
    readonly sortable_columns: {
      readonly available_fields: readonly string[];
    };
  };
}

export interface AttendanceRecordResponse {
  readonly data: AttendanceRecord;
  readonly message?: string;
}

export interface AttendanceRecordStatsResponse {
  readonly data: {
    readonly total: number;
  };
  readonly message: string;
}

export interface AttendanceRecordReportResponse {
  readonly data: {
    readonly employees: readonly {
      readonly id: number;
      readonly name: string;
    }[];
  };
}

export interface DeleteAttendanceRecordResponse {
  readonly message: string;
}

export interface CalendarEvent {
  readonly id: number;
  readonly employeeId: number;
  readonly employeeName: string;
  readonly date: Date;
  readonly checkInTime: string | null;
  readonly checkOutTime: string | null;
  readonly status: AttendanceRecord["status"];
  readonly note: string;
}
