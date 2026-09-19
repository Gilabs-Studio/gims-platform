import type {
  HRTicket,
  HRTechnician,
  HRTicketReporter,
  HRTicketStatistics,
  HRTicketFilter,
} from "../types/hr-ticket.types";
import type {
  CreateHRTicketFormValues,
  AssignHRTechnicianFormValues,
  UpdateHRTicketStatusFormValues,
} from "../schemas/hr-ticket.schema";

export const MOCK_HR_TECHNICIANS: HRTechnician[] = [
  {
    id: "tech-hr-1",
    name: "Agus Raharjo",
    code: "TECH-002",
    department: "Facility & Building Maintenance",
    role: "HVAC & Electrical Technician",
    phone: "+62 813-9876-5432",
    active_tickets_count: 2,
  },
  {
    id: "tech-hr-2",
    name: "Dedi Prasetyo",
    code: "TECH-004",
    department: "General Affairs & Asset",
    role: "Plumbing & General Maintenance Specialist",
    phone: "+62 815-6677-8899",
    active_tickets_count: 1,
  },
  {
    id: "tech-hr-3",
    name: "Siti Rahmawati",
    code: "HRD-002",
    department: "SDM & Compensation",
    role: "HR Payroll Specialist",
    phone: "+62 811-3344-5566",
    active_tickets_count: 0,
  },
];

export const CURRENT_HR_REPORTER: HRTicketReporter = {
  id: "user-101",
  name: "Kevin Pratama",
  code: "EMP-2024-089",
  department: "Finance & Operations",
  email: "kevin.pratama@gilabs.id",
  phone: "+62 812-9988-7766",
  location: "Lantai 3 - Ruang Finance 302",
};

