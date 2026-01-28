// Holiday Types - Sprint 13 HRD Attendance Module

export type HolidayType = "NATIONAL" | "COLLECTIVE" | "COMPANY";

export interface Holiday {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  readonly description?: string;
  readonly type: HolidayType;
  readonly type_display: string;
  readonly year: number;
  readonly is_collective_leave: boolean;
  readonly cuts_annual_leave: boolean;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateHolidayRequest {
  readonly date: string;
  readonly name: string;
  readonly description?: string;
  readonly type: HolidayType;
  readonly is_collective_leave?: boolean;
  readonly cuts_annual_leave?: boolean;
}

export type UpdateHolidayRequest = Partial<CreateHolidayRequest>;

export interface ImportHolidaysRequest {
  readonly file: File;
  readonly year: number;
}

export interface HolidayCSVRow {
  readonly date: string;
  readonly name: string;
  readonly type?: HolidayType;
  readonly is_collective_leave?: boolean;
  readonly cuts_annual_leave?: boolean;
}

export interface HolidayCalendarDay {
  readonly date: string;
  readonly is_holiday: boolean;
  readonly is_weekend: boolean;
  readonly is_working_day: boolean;
  readonly holiday?: Holiday;
}

export interface HolidayCalendar {
  readonly year: number;
  readonly months: readonly {
    readonly month: number;
    readonly name: string;
    readonly days: readonly HolidayCalendarDay[];
  }[];
  readonly total_holidays: number;
  readonly total_collective_leave: number;
}

export interface HolidayListResponse {
  readonly success: boolean;
  readonly data: readonly Holiday[];
  readonly meta?: {
    readonly pagination: {
      readonly page: number;
      readonly per_page: number;
      readonly total: number;
      readonly total_pages: number;
    };
  };
}

export interface HolidayResponse {
  readonly success: boolean;
  readonly data: Holiday;
}

export interface HolidayCalendarResponse {
  readonly success: boolean;
  readonly data: HolidayCalendar;
}

export interface CheckHolidayResponse {
  readonly success: boolean;
  readonly data: {
    readonly is_holiday: boolean;
    readonly holiday?: Holiday;
  };
}

export interface ImportHolidaysResponse {
  readonly success: boolean;
  readonly data: {
    readonly imported: number;
    readonly skipped: number;
    readonly errors: readonly string[];
  };
}

export interface DeleteResponse {
  readonly success: boolean;
  readonly message: string;
}
