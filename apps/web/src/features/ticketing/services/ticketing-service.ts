import type {
  Ticket,
  Technician,
  TicketReporter,
  TicketStatistics,
  TicketFilter,
} from "../types/ticketing.types";
import type {
  CreateTicketFormValues,
  AssignTechnicianFormValues,
  UpdateTicketStatusFormValues,
} from "../schemas/ticketing.schema";

export const MOCK_TECHNICIANS: Technician[] = [
  {
    id: "tech-1",
    name: "Budi Santoso",
    code: "TECH-001",
    department: "IT Infrastructure",
    role: "Senior IT Support",
    phone: "+62 812-3456-7890",
    active_tickets_count: 3,
  },
  {
    id: "tech-2",
    name: "Agus Raharjo",
    code: "TECH-002",
    department: "Facility & Maintenance",
    role: "HVAC & Electrical Technician",
    phone: "+62 813-9876-5432",
    active_tickets_count: 2,
  },
  {
    id: "tech-3",
    name: "Rina Wijaya",
    code: "TECH-003",
    department: "IT Software",
    role: "Application Support Specialist",
    phone: "+62 811-2233-4455",
    active_tickets_count: 1,
  },
  {
    id: "tech-4",
    name: "Dedi Prasetyo",
    code: "TECH-004",
    department: "Facility & Building",
    role: "Plumbing & General Maintenance",
    phone: "+62 815-6677-8899",
    active_tickets_count: 0,
  },
];