export const INITIAL_HR_TICKETS: HRTicket[] = [
  {
    id: "HR-2026-001",
    ticket_number: "HR-2026-001",
    title: "AC Ruangan Finance Lantai 3 Bocor dan Tidak Dingin",
    asset_name: "AC Split Daikin 2PK (L3-FIN-01)",
    asset_code: "AST-2024-089",
    asset_photo: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    category: "hr_facility_building",
    priority: "high",
    status: "in_progress",
    location: "Lantai 3 - Ruang Finance 302",
    description: "AC unit indoor meneteskan air ke meja kerja dan suhu ruangan mencapai 28 Celcius. Perlu perbaikan evaporator secepatnya.",
    photos: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: CURRENT_HR_REPORTER,
    assigned_technician: MOCK_HR_TECHNICIANS[0],
    assigned_team: "Tim SDM & Facilities",
    target_completion_date: "2026-08-23",
    created_at: "2026-08-20T08:30:00Z",
    updated_at: "2026-08-20T10:15:00Z",
    activities: [
      {
        id: "act-1",
        ticket_id: "HR-2026-001",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Melaporkan Kendala Aset",
        notes: "Kendala dilaporkan lewat aplikasi HP dengan foto bukti bocoran air.",
        created_at: "2026-08-20T08:30:00Z",
      },
      {
        id: "act-2",
        ticket_id: "HR-2026-001",
        actor_name: "Admin Facility",
        actor_role: "admin",
        action: "Penugasan Teknisi",
        notes: "Ditugaskan ke Agus Raharjo (HVAC Technician).",
        created_at: "2026-08-20T09:00:00Z",
      },
    ],
  },
  {
    id: "HR-2026-002",
    ticket_number: "HR-2026-002",
    title: "Kerusakan Pintu Kaca Hidrolik Ruang Rapat Utomo",
    asset_name: "Pintu Kaca Tempered Glass (GA-L1-04)",
    asset_code: "AST-2023-012",
    asset_photo: "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80",
    category: "hr_asset_repair",
    priority: "medium",
    status: "assigned",
    location: "Lantai 1 - Ruang Rapat Utomo",
    description: "Engsel door closer pintu kaca longgar dan mengeluarkan bunyi berderit tajam.",
    photos: [
      "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: CURRENT_HR_REPORTER,
    assigned_technician: MOCK_HR_TECHNICIANS[1],
    assigned_team: "Tim General Affairs",
    target_completion_date: "2026-08-24",
    created_at: "2026-08-21T10:00:00Z",
    updated_at: "2026-08-21T11:30:00Z",
    activities: [
      {
        id: "act-201",
        ticket_id: "HR-2026-002",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Melaporkan Kerusakan Aset",
        created_at: "2026-08-21T10:00:00Z",
      },
    ],
  },
  {
    id: "HR-2026-003",
    ticket_number: "HR-2026-003",
    title: "Penggantian Meja Ergonomis & Kursi Manajerial Rusak",
    asset_name: "Set Kursi Ergonomis Office (GA-CH-88)",
    asset_code: "AST-2025-110",
    asset_photo: "https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80",
    category: "hr_asset_replacement",
    priority: "high",
    status: "open",
    location: "Lantai 2 - Workspace Marketing",
    description: "Hidrolik pengatur ketinggian kursi rusak dan sandaran punggung patah.",
    photos: [
      "https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: {
      id: "user-104",
      name: "Dian Permana",
      code: "EMP-2024-003",
      department: "Marketing",
      email: "dian@google.id",
      location: "Lantai 2 - Workspace Marketing",
    },
    assigned_technician: null,
    assigned_team: "Tim Inventaris SDM",
    created_at: "2026-08-22T09:00:00Z",
    updated_at: "2026-08-22T09:00:00Z",
    activities: [
      {
        id: "act-301",
        ticket_id: "HR-2026-003",
        actor_name: "Dian Permana",
        actor_role: "staff",
        action: "Pengajuan Replacement Aset",
        created_at: "2026-08-22T09:00:00Z",
      },
    ],
  },
  {
    id: "HR-2026-004",
    ticket_number: "HR-2026-004",
    title: "Pengajuan Klarifikasi Rincian Slip Gaji & Overtime Lembur",
    asset_name: "Dokumen Layanan SDM (Payroll Slip)",
    asset_code: "HRD-DOC-099",
    asset_photo: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    category: "hr_payroll_admin",
    priority: "low",
    status: "resolved",
    location: "Lantai 3 - Ruang Finance 302",
    description: "Mohon konfirmasi perbedaan hitungan jam lembur pada slip gaji periode Agustus.",
    photos: [
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: CURRENT_HR_REPORTER,
    assigned_technician: MOCK_HR_TECHNICIANS[2],
    assigned_team: "Tim SDM & Payroll",
    target_completion_date: "2026-08-19",
    resolution_notes: "Hitungan lembur telah dikoreksi bersama tim Payroll dan penyesuaian akan ditransfer.",
    resolution_photos: [],
    created_at: "2026-08-18T14:00:00Z",
    updated_at: "2026-08-19T16:00:00Z",
    resolved_at: "2026-08-19T16:00:00Z",
    activities: [
      {
        id: "act-401",
        ticket_id: "HR-2026-004",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Melaporkan Kendala Payroll",
        created_at: "2026-08-18T14:00:00Z",
      },
      {
        id: "act-402",
        ticket_id: "HR-2026-004",
        actor_name: "Siti Rahmawati",
        actor_role: "technician",
        action: "Selesai Diverifikasi",
        notes: "Klarifikasi dan penyesuaian gaji sudah disetujui.",
        created_at: "2026-08-19T16:00:00Z",
      },
    ],
  },
];

class HRTicketService {
  private tickets: HRTicket[] = [...INITIAL_HR_TICKETS];
  private technicians: HRTechnician[] = [...MOCK_HR_TECHNICIANS];

  getTickets(filter: HRTicketFilter = {}): HRTicket[] {
    let result = [...this.tickets];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.asset_name && t.asset_name.toLowerCase().includes(q)) ||
          t.location.toLowerCase().includes(q) ||
          t.reporter.name.toLowerCase().includes(q)
      );
    }

    if (filter.category && filter.category !== "all") {
      result = result.filter((t) => t.category === filter.category);
    }

    if (filter.status && filter.status !== "all") {
      result = result.filter((t) => t.status === filter.status);
    }

    if (filter.priority && filter.priority !== "all") {
      result = result.filter((t) => t.priority === filter.priority);
    }

    if (filter.assigned_to_me) {
      result = result.filter((t) => t.reporter.id === CURRENT_HR_REPORTER.id);
    }

    return result;
  }

  getTechnicians(): HRTechnician[] {
    return [...this.technicians];
  }

  getStatistics(): HRTicketStatistics {
    return {
      total: this.tickets.length,
      open: this.tickets.filter((t) => t.status === "open").length,
      in_progress: this.tickets.filter(
        (t) => t.status === "in_progress" || t.status === "assigned"
      ).length,
      resolved: this.tickets.filter(
        (t) => t.status === "resolved" || t.status === "closed"
      ).length,
      high_priority: this.tickets.filter(
        (t) => t.priority === "high" || t.priority === "urgent"
      ).length,
    };
  }

  createTicket(data: CreateHRTicketFormValues): HRTicket {
    const seq = (this.tickets.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();
    const newNumber = `HR-${year}-${seq}`;

    const mainPhoto = data.photos?.[0] || "https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=800&q=80";

    const newTicket: HRTicket = {
      id: newNumber,
      ticket_number: newNumber,
      title: data.title,
      asset_name: data.asset_name || data.title,
      asset_code: data.asset_code || `AST-${year}-${seq}`,
      asset_photo: mainPhoto,
      category: data.category,
      priority: data.priority,
      status: "open",
      location: data.location,
      description: data.description,
      photos: data.photos || [mainPhoto],
      reporter: CURRENT_HR_REPORTER,
      assigned_technician: null,
      assigned_team: "Tim SDM & General Affairs",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          ticket_id: newNumber,
          actor_name: CURRENT_HR_REPORTER.name,
          actor_role: "staff",
          action: "Melaporkan Kendala Aset SDM",
          notes: data.description,
          photo_url: mainPhoto,
          created_at: new Date().toISOString(),
        },
      ],
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  assignTechnician(
    ticketId: string,
    data: AssignHRTechnicianFormValues
  ): HRTicket | null {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    const tech = this.technicians.find((t) => t.id === data.technician_id);
    if (!tech) return null;

    ticket.assigned_technician = tech;
    ticket.target_completion_date = data.target_completion_date;
    ticket.status = "assigned";
    ticket.updated_at = new Date().toISOString();

    ticket.activities.push({
      id: `act-${Date.now()}`,
      ticket_id: ticket.id,
      actor_name: "Admin SDM & GA",
      actor_role: "admin",
      action: "Penugasan Petugas Aset",
      notes: `Penugasan tiket aset ke ${tech.name} (${tech.role}). ${data.notes || ""}`,
      created_at: new Date().toISOString(),
    });

    tech.active_tickets_count += 1;
    return ticket;
  }

  updateTicketStatus(
    ticketId: string,
    data: UpdateHRTicketStatusFormValues
  ): HRTicket | null {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    ticket.status = data.status;
    ticket.updated_at = new Date().toISOString();

    if (data.status === "resolved") {
      ticket.resolved_at = new Date().toISOString();
      if (data.notes) ticket.resolution_notes = data.notes;
      if (data.resolution_photos) ticket.resolution_photos = data.resolution_photos;
    } else if (data.status === "closed") {
      ticket.closed_at = new Date().toISOString();
    }

    ticket.activities.push({
      id: `act-${Date.now()}`,
      ticket_id: ticket.id,
      actor_name: ticket.assigned_technician?.name || CURRENT_HR_REPORTER.name,
      actor_role: ticket.assigned_technician ? "technician" : "staff",
      action: `Update Status Aset: ${data.status.replace("_", " ").toUpperCase()}`,
      notes: data.notes,
      photo_url: data.resolution_photos?.[0],
      created_at: new Date().toISOString(),
    });

    return ticket;
  }

  deleteTicket(ticketId: string): boolean {
    const index = this.tickets.findIndex((t) => t.id === ticketId);
    if (index !== -1) {
      this.tickets.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const hrTicketService = new HRTicketService();
