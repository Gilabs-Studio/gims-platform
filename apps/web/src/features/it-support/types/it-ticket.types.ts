export type ITTicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending_parts"
  | "resolved"
  | "closed";

export type ITTicketPriority = "low" | "medium" | "high" | "urgent";

export type ITTicketCategory =
  | "it_hardware"
  | "it_software"
  | "it_network"
  | "it_account";

export interface ITTechnician {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  role: string;
  phone?: string;
  active_tickets_count: number;
}

export interface ITTicketReporter {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  department: string;
  email?: string;
  phone?: string;
  location: string;
}

export interface ITTicketActivity {
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

export interface ITTicket {
  id: string;
  ticket_number: string;
  title: string;
  category: ITTicketCategory;
  priority: ITTicketPriority;
  status: ITTicketStatus;
  location: string;
  description: string;
  photos: string[];

  reporter: ITTicketReporter;
  assigned_technician?: ITTechnician | null;
  assigned_team?: string;

  target_completion_date?: string;
  resolution_notes?: string;
  resolution_photos?: string[];

  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;

  activities: ITTicketActivity[];
}

export interface ITTicketFilter {
  search?: string;
  category?: ITTicketCategory | "all";
  status?: ITTicketStatus | "all";
  priority?: ITTicketPriority | "all";
  assigned_to_me?: boolean;
}

export interface ITTicketStatistics {
  total: number;
  open: number;
  assigned: number;
  in_progress: number;
  pending_parts: number;
  resolved: number;
  closed: number;
  urgent: number;
}