export const CURRENT_USER_REPORTER: TicketReporter = {
  id: "user-101",
  name: "Kevin Pratama",
  code: "EMP-2024-089",
  department: "Finance & Operations",
  email: "kevin.pratama@gilabs.id",
  phone: "+62 812-9988-7766",
  location: "Lantai 3 - Ruang Finance 302",
};

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: "TCK-2026-001",
    ticket_number: "TCK-2026-001",
    title: "AC Ruangan Finance Lantai 3 Bocor dan Tidak Dingin",
    category: "facility_ac",
    priority: "high",
    status: "in_progress",
    location: "Lantai 3 - Ruang Finance 302",
    description: "AC unit indoor meneteskan air ke meja kerja dan suhu ruangan mencapai 28 Celcius. Perlu perbaikan evaporator secepatnya.",
    photos: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: CURRENT_USER_REPORTER,
    assigned_technician: MOCK_TECHNICIANS[1], // Agus
    assigned_team: "Tim Facility & Maintenance",
    target_completion_date: "2026-08-21",
    created_at: "2026-08-20T08:30:00Z",
    updated_at: "2026-08-20T10:15:00Z",
    activities: [
      {
        id: "act-1",
        ticket_id: "TCK-2026-001",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Melaporkan Kendala",
        notes: "Kendala dilaporkan lewat aplikasi HP dengan foto bukti bocoran air.",
        created_at: "2026-08-20T08:30:00Z",
      },
      {
        id: "act-2",
        ticket_id: "TCK-2026-001",
        actor_name: "Admin Facility",
        actor_role: "admin",
        action: "Penugasan Teknisi",
        notes: "Ditugaskan ke Agus Raharjo (HVAC Technician). Target penyelesaian 21 Agustus.",
        created_at: "2026-08-20T09:00:00Z",
      },
      {
        id: "act-3",
        ticket_id: "TCK-2026-001",
        actor_name: "Agus Raharjo",
        actor_role: "technician",
        action: "Proses Perbaikan",
        notes: "Sedang dilakukan pembersihan selang pembuangan dan penyedotan freon AC.",
        created_at: "2026-08-20T10:15:00Z",
      },
    ],
  },
  {
    id: "TCK-2026-002",
    ticket_number: "TCK-2026-002",
    title: "Laptop Karyawan Mati Total Tidak Bisa Di-charge",
    category: "it_hardware",
    priority: "urgent",
    status: "assigned",
    location: "Lantai 2 - Ruang Sales 201",
    description: "Laptop ThinkPad E14 mati mendadak saat rapat Zoom client dan tidak merespon saat dihubungkan ke adaptor daya.",
    photos: [
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: {
      id: "user-102",
      name: "Siti Rahmawati",
      code: "EMP-2024-045",
      department: "Sales & Marketing",
      email: "siti.rahma@gilabs.id",
      location: "Lantai 2 - Ruang Sales 201",
    },
    assigned_technician: MOCK_TECHNICIANS[0], // Budi
    assigned_team: "Tim IT Support",
    target_completion_date: "2026-08-20",
    created_at: "2026-08-20T09:10:00Z",
    updated_at: "2026-08-20T09:30:00Z",
    activities: [
      {
        id: "act-201",
        ticket_id: "TCK-2026-002",
        actor_name: "Siti Rahmawati",
        actor_role: "staff",
        action: "Melaporkan Kendala",
        notes: "Laptop mendadak mati total, butuh replacement cadangan atau perbaikan cepat.",
        created_at: "2026-08-20T09:10:00Z",
      },
      {
        id: "act-202",
        ticket_id: "TCK-2026-002",
        actor_name: "IT Lead",
        actor_role: "admin",
        action: "Penugasan Teknisi",
        notes: "Budi Santoso dijadwalkan cek hardware motherboard.",
        created_at: "2026-08-20T09:30:00Z",
      },
    ],
  },
  {
    id: "TCK-2026-003",
    ticket_number: "TCK-2026-003",
    title: "Gagal Login ERP GIMS Error 500 Internal Server",
    category: "it_software",
    priority: "medium",
    status: "open",
    location: "Lantai 4 - Ruang HRD 405",
    description: "Saat mengakses modul Payroll muncul notifikasi error HTTP 500 session expired.",
    photos: [],
    reporter: {
      id: "user-103",
      name: "Bambang Triyono",
      code: "EMP-2024-012",
      department: "HRD",
      email: "bambang.hrd@gilabs.id",
      location: "Lantai 4 - Ruang HRD 405",
    },
    assigned_technician: null,
    assigned_team: "Tim IT Software",
    created_at: "2026-08-20T11:00:00Z",
    updated_at: "2026-08-20T11:00:00Z",
    activities: [
      {
        id: "act-301",
        ticket_id: "TCK-2026-003",
        actor_name: "Bambang Triyono",
        actor_role: "staff",
        action: "Melaporkan Kendala",
        notes: "Kendala akses modul payroll.",
        created_at: "2026-08-20T11:00:00Z",
      },
    ],
  },
  {
    id: "TCK-2026-004",
    ticket_number: "TCK-2026-004",
    title: "Kerusakan Pintu Kaca Ruang Rapat Utomo",
    category: "general_maintenance",
    priority: "low",
    status: "resolved",
    location: "Lantai 1 - Ruang Rapat Utomo",
    description: "Engsel door closer pintu kaca longgar dan mengeluarkan bunyi berderit tajam.",
    photos: [
      "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: CURRENT_USER_REPORTER,
    assigned_technician: MOCK_TECHNICIANS[3], // Dedi
    assigned_team: "Tim Facility & Maintenance",
    target_completion_date: "2026-08-19",
    resolution_notes: "Engsel door closer telah diganti oli pelumas dan dikencangkan kembali baut penahannya.",
    resolution_photos: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    ],
    created_at: "2026-08-18T14:00:00Z",
    updated_at: "2026-08-19T16:00:00Z",
    resolved_at: "2026-08-19T16:00:00Z",
    activities: [
      {
        id: "act-401",
        ticket_id: "TCK-2026-004",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Melaporkan Kendala",
        created_at: "2026-08-18T14:00:00Z",
      },
      {
        id: "act-402",
        ticket_id: "TCK-2026-004",
        actor_name: "Dedi Prasetyo",
        actor_role: "technician",
        action: "Selesai Dikerjakan",
        notes: "Pintu sudah kembali normal dan aman digunakan.",
        created_at: "2026-08-19T16:00:00Z",
      },
    ],
  },
  {
    id: "TCK-2026-005",
    ticket_number: "TCK-2026-005",
    title: "Stopkontak Utama Ruang Server Terbakar / Konslet",
    category: "facility_electrical",
    priority: "urgent",
    status: "closed",
    location: "Lantai B1 - Data Center / Ruang Server",
    description: "Muncul percikan api pada stopkontak rack B3. Kabel segera ditransfer ke psu cadangan.",
    photos: [],
    reporter: {
      id: "user-104",
      name: "Dian Permana",
      code: "EMP-2024-003",
      department: "IT Infrastructure",
      email: "dian@gilabs.id",
      location: "Lantai B1 - Data Center",
    },
    assigned_technician: MOCK_TECHNICIANS[1],
    assigned_team: "Tim Facility & Maintenance",
    resolution_notes: "Modul stopkontak industri 32A sudah diganti tipe baru breaker ABB.",
    created_at: "2026-08-15T10:00:00Z",
    updated_at: "2026-08-16T11:00:00Z",
    resolved_at: "2026-08-16T09:00:00Z",
    closed_at: "2026-08-16T11:00:00Z",
    activities: [
      {
        id: "act-501",
        ticket_id: "TCK-2026-005",
        actor_name: "Dian Permana",
        actor_role: "staff",
        action: "Laporan Urgent",
        created_at: "2026-08-15T10:00:00Z",
      },
      {
        id: "act-502",
        ticket_id: "TCK-2026-005",
        actor_name: "Agus Raharjo",
        actor_role: "technician",
        action: "Penggantian Part",
        created_at: "2026-08-16T09:00:00Z",
      },
      {
        id: "act-503",
        ticket_id: "TCK-2026-005",
        actor_name: "Dian Permana",
        actor_role: "staff",
        action: "Verifikasi & Close Tiket",
        notes: "Sudah diuji beban stabil 24 jam. Tiket ditutup.",
        created_at: "2026-08-16T11:00:00Z",
      },
    ],
  },
];

