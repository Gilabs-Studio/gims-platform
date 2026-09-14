export type HRTicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending_parts"
  | "resolved"
  | "closed"
  | "rejected";

export type HRTicketPriority = "low" | "medium" | "high" | "urgent";

export type HRTicketCategory =
  | "hr_asset_repair"
  | "hr_asset_replacement"
  | "hr_facility_building"
  | "hr_payroll_admin";

export interface HRTechnician {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  role: string;
  phone?: string;
  active_tickets_count: number;
}

export interface HRTicketReporter {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  email?: string;
  phone?: string;
  location: string;
}

export interface HRTicketActivity {
  id: string;
  ticket_id: string;
  actor_name: string;
  actor_role: "staff" | "technician" | "admin" | "system";
  actor_avatar?: string;
  action: string;
  notes?: string;
  photo_url?: string;
  created_at: string;
}

export interface HRTicket {
  id: string;
  ticket_number: string;
  title: string;
  asset_name?: string;
  asset_code?: string;
  asset_photo?: string;
  category: HRTicketCategory;
  priority: HRTicketPriority;
  status: HRTicketStatus;
  location: string;
  description: string;
  photos: string[];

  reporter: HRTicketReporter;
  assigned_technician?: HRTechnician | null;
  assigned_team?: string;

  target_completion_date?: string;
  resolution_notes?: string;
  resolution_photos?: string[];

  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;

  activities: HRTicketActivity[];
}

export interface HRTicketFilter {
  search?: string;
  category?: HRTicketCategory | "all";
  status?: HRTicketStatus | "all";
  priority?: HRTicketPriority | "all";
  assigned_to_me?: boolean;
}

export interface HRTicketStatistics {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
}
