export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending_parts"
  | "resolved"
  | "closed"
  | "rejected";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "it_hardware"
  | "it_software"
  | "facility_ac"
  | "facility_plumbing"
  | "facility_electrical"
  | "general_maintenance";

export interface Technician {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  role: string;
  phone?: string;
  active_tickets_count: number;
}

export interface TicketReporter {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  email?: string;
  phone?: string;
  location: string;
}

export interface TicketActivity {
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

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  location: string;
  description: string;
  photos: string[];
  
  reporter: TicketReporter;
  assigned_technician?: Technician | null;
  assigned_team?: string;
  
  target_completion_date?: string;
  resolution_notes?: string;
  resolution_photos?: string[];
  
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;

  activities: TicketActivity[];
}

export interface TicketFilter {
  search?: string;
  category?: TicketCategory | "all";
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  assigned_to_me?: boolean;
}

export interface TicketStatistics {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
}