class TicketingService {
  private tickets: Ticket[] = [...INITIAL_TICKETS];
  private technicians: Technician[] = [...MOCK_TECHNICIANS];

  getTickets(filter: TicketFilter = {}): Ticket[] {
    let result = [...this.tickets];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
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
      result = result.filter((t) => t.reporter.id === CURRENT_USER_REPORTER.id);
    }

    return result;
  }

  getTechnicians(): Technician[] {
    return [...this.technicians];
  }

  getStatistics(): TicketStatistics {
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

  createTicket(data: CreateTicketFormValues): Ticket {
    const seq = (this.tickets.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();
    const newNumber = `TCK-${year}-${seq}`;

    const isITCategory = data.category.startsWith("it_");
    const teamName = isITCategory ? "Tim IT Support" : "Tim Facility & Maintenance";

    const newTicket: Ticket = {
      id: newNumber,
      ticket_number: newNumber,
      title: data.title,
      category: data.category,
      priority: data.priority,
      status: "open",
      location: data.location,
      description: data.description,
      photos: data.photos || [],
      reporter: CURRENT_USER_REPORTER,
      assigned_technician: null,
      assigned_team: teamName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          ticket_id: newNumber,
          actor_name: CURRENT_USER_REPORTER.name,
          actor_role: "staff",
          action: "Melaporkan Kendala Baru",
          notes: data.description,
          photo_url: data.photos?.[0],
          created_at: new Date().toISOString(),
        },
      ],
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  assignTechnician(
    ticketId: string,
    data: AssignTechnicianFormValues
  ): Ticket | null {
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
      actor_name: "Admin Desk",
      actor_role: "admin",
      action: "Penugasan Teknisi",
      notes: `Penugasan tiket ke ${tech.name} (${tech.role}). ${data.notes || ""}`,
      created_at: new Date().toISOString(),
    });

    tech.active_tickets_count += 1;

    return ticket;
  }

  updateTicketStatus(
    ticketId: string,
    data: UpdateTicketStatusFormValues
  ): Ticket | null {
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
      actor_name: ticket.assigned_technician?.name || CURRENT_USER_REPORTER.name,
      actor_role: ticket.assigned_technician ? "technician" : "staff",
      action: `Update Status: ${data.status.replace("_", " ").toUpperCase()}`,
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

export const ticketingService = new TicketingService();
